import * as THREE from "three";
import { COURT, type Match } from "./simulation";
import { poseFor, type Pictures } from "./presentation";

/** Three owns presentation only. No outcome or possession changes occur here. */
export function createRenderer(canvas:HTMLCanvasElement,pictures:Pictures) {
  const renderer=new THREE.WebGLRenderer({canvas,alpha:false,antialias:false,powerPreference:"low-power"});
  renderer.setPixelRatio(1);renderer.setSize(480,360,false);renderer.setClearColor(0x111c30);
  renderer.outputColorSpace=THREE.SRGBColorSpace;
  const scene=new THREE.Scene(),camera=new THREE.OrthographicCamera(0,480,360,0,-1000,1000);
  camera.position.z=500;
  const textures:Record<string,THREE.Texture>={},materials:Record<string,THREE.SpriteMaterial>={};
  for(const [key,img] of Object.entries(pictures)) {
    const tex=new THREE.Texture(img);tex.needsUpdate=true;tex.magFilter=THREE.NearestFilter;tex.minFilter=THREE.NearestFilter;tex.colorSpace=THREE.SRGBColorSpace;textures[key]=tex;
    materials[key]=new THREE.SpriteMaterial({map:tex,transparent:true,depthTest:false,depthWrite:false});
  }
  const sprite=(key:string,w:number,h:number)=>{const sp=new THREE.Sprite(materials[key]);sp.scale.set(w,h,1);scene.add(sp);return sp;};
  const floor=sprite("court",900,360);floor.position.set(450,180,0);floor.renderOrder=-100;
  const actors=Array.from({length:6},()=>sprite("navy-s-ready-source",144,128));
  const ball=sprite("ball",11,11),left=sprite("left",47,75),right=sprite("right",92,75);
  left.position.set(85-31+47/2,360-(COURT.rimY-COURT.rimZ-48+75/2),0);right.position.set(815-13+46,360-(COURT.rimY-COURT.rimZ-48+37.5),0);
  left.renderOrder=right.renderOrder=1000;
  const ringCanvas=document.createElement("canvas");ringCanvas.width=48;ringCanvas.height=16;
  const ctx=ringCanvas.getContext("2d")!;ctx.strokeStyle="#5cdfff";ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(24,8,20,6,0,0,Math.PI*2);ctx.stroke();
  const ringTexture=new THREE.CanvasTexture(ringCanvas),ringMaterial=new THREE.SpriteMaterial({map:ringTexture,depthTest:false,transparent:true});
  const ring=new THREE.Sprite(ringMaterial);ring.scale.set(48,16,1);scene.add(ring);
  let disposed=false;
  return {
    draw(s:Match){if(disposed)return;camera.left=Math.round(s.camera);camera.right=camera.left+480;camera.updateProjectionMatrix();
      for(const a of s.actors){const sp=actors[a.id];sp.material=materials[poseFor(s,a)];sp.position.set(Math.round(a.x),360-Math.round(a.y-a.z-52),0);sp.renderOrder=a.y;}
      ball.position.set(Math.round(s.ball.x),360-Math.round(s.ball.y-s.ball.z),0);ball.renderOrder=s.ball.y+.1;
      const a=s.actors[s.selected];ring.position.set(a.x,360-(a.y+1),0);ring.renderOrder=a.y-.1;
      renderer.render(scene,camera);
    },
    info:()=>({drawCalls:renderer.info.render.calls,textures:renderer.info.memory.textures}),
    dispose(){if(disposed)return;disposed=true;for(const tex of Object.values(textures))tex.dispose();for(const m of Object.values(materials))m.dispose();ringTexture.dispose();ringMaterial.dispose();scene.clear();renderer.dispose();renderer.forceContextLoss();}
  };
}
