import { sampleTrack, targetSpeed, trackById, vehicleById, vehicles, propSpacing, roadsideProp } from "./data";
import { BUILD_VERSION, RULES_VERSION, STEP, type CarState, type RaceEvent, type RaceInput, type RacePhase, type RaceSnapshot, type RuntimeOptions } from "./types";

const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max,n));
export class RaceSimulation {
  readonly options: RuntimeOptions;
  readonly track;
  readonly cars: CarState[];
  phase: RacePhase = "ready";
  elapsed = 0;
  countdown = 3;
  notice = "READY TO RACE";
  private resumePhase: RacePhase = "racing";
  private events: RaceEvent[] = [];
  private randomState: number;
  private nitroHeld = false;
  private lowFuelWarned = false;
  private skidCooldown = 0;
  constructor(options: RuntimeOptions) {
    this.options = {...options}; this.track = trackById(options.trackId); this.randomState = options.seed >>> 0 || 1;
    this.cars = Array.from({length:20},(_,id) => ({ id, vehicle: id===0 ? options.vehicleId : vehicles[(id-1)%4].id,
      distance: id===0 ? 0 : (20-id)*12, x: id===0 ? -0.32 : id%2 ? 0.32 : -0.32,
      speed: 0, fuel: 66, nitro: 3, boost: 0, collisionCooldown: 0, finishedAt: null, dnf: false,
      pitStops: 0, inPit: false, pitRequested: false, pitFilled: false, targetX: id%2 ? 0.32 : -0.32,
      skill: 0.88 + this.random()*0.12, checkpoint: 0, lapStart: 0, lapTimes: [] }));
  }
  private random() { this.randomState = (Math.imul(this.randomState,1664525)+1013904223)>>>0; return this.randomState/4294967296; }
  private emit(type: RaceEvent["type"]) { this.events.push({type,time:this.elapsed}); }
  drainEvents() { const result=this.events; this.events=[]; return result; }
  start() { if(this.phase!=="ready") return; this.phase="countdown"; this.emit("countdown"); }
  pause() { if(this.phase!=="racing"&&this.phase!=="countdown") return; this.resumePhase=this.phase; this.phase="paused"; this.nitroHeld=false; }
  resume() { if(this.phase==="paused") this.phase=this.resumePhase; }
  /** Recovery changes lateral position only, never race distance or checkpoints. */
  recover() { if(this.phase!=="paused") return; const p=this.cars[0]; p.x=0; p.speed=0; p.inPit=false; }
  update(input: RaceInput, dt=STEP) {
    if (!Number.isFinite(dt)||dt<=0||dt>STEP*1.01) throw new Error("Use bounded fixed simulation steps");
    if(this.phase==="countdown") { const before=Math.ceil(this.countdown); this.countdown=Math.max(0,this.countdown-dt); if(Math.ceil(this.countdown)!==before && this.countdown>0)this.emit("countdown"); if(this.countdown===0){this.phase="racing";this.notice="GO";this.emit("go");} return; }
    if(this.phase!=="racing") return;
    this.elapsed+=dt;
    this.skidCooldown=Math.max(0,this.skidCooldown-dt);
    for(const car of this.cars) {
      if(car.finishedAt!==null || car.dnf)continue;
      const spec=vehicleById(car.vehicle), road=sampleTrack(this.track,car.distance);
      const pitZone=road.s>=this.track.pit.start&&road.s<=this.track.pit.end;
      const ai=car.id!==0;
      let throttle=input.throttle||!!this.options.autoThrottle, brake=input.brake, steer=Number(input.right)-Number(input.left);
      if(ai){
        if(car.fuel<29&&!car.pitRequested){car.pitRequested=true;car.pitFilled=false;}
        const approaching=road.s>this.track.pit.start-260&&road.s<this.track.pit.end;
        let wanted=targetSpeed(this.track,car.distance,spec)*car.skill;
        if(car.pitRequested&&approaching){car.targetX=1.2; wanted=road.s<this.track.pit.start||car.x<1.04?18:0;}
        else if(!car.pitRequested&&car.x>0.95)car.targetX=0.55;
        else {
          const leader=this.cars.find(other=>other.id!==car.id&&!other.dnf&&other.finishedAt===null&&other.distance-car.distance>0&&other.distance-car.distance<45&&Math.abs(other.x-car.x)<0.27);
          if(leader){car.targetX=car.x>0?-0.5:0.5;wanted=Math.min(wanted,leader.speed+4);}
        }
        throttle=car.speed<wanted; brake=car.speed>wanted+2;
        steer=clamp((car.targetX-car.x)*5+road.curve*(car.speed/spec.maxSpeed)**2*0.95,-1,1);
      }
      car.collisionCooldown=Math.max(0,car.collisionCooldown-dt);car.boost=Math.max(0,car.boost-dt);
      if(!ai&&input.nitro&&!this.nitroHeld&&car.nitro>0&&car.fuel>0&&!car.inPit){car.nitro--;car.boost=2.8;this.emit("nitro");}
      const canEnter=pitZone&&car.x>1.02&&car.speed<24;
      if(canEnter&&!car.inPit){car.inPit=true;car.pitFilled=false;car.pitStops++;if(!ai){this.notice="PIT / BRAKE TO REFUEL";this.emit("pit");}}
      if(car.inPit){
        car.speed=Math.max(0,car.speed-65*dt);
        if(car.speed<0.8){if(!ai&&!car.pitFilled)this.emit("refuel");car.speed=0;car.fuel=Math.min(100,car.fuel+21*dt);car.pitFilled=true;}
        if((!ai&&throttle&&!brake&&car.pitFilled)||(ai&&car.fuel>=93)){car.inPit=false;car.pitRequested=false;car.targetX=0.45;car.x=0.92;if(!ai)this.notice="BACK ON TRACK";}
      } else {
        const drag=throttle&&car.fuel>0?2:9;
        car.speed+=((throttle&&car.fuel>0 ? spec.acceleration*(car.boost>0?1.65:1) : 0)-drag-(brake?49:0))*dt;
        const max=spec.maxSpeed*(car.boost>0?1.24:1);car.speed=clamp(car.speed,0,max);
        const ratio=car.speed/spec.maxSpeed;
        if(car.speed>0.5){car.x+= (steer*(0.48+ratio*0.95)*spec.grip-road.curve*ratio*ratio*0.95)*dt;}
        const offroad=Math.abs(car.x)>1;
        if(!ai&&car.speed>42&&(brake||offroad)&&this.skidCooldown===0){this.emit("skid");this.skidCooldown=.65;}
        // Grass slows fast cars but still permits low-speed steering back to the road.
        if(offroad&&!canEnter)car.speed=Math.min(car.speed,Math.max(14,car.speed-36*dt));
        car.x=clamp(car.x,-1.55,1.55);
        car.fuel=Math.max(0,car.fuel-(car.speed>0.5?(0.34+ratio*0.16)*spec.fuelRate*(car.boost>0?1.25:1):0.012)*dt);
      }
      const previous=car.distance;car.distance+=car.speed*dt;
      const checkpoint=Math.floor(car.distance/(this.track.length/4));
      if(checkpoint>car.checkpoint){
        car.checkpoint=checkpoint;
        if(checkpoint%4===0){car.lapTimes.push(this.elapsed-car.lapStart);car.lapStart=this.elapsed;if(!ai){this.notice=`LAP ${Math.min(3,car.lapTimes.length+1)} / 3`;this.emit("lap");}}
      }
      if(car.distance>=this.track.length*this.track.laps){
        car.finishedAt=this.elapsed-(car.distance-this.track.length*this.track.laps)/Math.max(car.speed,0.01);car.distance=this.track.length*this.track.laps;
        if(!ai){this.phase="finished";this.notice="CHEQUERED FLAG";this.emit("finish");}
      }
      if(car.finishedAt===null&&car.fuel===0&&car.speed<0.1){car.dnf=true;if(!ai){this.phase="dnf";this.notice="OUT OF FUEL";this.emit("dnf");}}
      // Collision uses the same stable world prop and side as the renderer.
      const spacing=propSpacing(this.track),index=Math.floor(car.distance/spacing),crossed=Math.floor(previous/spacing)!==index,prop=roadsideProp(this.track,index);
      if(car.finishedAt===null&&crossed&&prop.collides&&Math.abs(car.x-prop.x)<.2&&car.collisionCooldown===0){car.speed*=0.35;car.collisionCooldown=1;if(!ai){this.notice="ROADSIDE CONTACT";this.emit("collision");}}
    }
    this.nitroHeld=input.nitro;
    const p=this.cars[0];
    if(this.phase==="racing"&&p.fuel<20&&!this.lowFuelWarned){this.lowFuelWarned=true;this.notice="FUEL LOW / PIT ON THE RIGHT";this.emit("low-fuel");}
    if(p.fuel>30)this.lowFuelWarned=false;
    for(let i=0;i<this.cars.length;i++)for(let j=i+1;j<this.cars.length;j++){
      const a=this.cars[i],b=this.cars[j];
      if(a.inPit||b.inPit||a.finishedAt!==null||b.finishedAt!==null||a.dnf||b.dnf||a.collisionCooldown>0||b.collisionCooldown>0)continue;
      if(Math.abs(a.distance-b.distance)<5.5&&Math.abs(a.x-b.x)<0.25){
        const rear=a.distance<b.distance?a:b, front=rear===a?b:a;
        rear.speed=Math.min(rear.speed*0.72,front.speed*0.9);front.speed*=0.94;
        rear.x=clamp(rear.x+(rear.x<=front.x?-0.12:0.12),-1.55,1.55);
        a.collisionCooldown=b.collisionCooldown=0.7;if(i===0){this.notice="CONTACT / KEEP YOUR LINE";this.emit("collision");}
      }
    }
  }
  snapshot(): RaceSnapshot {
    const player=this.cars[0];
    const ahead=this.cars.filter(c=>c.id!==0&&((c.finishedAt!==null&&(player.finishedAt===null||c.finishedAt<player.finishedAt))||(c.finishedAt===null&&!c.dnf&&c.distance>player.distance))).length;
    const position=1+ahead;
    return {phase:this.phase,elapsed:this.elapsed,countdown:this.countdown,player,cars:this.cars,position,lap:Math.min(3,1+Math.floor(player.distance/this.track.length)),notice:this.notice,
      result:this.phase==="finished"||this.phase==="dnf"?{schemaVersion:1,sessionId:this.options.sessionId,gameId:"retro-circuit",buildVersion:BUILD_VERSION,rulesVersion:RULES_VERSION,trackId:this.options.trackId,vehicleId:this.options.vehicleId,outcome:this.phase==="finished"?"finished":"dnf",position,fieldSize:20,elapsed:player.finishedAt??this.elapsed,laps:[...player.lapTimes],pitStops:player.pitStops,seed:this.options.seed}:null};
  }
}
