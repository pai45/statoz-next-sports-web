/** Retro Hoops rules 1.2.0. All numerical tuning is original StatOz design.
 * No rendering, wall clock, platform storage or random global state belongs here. */
export const RULES_VERSION = "1.2.0";
export const HZ = 60;
export const COURT = { left: 60, right: 840, top: 164, bottom: 330, rimY: 247, rimZ: 120 } as const;
export type Team = 0 | 1;
export type Action = "idle" | "pass" | "receive" | "shoot" | "dunk" | "block" | "steal" | "recoil" | "gather";
export type Phase = "playing" | "restart" | "result";
export type Actor = { id: number; team: Team; x: number; y: number; z: number; vz: number; face: 1 | -1; action: Action; until: number; started: number; target: number; nextAI: number; moving?:boolean };
export type Ball = { x: number; y: number; z: number; owner: number | null; kind: "held" | "pass" | "shot" | "loose"; from: number; to: number; age: number; duration: number; sx: number; sy: number; sz: number; tx: number; ty: number; tz: number; vx: number; vy: number; vz: number; points: number; made: boolean; super: boolean; released: number };
export type GameEvent = { id: number; tick: number; type: string; team?: Team; actor?: number; value?: number };
export type Input = { x: number; y: number; shoot: boolean; pass: boolean };
export const NO_INPUT: Input = { x: 0, y: 0, shoot: false, pass: false };
export type Match = { version: string; seed: number; rng: number; tick: number; remaining: number; shotClock: number; phase: Phase; restartAt: number; restartTeam: Team; selected: number; possession: Team; score: [number, number]; charge: [number, number]; actors: Actor[]; ball: Ball; events: GameEvent[]; eventId: number; shotId: number; camera: number; buzzer: boolean; auto: boolean; buffer:{kind:"shoot"|"pass";expires:number;actor:number}|null };
export const other = (t: Team): Team => t === 0 ? 1 : 0;
export const direction = (t: Team) => t === 0 ? 1 : -1;
export const rimX = (t: Team) => t === 0 ? 815 : 85;
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const distance = (a: {x:number;y:number}, b: {x:number;y:number}) => Math.hypot(a.x-b.x, a.y-b.y);
function random(s: Match) { s.rng = (Math.imul(s.rng, 1664525) + 1013904223) >>> 0; return s.rng / 4294967296; }
function emit(s: Match, type: string, actor?: number, team?: Team, value?: number) { s.events.push({ id: ++s.eventId, tick: s.tick, type, actor, team, value }); }
export function anchor(a: Actor, pose: "low" | "front" | "release" | "overhead" | "pass-gather" | "pass-release" = "front") {
  const p = pose === "low" ? [-14,36] : pose === "release" ? [27,104] : pose === "overhead" ? [5,104] : pose === "pass-gather" ? [-26,61] : pose === "pass-release" ? [-32,72] : [0,39];
  return { x: a.x + p[0] * a.face, y: a.y, z: a.z + p[1] };
}
export function createMatch(seed = 1, auto = false): Match {
  const actors = Array.from({ length: 6 }, (_, id): Actor => ({ id, team: id < 3 ? 0 : 1, x: id < 3 ? 230 + id*65 : 565+(id-3)*65, y: [245,185,310][id%3], z:0, vz:0, face:id<3?1:-1, action:"idle", until:0, started:0, target:-1, nextAI:0 }));
  const p = anchor(actors[0]);
  return { version:RULES_VERSION, seed, rng:seed>>>0, tick:0, remaining:180*HZ, shotClock:24*HZ, phase:"playing", restartAt:0, restartTeam:0, selected:0, possession:0, score:[0,0], charge:[0,0], actors, ball:{...p, owner:0,kind:"held",from:0,to:-1,age:0,duration:0,sx:0,sy:0,sz:0,tx:0,ty:0,tz:0,vx:0,vy:0,vz:0,points:2,made:false,super:false,released:0}, events:[],eventId:0,shotId:0,camera:0,buzzer:false,auto,buffer:null };
}
function act(s:Match,a:Actor,action:Action,duration:number,target=-1) { a.action=action;a.started=s.tick;a.until=s.tick+duration;a.target=target; }
function ready(s:Match,a:Actor) { return a.action==="idle" && a.until<=s.tick && a.z===0; }
function canCatchPass(s:Match,a:Actor) {return ready(s,a)||(a.id===s.ball.to&&a.action==="receive"&&a.target===s.ball.from&&a.z===0);}
function selectDefender(s:Match) {
  if(s.ball.owner!==null && s.actors[s.ball.owner].team===0) { s.selected=s.ball.owner;return; }
  s.selected=s.actors.filter(a=>a.team===0).sort((a,b)=>distance(a,s.ball)-distance(b,s.ball)||a.id-b.id)[0].id;
}
function own(s:Match,a:Actor,kind="catch") {
  const changed=s.possession!==a.team;
  const recoverUntil=a.until,incoming={x:s.ball.x,y:s.ball.y,z:s.ball.z};
  s.ball.owner=a.id;s.ball.kind="held";s.ball.to=-1;s.ball.age=0;s.ball.vz=0;s.possession=a.team;
  if(changed)s.shotClock=24*HZ;
  if(a.team===0)s.selected=a.id;else selectDefender(s);
  const p=anchor(a,a.z>0?"overhead":"front");
  Object.assign(s.ball,{sx:incoming.x,sy:incoming.y,sz:incoming.z});
  if(kind==="inbound")Object.assign(s.ball,p,{sx:p.x,sy:p.y,sz:p.z});
  act(s,a,"receive",8);a.until=Math.max(a.until,recoverUntil);emit(s,kind,a.id,a.team);
}
function finish(s:Match) { if(s.phase==="result")return;s.phase="result";s.buffer=null;emit(s,"result",undefined,undefined); }
function restart(s:Match,team:Team,reason:string) {
  if(s.buzzer){finish(s);return;}
  s.phase="restart";s.buffer=null;s.restartAt=s.tick+60;s.restartTeam=team;s.ball.owner=null;s.ball.to=-1;s.ball.kind="loose";emit(s,reason,undefined,team);
}
function resume(s:Match) {
  const t=s.restartTeam, dir=direction(t);
  for(const a of s.actors) {
    a.x=a.team===t ? (dir===1?125:775)+dir*(a.id%3)*75 : (dir===1?420:480)+dir*(a.id%3)*65;
    a.y=[247,185,310][a.id%3];a.z=0;a.vz=0;a.face=direction(a.team);a.action="idle";a.until=s.tick;a.target=-1;
  }
  s.phase="playing";s.shotClock=24*HZ;own(s,s.actors[t===0?0:3],"inbound");selectDefender(s);
}
function startPass(s:Match,a:Actor) {
  const mates=s.actors.filter(b=>b.team===a.team&&b.id!==a.id&&b.z===0&&b.action==="idle");
  if(!mates.length)return;
  const lane=(b:Actor)=>s.actors.filter(d=>d.team!==a.team).reduce((min,d)=>Math.min(min,segmentDistance(d,a,b)),999);
  mates.sort((b,c)=>(Math.min(lane(c),80)+direction(a.team)*(c.x-a.x)*.6)-(Math.min(lane(b),80)+direction(a.team)*(b.x-a.x)*.6)||b.id-c.id);
  act(s,a,"pass",18,mates[0].id);a.face=mates[0].x<a.x?1:-1;emit(s,"prepare-pass",a.id,a.team);
}
function segmentDistance(p:{x:number;y:number},a:{x:number;y:number},b:{x:number;y:number}) {
  const dx=b.x-a.x,dy=b.y-a.y,t=clamp(((p.x-a.x)*dx+(p.y-a.y)*dy)/(dx*dx+dy*dy||1),0,1);
  return Math.hypot(p.x-a.x-t*dx,p.y-a.y-t*dy);
}
function releasePass(s:Match,a:Actor) {
  if(s.ball.owner!==a.id)return;
  const b=s.actors[a.target];
  if(!b||!ready(s,b)){act(s,a,"idle",0);emit(s,"pass-cancelled",a.id,a.team);return;}
  const p=anchor(a,"pass-release"),q=anchor(b,"front");
  Object.assign(s.ball,p,{owner:null,kind:"pass",from:a.id,to:b.id,age:0,duration:Math.max(20,Math.ceil(distance(a,b)/7)),sx:p.x,sy:p.y,sz:p.z,tx:q.x,ty:q.y,tz:q.z});
  act(s,b,"receive",s.ball.duration+8,a.id);emit(s,"pass",a.id,a.team);a.until=s.tick+10;
}
function startShot(s:Match,a:Actor) {
  if(Math.hypot(rimX(a.team)-a.x,COURT.rimY-a.y)<60){act(s,a,"dunk",75);a.face=direction(a.team);emit(s,"prepare-dunk",a.id,a.team);return;}
  act(s,a,"shoot",44);emit(s,"prepare-shot",a.id,a.team);
}
function releaseShot(s:Match,a:Actor) {
  if(s.ball.owner!==a.id)return;
  const dist=Math.hypot(rimX(a.team)-a.x,(COURT.rimY-a.y)*1.5),special=s.charge[a.team]>=100;
  const contest=s.actors.filter(d=>d.team!==a.team&&distance(d,a)<85).length;
  const made=special||random(s)<clamp(.83-dist/750-contest*.13,.15,.88);
  if(special)s.charge[a.team]=0;
  a.z=16;const p=anchor(a,"release");
  Object.assign(s.ball,p,{owner:null,kind:"shot",from:a.id,to:-1,age:0,duration:54,sx:p.x,sy:p.y,sz:p.z,tx:rimX(a.team),ty:COURT.rimY,tz:COURT.rimZ,points:dist>250?3:2,made,super:special,released:s.tick});
  a.vz=200;a.until=s.tick+40;s.shotId++;emit(s,special?"super":"shoot",a.id,a.team);
}
function defensiveAction(s:Match,a:Actor,block:boolean) {
  act(s,a,block?"block":"steal",block?48:30);
  if(block){a.vz=200;a.z=.01;emit(s,"jump",a.id,a.team);}
  else {
    emit(s,"reach",a.id,a.team);
    // Resolve all reaches after movement, body contacts and held-ball anchoring.
    // Comparing here would mix this actor's new position with earlier actors'
    // positions and the previous tick's ball centre.
  }
}
function resolveSteals(s:Match) {
  const owner=s.ball.owner===null?null:s.actors[s.ball.owner];
  if(!owner||!ready(s,owner))return;
  const candidates=s.actors.filter(a=>a.action==="steal"&&a.started===s.tick&&a.team!==owner.team&&distance(a,owner)<38)
    .map(a=>({a,gap:Math.hypot(a.x+8*a.face-s.ball.x,a.y-s.ball.y,38+a.z-s.ball.z)}))
    .filter(c=>c.gap<26).sort((a,b)=>a.gap-b.gap||a.a.id-b.a.id);
  if(!candidates.length)return;
  const a=candidates[0].a;
  Object.assign(s.ball,{owner:null,kind:"loose",to:-1,vx:direction(a.team)*90,vy:0,vz:130,from:a.id});
  act(s,owner,"recoil",24);emit(s,"steal",a.id,a.team);
}
function move(a:Actor,x:number,y:number,speed=108) {
  const len=Math.hypot(x,y);if(!len)return;
  const beforeX=a.x,beforeY=a.y;
  a.x=clamp(a.x+x/Math.max(1,len)*speed/HZ,COURT.left,COURT.right);
  a.y=clamp(a.y+y/Math.max(1,len)*speed/HZ,COURT.top,COURT.bottom);if(Math.abs(x)>.1)a.face=x>0?1:-1;
  a.moving=Math.hypot(a.x-beforeX,a.y-beforeY)>1e-6;
}
function ai(s:Match,a:Actor) {
  if(!ready(s,a))return;
  const b=s.ball,dir=direction(a.team),rim=rimX(a.team);
  if(b.owner===a.id) {
    a.face=dir;
    const dist=Math.hypot(a.x-rim,(a.y-COURT.rimY)*1.5);
    if(s.tick>=a.nextAI) {
      a.nextAI=s.tick+35+Math.floor(random(s)*35);
      if(dist<310||s.shotClock<180) {startShot(s,a);return;}
      const marked=s.actors.some(d=>d.team!==a.team&&distance(d,a)<60);
      const forward=s.actors.some(b=>b.team===a.team&&b.id!==a.id&&dir*(b.x-a.x)>30&&ready(s,b));
      if(marked&&forward&&random(s)<.45){startPass(s,a);return;}
    }
    const threatened=s.actors.some(d=>d.team!==a.team&&distance(d,a)<65);
    move(a,rim-a.x,(threatened?(a.id%2===0?180:310):COURT.rimY)-a.y);return;
  }
  if(b.owner===null) {
    const target=b.kind==="shot"?{x:b.tx,y:b.ty}:b;
    if(b.kind==="pass"&&b.to===a.id)return;
    move(a,target.x-a.x+(a.id%3-1)*20,target.y-a.y+(a.id%3-1)*26);
    const defendShot=b.kind!=="shot"||s.actors[b.from].team!==a.team;
    if(defendShot&&b.z>70&&b.z<145&&distance(a,b)<36&&s.tick>=a.nextAI){defensiveAction(s,a,true);a.nextAI=s.tick+65;}
    return;
  }
  const owner=s.actors[b.owner];
  if(owner.team===a.team) {
    const x=clamp(owner.x+dir*(a.id%3===1?95:-65),130,770),y=a.id%3===1?180:310;
    move(a,x-a.x,y-a.y,95);
  } else {
    const mark=s.actors[(a.id%3)+(owner.team===0?0:3)];
    const tx=mark.x+direction(owner.team)*35,ty=mark.y;
    move(a,tx-a.x,ty-a.y,104);
    if(distance(a,owner)<35&&s.tick>=a.nextAI){defensiveAction(s,a,false);a.nextAI=s.tick+90;}
  }
}
function updateBall(s:Match,previousHands:{x:number;y:number;z:number}[]) {
  const b=s.ball;
  if(b.owner!==null) {
    const a=s.actors[b.owner],dribble=a.action==="idle"&&!!a.moving;
    const p=anchor(a,a.z>0?"overhead":dribble?"low":"front");
    if(a.action==="shoot"){
      const age=s.tick-a.started;
      p.x=a.x+(age<10?18:10)*a.face;p.z=a.z+(age<10?62:95);
    }
    if(a.action==="dunk"){
      const age=s.tick-a.started;p.x=a.x+(age<15?45:28)*a.face;p.z=a.z+(age<15?27:69);
    }
    if(a.action==="pass")Object.assign(p,anchor(a,s.tick-a.started<12?"pass-gather":"pass-release"));
    // Ball travels from hand to ground and back; opaque source dribble poses only.
    if(dribble){p.x=a.x+[-12,8,-20][Math.floor(s.tick/6)%3]*a.face;p.z=6+Math.abs(Math.cos(s.tick*Math.PI/18))*30;}
    if(a.action==="receive"&&b.age<6){b.age++;const t=b.age/6;p.x=b.sx+(p.x-b.sx)*t;p.y=b.sy+(p.y-b.sy)*t;p.z=b.sz+(p.z-b.sz)*t;}
    Object.assign(b,p);if(dribble&&s.tick%18===9)emit(s,"dribble",a.id,a.team);
    if(a.action==="dunk"&&a.z>0){
      const opponents=s.actors.filter(d=>d.team!==a.team&&d.action==="block"&&d.z>0).map(d=>({d,gap:Math.hypot(anchor(d,"overhead").x-b.x,d.y-b.y,anchor(d,"overhead").z-b.z)})).filter(v=>v.gap<10).sort((l,r)=>l.gap-r.gap||l.d.id-r.d.id);
      if(opponents.length){own(s,opponents[0].d,"block");return;}
      if(s.tick-a.started>=15&&Math.hypot(b.x-rimX(a.team),b.y-COURT.rimY,b.z-COURT.rimZ)<10){
        const special=s.charge[a.team]>=100;if(special)s.charge[a.team]=0;
        s.score[a.team]+=2;s.charge[a.team]=Math.min(100,s.charge[a.team]+25);s.shotId++;
        b.super=special;b.points=2;b.from=a.id;b.released=s.tick;b.made=true;
        emit(s,special?"super-dunk":"dunk",a.id,a.team);emit(s,"score",a.id,a.team,2);restart(s,other(a.team),"score-restart");
      }
    }
    return;
  }
  if(b.kind==="pass"||b.kind==="shot") {
    const px=b.x,py=b.y,pz=b.z; b.age++;const t=Math.min(1,b.age/b.duration);
    b.x=b.sx+(b.tx-b.sx)*t;b.y=b.sy+(b.ty-b.sy)*t;
    b.z=b.sz+(b.tz-b.sz)*t+Math.sin(t*Math.PI)*(b.kind==="shot"?105:16);
    const throwing=s.actors[b.from];
    const contacts:{actor:Actor;t:number}[]=[];
    for(const a of s.actors) {
      if(a.id===b.from||a.action==="recoil")continue;
      if(b.kind==="shot"&&a.team===throwing.team)continue;
      if(b.kind==="pass"&&a.team===throwing.team&&a.id!==b.to)continue;
      if(b.kind==="pass"&&!canCatchPass(s,a))continue;
      const hand=anchor(a,a.z>0?"overhead":"front");
      // Swept 3D contact prevents flight tunnelling. A shot can only be blocked by a jump.
      const before=previousHands[a.id];
      const dx=b.x-px-(hand.x-before.x),dy=b.y-py-(hand.y-before.y),dz=b.z-pz-(hand.z-before.z);
      const fx=px-before.x,fy=py-before.y,fz=pz-before.z;
      const qa=dx*dx+dy*dy+dz*dz,qb=2*(fx*dx+fy*dy+fz*dz),qc=fx*fx+fy*fy+fz*fz-100,disc=qb*qb-4*qa*qc;
      const t=qc<=0?0:qa>0&&disc>=0?(-qb-Math.sqrt(disc))/(2*qa):Infinity;
      if(t>=0&&t<=1&&(b.kind==="pass"||(a.action==="block"&&a.z>0))) {
        if(b.kind==="shot"&&b.age>=b.duration&&t>=1)continue;
        contacts.push({actor:a,t});
      }
    }
    if(contacts.length){contacts.sort((a,c)=>a.t-c.t||a.actor.id-c.actor.id);const hit=contacts[0];b.x=px+(b.x-px)*hit.t;b.y=py+(b.y-py)*hit.t;b.z=pz+(b.z-pz)*hit.t;own(s,hit.actor,b.kind==="shot"?"block":hit.actor.team===throwing.team?"catch":"intercept");return;}
    if(t===1) {
      if(b.kind==="pass") {
        const target=s.actors[b.to],p=anchor(target);
        if(canCatchPass(s,target)&&Math.hypot(p.x-b.x,p.y-b.y,p.z-b.z)<12){own(s,target);return;}
        b.kind="loose";b.to=-1;b.vz=40;b.vx=0;b.vy=0;emit(s,"loose");
      } else if(b.made) {
        const team=throwing.team;s.score[team]+=b.points;s.charge[team]=Math.min(100,s.charge[team]+25);
        emit(s,"score",throwing.id,team,b.points);restart(s,other(team),"score-restart");
      } else {
        b.kind="loose";b.to=-1;b.vx=-direction(throwing.team)*115;b.vy=(random(s)-.5)*100;b.vz=165;s.shotClock=14*HZ;emit(s,"rim");
        if(s.buzzer)finish(s);
      }
    }
    return;
  }
  const gathering=b.to>=0?s.actors[b.to]:undefined;
  if(gathering){
    const t=clamp((s.tick-gathering.started)/12,0,1),p=anchor(gathering);
    b.x=b.sx+(p.x-b.sx)*t;b.y=b.sy+(p.y-b.sy)*t;b.z=b.sz+(p.z-b.sz)*t+Math.sin(t*Math.PI)*8;
    return;
  }
  b.vz-=600/HZ;b.x+=b.vx/HZ;b.y+=b.vy/HZ;b.z+=b.vz/HZ;
  if(b.z<5.5) {b.z=5.5;const impact=Math.abs(b.vz)>60;b.vz=impact?-b.vz*.45:0;b.vx*=.85;b.vy*=.85;if(impact)emit(s,"bounce");}
  if(b.x<COURT.left-15||b.x>COURT.right+15||b.y<COURT.top-18||b.y>COURT.bottom+18){restart(s,other(s.actors[b.from].team),"out");return;}
  const nearest=s.actors.filter(a=>ready(s,a)&&distance(a,b)<24&&b.z<40).sort((a,c)=>distance(a,b)-distance(c,b)||a.id-c.id)[0];
  if(nearest) {
    if(b.to===-1){act(s,nearest,"gather",12);nearest.target=-2;b.to=nearest.id;b.sx=b.x;b.sy=b.y;b.sz=b.z;}
  }
}
/** Advance exactly one 60 Hz tick. Inputs are edge actions plus persistent movement. */
export function step(s:Match,input:Input=NO_INPUT) {
  s.events=[];if(s.phase==="result")return;s.tick++;
  for(const a of s.actors)a.moving=false;
  if(s.phase==="restart"){
    for(const a of s.actors){if(a.z>0||a.vz>0){a.vz-=600/HZ;a.z=Math.max(0,a.z+a.vz/HZ);if(a.z===0){a.vz=0;a.until=Math.max(a.until,s.tick+12);emit(s,"land",a.id,a.team);}}if(a.z===0&&a.until<=s.tick)a.action="idle";}
    s.ball.vz-=600/HZ;s.ball.z=Math.max(5.5,s.ball.z+s.ball.vz/HZ);if(s.ball.z===5.5)s.ball.vz=0;
    if(s.tick>=s.restartAt)resume(s);return;
  }
  selectDefender(s);
  if(input.shoot||input.pass)s.buffer={kind:input.shoot?"shoot":"pass",expires:s.tick+18,actor:s.selected};
  if(s.buffer&&(s.buffer.expires<s.tick||s.buffer.actor!==s.selected))s.buffer=null;
  if(s.remaining>0){s.remaining--;s.shotClock--;}
  if(s.remaining===0&&!s.buzzer){s.buzzer=true;emit(s,"buzzer");if(s.ball.kind!=="shot"){finish(s);return;}}
  // Expiry wins over a scheduled release on this tick. A shot already in
  // flight before expiry remains eligible to finish; preparation is not release.
  if(s.shotClock<=0&&s.ball.kind!=="shot"){restart(s,other(s.possession),"shot-clock");return;}
  const previousHands=s.actors.map(a=>anchor(a,a.z>0?"overhead":"front"));
  for(const a of s.actors) {
    if(a.z>0||a.vz>0){a.vz-=600/HZ;a.z=Math.max(0,a.z+a.vz/HZ);if(a.z===0){a.vz=0;a.until=Math.max(a.until,s.tick+12);emit(s,"land",a.id,a.team);}}
    if(a.action==="pass"&&s.tick-a.started===18)releasePass(s,a);
    if(a.action==="shoot"&&s.tick-a.started===22)releaseShot(s,a);
    if(a.action==="dunk"&&s.ball.owner===a.id){
      const age=s.tick-a.started;
      if(age===6){a.z=.01;a.vz=250;emit(s,"jump",a.id,a.team);}
      if(age>=6&&a.z>0){const tx=rimX(a.team)-28*direction(a.team),dx=tx-a.x,dy=COURT.rimY-a.y;const len=Math.hypot(dx,dy);if(len>0)move(a,dx/Math.max(1,len),dy/Math.max(1,len),Math.min(108,len*HZ));a.face=direction(a.team);}
      if(age>6&&a.z===0&&a.vz===0){act(s,a,"receive",12);}
    }
    if(a.action==="gather"&&a.until<=s.tick) {
      if(s.ball.owner===null&&s.ball.kind==="loose"&&s.ball.to===a.id&&distance(a,s.ball)<30&&s.ball.z<45){Object.assign(s.ball,anchor(a));own(s,a,"rebound");}
      else {if(s.ball.kind==="loose"&&s.ball.to===a.id)s.ball.to=-1;a.action="idle";a.target=-1;}
    } else if(a.until<=s.tick&&a.z===0){a.action="idle";a.target=-1;}
  }
  const beforeMovement=s.actors.map(a=>({x:a.x,y:a.y}));
  if(!s.buzzer)for(const a of s.actors) {
    if(a.id===s.selected&&!s.auto) {
      if(ready(s,a)) {
        const has=s.ball.owner===a.id;
        const action=s.buffer?.actor===a.id?s.buffer.kind:null;
        if(action==="shoot"){s.buffer=null;if(has)startShot(s,a);else defensiveAction(s,a,true);}
        else if(action==="pass"){s.buffer=null;if(has)startPass(s,a);else defensiveAction(s,a,false);}
        else move(a,input.x,input.y);
      }
    } else ai(s,a);
  }
  // Acting/recovering bodies remain solid. Only free grounded movers yield;
  // locked actors keep their action/contact anchors. Vertical intervals overlap
  // until their feet differ by72units; high jumps can clear the body volume.
  for(let iteration=0;iteration<4;iteration++)for(let i=0;i<6;i++)for(let j=i+1;j<6;j++) {
    const a=s.actors[i],b=s.actors[j],d=distance(a,b);
    // AI can move and begin a reach within the same tick. That new action
    // must not make its just-applied movement bypass a stationary body.
    const yieldedThisTick=(actor:Actor)=>actor.z===0&&(ready(s,actor)||distance(actor,beforeMovement[actor.id])>1e-8);
    const movableA=yieldedThisTick(a),movableB=yieldedThisTick(b),weight=Number(movableA)+Number(movableB);
    if(d<26&&Math.abs(a.z-b.z)<72&&weight>0) {
      const k=(26-d)/weight,dx=d?(a.x-b.x)/d:1,dy=d?(a.y-b.y)/d:0;
      if(movableA){a.x=clamp(a.x+dx*k,COURT.left,COURT.right);a.y=clamp(a.y+dy*k,COURT.top,COURT.bottom);}
      if(movableB){b.x=clamp(b.x-dx*k,COURT.left,COURT.right);b.y=clamp(b.y-dy*k,COURT.top,COURT.bottom);}
    }
  }
  updateBall(s,previousHands);
  resolveSteals(s);
  selectDefender(s);
  if(s.buzzer&&s.ball.kind!=="shot")finish(s);
  if(s.shotClock<=0&&s.ball.kind!=="shot"&&s.phase==="playing")restart(s,other(s.possession),"shot-clock");
  // Bounded ball-following camera. Presentation may interpolate, but never changes simulation.
  s.camera+= (clamp(s.ball.x-240,0,420)-s.camera)*.06;
}
