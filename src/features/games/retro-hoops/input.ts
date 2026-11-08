import type { Input } from "./simulation";
export type Control = "left"|"right"|"up"|"down"|"shoot"|"pass";
const controls:Record<string,Control>={ArrowLeft:"left",KeyA:"left",ArrowRight:"right",KeyD:"right",ArrowUp:"up",KeyW:"up",ArrowDown:"down",KeyS:"down",KeyJ:"shoot",KeyK:"pass"};
/** Physical keys and pointers stay held across action gates. Each device has its own identity. */
export class HoopsInput {
  private held=new Map<string,Control>();private edges=new Set<Control>();
  down(id:string,control:Control){if(!this.held.has(id)){this.held.set(id,control);this.edges.add(control);}}
  up(id:string){this.held.delete(id);}
  clear(){this.held.clear();this.edges.clear();}
  key(code:string,down:boolean){const c=controls[code];if(!c)return false;if(down)this.down(code,c);else this.up(code);return true;}
  read():Input{const active=new Set(this.held.values()),value={x:Number(active.has("right"))-Number(active.has("left")),y:Number(active.has("down"))-Number(active.has("up")),shoot:this.edges.has("shoot"),pass:this.edges.has("pass")};this.edges.clear();return value;}
}
