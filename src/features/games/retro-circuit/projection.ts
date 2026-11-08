import { modulo, sampleTrack } from "./data";
import type { RaceSnapshot, TrackDefinition } from "./types";
export type RoadPoint={x:number;y:number;half:number;scale:number;distance:number;curve:number;pit:boolean;stripe:boolean};
export const CAMERA_TRAIL=22;
export const cameraDistance=(world:number,player:number)=>world-player+CAMERA_TRAIL;
/** Original visual elevation, periodic at the lap seam; simulation stays on track distance. */
export function roadElevation(track:TrackDefinition,distance:number){const angle=modulo(distance,track.length)/track.length*Math.PI*2;return track.id==='coast'?22*Math.sin(angle*2)+10*Math.sin(angle*3):track.id==='desert'?45*Math.sin(angle)+18*Math.sin(angle*3):8*Math.sin(angle*4);}
export function roadProjection(state: RaceSnapshot,track: TrackDefinition): RoadPoint[]{
  const result:RoadPoint[]=[];let offset=0,heading=0;
  for(let i=0;i<=80;i++){
    const distance=i*24,world=state.player.distance-CAMERA_TRAIL+distance,road=sampleTrack(track,world),scale=125/(125+distance);
    heading+=road.curve*0.012;offset+=heading;
    const elevation=(roadElevation(track,world)-roadElevation(track,state.player.distance))*2.1;
    result.push({x:240+(offset-state.player.x)*290*scale,y:70+(200-elevation)*scale,half:290*scale,scale,distance,curve:road.curve,pit:road.s>=track.pit.start&&road.s<=track.pit.end,stripe:Math.floor(world/45)%2===0});
  }return result;
}
export function projectedCar(distance:number,x:number,points:RoadPoint[]){
  const i=Math.floor(distance/24);if(i<0||i>=points.length-1)return null;
  const t=distance/24-i,a=points[i],b=points[i+1];
  const center=a.x+(b.x-a.x)*t,scale=a.scale+(b.scale-a.scale)*t;
  const y=a.y+(b.y-a.y)*t,occlusion=Math.min(...points.slice(0,i+1).map(p=>p.y));
  return {x:center+x*(a.half+(b.half-a.half)*t),y,scale,occlusion,visible:y<=occlusion+3};
}
/** Compact distance diagram, derived from the canonical sectors. Non-metric: the
 * positive radial envelope keeps the closed course legible without false crossings.
 * Car markers and pit position still use the same ordered track distance as racing.
 */
export function mapPoints(track:TrackDefinition){
  const count=192,raw=[];
  for(let i=0;i<=count;i++){const distance=i/count*track.length,angle=i/count*Math.PI*2-Math.PI/2,curve=[-90,-45,0,45,90].reduce((sum,d)=>sum+sampleTrack(track,distance+d).curve,0)/5,radius=1+curve*.25;raw.push({x:Math.cos(angle)*radius,y:Math.sin(angle)*radius});}
  const minX=Math.min(...raw.map(p=>p.x)),minY=Math.min(...raw.map(p=>p.y)),w=Math.max(...raw.map(p=>p.x))-minX,h=Math.max(...raw.map(p=>p.y))-minY;
  return raw.map(p=>({x:8+(p.x-minX)/w*84,y:8+(p.y-minY)/h*52}));
}
export const localDistance=(world:number,track:TrackDefinition)=>modulo(world,track.length);
