import * as THREE from "three";
import {detailedCarPixels} from "./detailed-art";
import { poses, type CarPose } from "./art";
import { sampleTrack, vehicles, propSpacing, roadsideProp } from "./data";
import { projectedCar, roadProjection, CAMERA_TRAIL, cameraDistance, mapPoints } from "./projection";
import {paintPanorama,paintRoadside,drawRaceHud} from "./presentation";
import type { CarState, RaceSnapshot, TrackDefinition } from "./types";

/** One production renderer for live play and deterministic review captures. */
export class CircuitRenderer {
  readonly renderer:THREE.WebGLRenderer;
  private scene=new THREE.Scene();
  private camera=new THREE.OrthographicCamera(0,480,0,270,-100,100);
  private road:THREE.Mesh<THREE.BufferGeometry,THREE.MeshBasicMaterial>;
  private positions=new Float32Array(80*12*6*3);
  private colors=new Float32Array(80*12*6*3);
  private textures:THREE.Texture[]=[];
  private materials=new Map<string,THREE.MeshBasicMaterial>();
  private cars:THREE.Mesh<THREE.PlaneGeometry,THREE.MeshBasicMaterial>[]=[];
  private scenery:THREE.Mesh<THREE.PlaneGeometry,THREE.MeshBasicMaterial>[]=[];
  private sceneryMaterials:THREE.MeshBasicMaterial[]=[];
  private propMaterials:THREE.MeshBasicMaterial[]=[];
  private geometry=new THREE.PlaneGeometry(1,1);
  private disposed=false;
  private onLost:(event:Event)=>void;
  private scratchColor=new THREE.Color();
  private billboardMaterials:THREE.MeshBasicMaterial[]=[];
  private panorama:THREE.Mesh<THREE.PlaneGeometry,THREE.MeshBasicMaterial>;
  private hudCanvas=document.createElement('canvas');
  private hudTexture:THREE.CanvasTexture;
  private map;
  constructor(canvas:HTMLCanvasElement,readonly track:TrackDefinition,onError:(message:string)=>void){
    this.renderer=new THREE.WebGLRenderer({canvas,antialias:false,alpha:false,powerPreference:"low-power",preserveDrawingBuffer:true});
    this.renderer.setPixelRatio(1);this.renderer.setSize(480,270,false);this.renderer.outputColorSpace=THREE.SRGBColorSpace;
    this.renderer.localClippingEnabled=true;
    this.scene.background=new THREE.Color(track.sky);
    const geom=new THREE.BufferGeometry();geom.setAttribute("position",new THREE.BufferAttribute(this.positions,3).setUsage(THREE.DynamicDrawUsage));geom.setAttribute("color",new THREE.BufferAttribute(this.colors,3).setUsage(THREE.DynamicDrawUsage));
    this.road=new THREE.Mesh(geom,new THREE.MeshBasicMaterial({vertexColors:true,depthTest:false,side:THREE.DoubleSide}));this.road.frustumCulled=false;this.road.renderOrder=2;this.scene.add(this.road);
    const panoramaCanvas=document.createElement('canvas');panoramaCanvas.width=1024;panoramaCanvas.height=92;paintPanorama(panoramaCanvas.getContext('2d')!,track);
    const panoramaTexture=new THREE.CanvasTexture(panoramaCanvas);panoramaTexture.magFilter=panoramaTexture.minFilter=THREE.NearestFilter;panoramaTexture.colorSpace=THREE.SRGBColorSpace;panoramaTexture.wrapS=THREE.RepeatWrapping;this.textures.push(panoramaTexture);
    const panoramaMaterial=new THREE.MeshBasicMaterial({map:panoramaTexture,depthTest:false,side:THREE.DoubleSide});this.sceneryMaterials.push(panoramaMaterial);this.panorama=new THREE.Mesh(this.geometry,panoramaMaterial);this.panorama.position.set(240,46,0);this.panorama.scale.set(1024,-92,1);this.panorama.renderOrder=1;this.scene.add(this.panorama);
    this.rect(0,85,480,185,track.ground,1);
    this.hudCanvas.width=480;this.hudCanvas.height=270;this.hudTexture=new THREE.CanvasTexture(this.hudCanvas);this.hudTexture.magFilter=this.hudTexture.minFilter=THREE.NearestFilter;this.hudTexture.colorSpace=THREE.SRGBColorSpace;this.textures.push(this.hudTexture);
    const hudMaterial=new THREE.MeshBasicMaterial({map:this.hudTexture,transparent:true,depthTest:false,side:THREE.DoubleSide});this.sceneryMaterials.push(hudMaterial);const hud=new THREE.Mesh(this.geometry,hudMaterial);hud.position.set(240,135,0);hud.scale.set(480,-270,1);hud.renderOrder=10000;this.scene.add(hud);this.map=mapPoints(track);
    for(const vehicle of vehicles)for(const pose of poses)for(let edition=0;edition<3;edition++){
      const image=document.createElement("canvas");image.width=128;image.height=80;const ctx=image.getContext("2d")!;
      for(const r of detailedCarPixels(vehicle.id,pose,edition)){ctx.fillStyle=r.color;ctx.fillRect(r.x,r.y,r.width,r.height);}
      const texture=new THREE.CanvasTexture(image);texture.magFilter=texture.minFilter=THREE.NearestFilter;texture.colorSpace=THREE.SRGBColorSpace;this.textures.push(texture);
      this.materials.set(`${vehicle.id}/${pose}/${edition}`,new THREE.MeshBasicMaterial({map:texture,transparent:true,depthTest:false,side:THREE.DoubleSide}));
    }
    for(let i=0;i<20;i++){const material=this.materials.get('vector/straight/0')!.clone();material.clippingPlanes=[new THREE.Plane(new THREE.Vector3(0,-1,0),270)];this.billboardMaterials.push(material);const mesh=new THREE.Mesh(this.geometry,material);mesh.frustumCulled=false;this.cars.push(mesh);this.scene.add(mesh);}
    for(let kind=0;kind<6;kind++)this.propMaterials.push(this.makeScenery(kind));
    for(let i=0;i<32;i++){const material=this.propMaterials[0].clone();material.clippingPlanes=[new THREE.Plane(new THREE.Vector3(0,-1,0),270)];this.billboardMaterials.push(material);const mesh=new THREE.Mesh(this.geometry,material);mesh.frustumCulled=false;this.scenery.push(mesh);this.scene.add(mesh);}
    this.onLost=event=>{event.preventDefault();onError("Graphics interrupted. Return to the garage and retry.");};canvas.addEventListener("webglcontextlost",this.onLost);
  }
  private rect(x:number,y:number,w:number,h:number,color:string,order=0){const material=new THREE.MeshBasicMaterial({color,depthTest:false,side:THREE.DoubleSide});this.sceneryMaterials.push(material);const mesh=new THREE.Mesh(this.geometry,material);mesh.position.set(x+w/2,y+h/2,0);mesh.scale.set(w,h,1);mesh.renderOrder=order;this.scene.add(mesh);}
  private makeScenery(kind:number){
    const c=document.createElement("canvas");c.width=48;c.height=64;paintRoadside(c.getContext('2d')!,kind);
    const texture=new THREE.CanvasTexture(c);texture.magFilter=texture.minFilter=THREE.NearestFilter;texture.colorSpace=THREE.SRGBColorSpace;this.textures.push(texture);return new THREE.MeshBasicMaterial({map:texture,transparent:true,depthTest:false,side:THREE.DoubleSide});
  }
  render(state:RaceSnapshot,previous?:readonly CarState[],alpha=1,inputSteer=0,braking=false){
    if(this.disposed)return;
    const lerp=(a:number,b:number)=>a+(b-a)*alpha;
    const player=previous?{...state.player,distance:lerp(previous[0].distance,state.player.distance),x:lerp(previous[0].x,state.player.x)}:state.player;
    const view={...state,player},points=roadProjection(view,this.track);let vertex=0;
    const quad=(a:{x:number;y:number;half:number},b:{x:number;y:number;half:number},left:number,right:number,color:string)=>{
      const c=this.scratchColor.set(color),xy=[a.x+a.half*left,a.y,a.x+a.half*right,a.y,b.x+b.half*right,b.y,a.x+a.half*left,a.y,b.x+b.half*right,b.y,b.x+b.half*left,b.y];
      for(let i=0;i<6;i++){const k=vertex++*3;this.positions[k]=xy[i*2];this.positions[k+1]=xy[i*2+1];this.positions[k+2]=0;this.colors[k]=c.r;this.colors[k+1]=c.g;this.colors[k+2]=c.b;}
    };
    for(let i=points.length-2;i>=0;i--){const a=points[i],b=points[i+1];
      const ground=a.stripe?this.track.ground:this.track.verge;
      quad(a,b,-6,6,ground);quad(a,b,-1.045,1.045,a.stripe?"#f2ede3":"#b43947");quad(a,b,-1,1,a.stripe?"#354a4e":"#3c5054");
      for(const lane of [-.333,.333])quad(a,b,lane-.025,lane+.025,a.stripe?"#e6e8df":"#3c5054");
      quad(a,b,1,1.5,a.pit?"#586f72":this.track.ground);quad(a,b,1.015,1.035,a.pit?"#d9c488":this.track.ground);
      // Narrow shoulder paint, a worn centre strip and stable roadside tufts.
      // These use road-distance segments, so detail advances with the road.
      quad(a,b,-.985,-.974,'#9eaaa0');quad(a,b,.974,.985,'#9eaaa0');
      quad(a,b,-.10,.10,a.stripe?'#384b50':'#405256');
      if(i<24){const patch=(Math.floor((player.distance-CAMERA_TRAIL+a.distance)/24)*17)%7/13;
        quad(a,b,-1.55-patch,-1.53-patch,this.track.id==='coast'?'#4e9b51':this.track.id==='desert'?'#e3b58a':'#697080');
        quad(a,b,1.7+patch,1.73+patch,this.track.id==='coast'?'#1e6e3c':this.track.id==='desert'?'#a87c60':'#30364d');}
    }
    this.road.geometry.setDrawRange(0,vertex);this.road.geometry.attributes.position.needsUpdate=true;this.road.geometry.attributes.color.needsUpdate=true;
    for(const car of state.cars){
      const mesh=this.cars[car.id],prior=previous?.[car.id],distance=car.id===0?CAMERA_TRAIL:cameraDistance(lerp(prior?.distance??car.distance,car.distance),player.distance);
      const x=car.id===0?player.x:lerp(prior?.x??car.x,car.x),p=projectedCar(distance,x,points);mesh.visible=!!p&&p.y-78*p.scale<p.occlusion&&distance>=0&&!car.dnf;
      if(!p)continue;
      let pose:CarPose=car.collisionCooldown>0?"contact":car.boost>0?"boost":(car.id===0&&braking)||(car.id!==0&&!!prior&&car.speed<prior.speed-.08)?"brake":car.id===0&&inputSteer<0?"left":car.id===0&&inputSteer>0?"right":"straight";
      if(car.id!==0&&Math.abs(sampleTrack(this.track,car.distance).curve)>.25)pose=sampleTrack(this.track,car.distance).curve>0?"right":"left";
      mesh.material.map=this.materials.get(`${car.vehicle}/${pose}/${car.id===0?0:car.id%3}`)!.map;mesh.material.clippingPlanes![0].constant=p.occlusion;
      const scale=p.scale*2.25;
      const contact=car.collisionCooldown>0?(Math.floor(state.elapsed*25)%2?2:-2):0;
      mesh.scale.set(64*scale,-40*scale,1);mesh.position.set(Math.round(p.x)+contact,Math.round(p.y-16*scale),1);mesh.renderOrder=3000-Math.floor(distance);
    }
    for(let i=0;i<this.scenery.length;i++){
      const spacing=propSpacing(this.track),index=Math.floor((player.distance-CAMERA_TRAIL)/spacing)+i+1,d=cameraDistance(index*spacing,player.distance),prop=roadsideProp(this.track,index);
      const p=projectedCar(d,prop.x,points),mesh=this.scenery[i];mesh.visible=!!p&&p.y-104*p.scale<p.occlusion;if(!p)continue;
      mesh.material.map=this.propMaterials[prop.kind].map;mesh.material.clippingPlanes![0].constant=p.occlusion;
      mesh.position.set(p.x,p.y-52*p.scale,0);mesh.scale.set(78*p.scale,-104*p.scale,1);mesh.renderOrder=3000-Math.floor(d);
    }
    this.panorama.material.map!.offset.x=Math.sin(state.player.distance/1400)*.08+sampleTrack(this.track,state.player.distance).curve*.045;
    drawRaceHud(this.hudCanvas.getContext('2d')!,state,this.track,this.map);this.hudTexture.needsUpdate=true;
    this.renderer.render(this.scene,this.camera);
  }
  diagnostics(){return {calls:this.renderer.info.render.calls,triangles:this.renderer.info.render.triangles,textures:this.renderer.info.memory.textures,geometries:this.renderer.info.memory.geometries,disposed:this.disposed};}
  dispose(){if(this.disposed)return;this.disposed=true;this.renderer.domElement.removeEventListener("webglcontextlost",this.onLost);this.road.geometry.dispose();this.road.material.dispose();this.geometry.dispose();for(const t of this.textures)t.dispose();for(const m of this.materials.values())m.dispose();for(const m of [...this.sceneryMaterials,...this.propMaterials,...this.billboardMaterials])m.dispose();this.scene.clear();this.renderer.dispose();this.renderer.forceContextLoss();}
}
