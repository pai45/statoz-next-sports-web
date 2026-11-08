import type { TrackDefinition, TrackId, VehicleDefinition, VehicleId, TrackSector } from "./types";

export const vehicles: readonly VehicleDefinition[] = [
  { id: "vector", name: "VECTOR", role: "Balanced coupe", maxSpeed: 88, acceleration: 22, grip: 1, fuelRate: 1, color: "#39dbef", silhouette: "coupe" },
  { id: "comet", name: "COMET", role: "Speed / higher consumption", maxSpeed: 99, acceleration: 23, grip: 0.86, fuelRate: 1.15, color: "#f27862", silhouette: "wedge" },
  { id: "kestrel", name: "KESTREL", role: "Grip / lower top speed", maxSpeed: 82, acceleration: 24, grip: 1.22, fuelRate: 0.94, color: "#e9c76a", silhouette: "hatch" },
  { id: "nomad", name: "NOMAD", role: "Efficient / slower launch", maxSpeed: 86, acceleration: 18, grip: 1.05, fuelRate: 0.72, color: "#aa9bf4", silhouette: "tourer" },
];
export const vehicleById = (id: VehicleId) => vehicles.find(v => v.id === id)!;
function circuit(id: TrackId, name: string, description: string, lengths: number[], curves: number[], scenery: TrackSector["scenery"], colors: string[]): TrackDefinition {
  const sectors = lengths.map((length, i) => ({ length, curve: curves[i], scenery }));
  return { id, name, description, sectors, length: lengths.reduce((a,b) => a+b,0), laps: 3, pit: { start: 320, end: 720 }, sky: colors[0], ground: colors[1], verge: colors[2], horizon: colors[3] };
}
export const tracks: readonly TrackDefinition[] = [
  circuit("coast", "AZURE COAST", "Open straights. Broad bends. Watch the fuel.", [800,650,500,650,650,650,600], [0,0.5,0,-0.6,0,0.65,-0.35], "palms", ["#35bfdc","#268242","#2e9148","#467e8b"]),
  circuit("desert", "EMBER MESA", "Long sweeping curves. Commit to a clean line.", [800,800,650,700,650,600,300], [0,0.65,-0.65,0.8,0,-0.55,0], "rocks", ["#39c6ed","#c29373","#d2a381","#986d69"]),
  circuit("city", "AFTERLIGHT", "Technical bends beneath a violet evening sky.", [800,450,400,500,450,450,450,600,400], [0,0.85,0,-0.9,0.7,0,-0.8,0.55,0], "buildings", ["#36365e","#3a4056","#414960","#58517c"]),
];
export const trackById = (id: TrackId) => tracks.find(t => t.id === id)!;
export const modulo = (value: number, length: number) => ((value % length) + length) % length;
/** Smooth curvature transitions use the same world model as handling and road projection. */
export function sampleTrack(track: TrackDefinition, distance: number) {
  const s = modulo(distance, track.length);
  let start = 0;
  for (let i=0; i<track.sectors.length; i++) {
    const sector = track.sectors[i];
    if (s < start + sector.length) {
      const previous = track.sectors[(i + track.sectors.length - 1) % track.sectors.length].curve;
      const t = Math.min(1, (s - start) / 110), eased = t*t*(3-2*t);
      return { curve: previous + (sector.curve - previous)*eased, scenery: sector.scenery, s, sector: i };
    }
    start += sector.length;
  }
  return { curve: 0, scenery: track.sectors[0].scenery, s, sector: 0 };
}
export function targetSpeed(track: TrackDefinition, distance: number, vehicle: VehicleDefinition) {
  const ahead = Math.max(...[0,55,110].map(d => Math.abs(sampleTrack(track,distance+d).curve)));
  return vehicle.maxSpeed * (1 - ahead * 0.29 / vehicle.grip);
}
export const propSpacing=(track:TrackDefinition)=>track.length/Math.max(1,Math.round(track.length/125));
/** Stable world identities prevent props changing sides when the camera passes a segment. */
export function roadsideProp(track:TrackDefinition,index:number){
 const count=Math.round(track.length/propSpacing(track)),canonical=modulo(index,count),road=sampleTrack(track,canonical*propSpacing(track));
 const pit=road.s>=track.pit.start&&road.s<=track.pit.end&&canonical%2===0,corner=Math.abs(road.curve)>.3&&canonical%4===0;
 return {x:pit?1.5:corner?(road.curve>0?-1.3:1.3):canonical%2?-1.52:1.65,kind:pit?5:corner?(road.curve>0?4:3):track.id==="coast"?0:track.id==="desert"?1:2,collides:!pit};
}
