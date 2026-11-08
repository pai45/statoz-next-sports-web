"use client";
import {useEffect,useRef,useState} from "react";
import {createMatch,HZ,step,type Match} from "./simulation";
import {loadPictures} from "./presentation";
import {createRenderer} from "./renderer";
import {HoopsInput,type Control} from "./input";
import {HoopsAudio} from "./audio";
import {addResult,readArchive,writeArchive,type Archive,type Settings} from "./persistence";
import styles from "./screen.module.css";

type View={score:[number,number];time:number;shot:number;charge:number;phase:string;paused:boolean;started:boolean};
const initial:View={score:[0,0],time:180,shot:24,charge:0,phase:"playing",paused:false,started:false};
export type HoopsHostEvent={type:"ready"|"settings"|"result"|"error"|"exit";payload:unknown};
export type HoopsGameProps={assetBase:string;onExit:()=>void;onEvent?:(event:HoopsHostEvent)=>void;hostSettings?:Settings;hostCommand?:{id:number;type:"pause"|"resume"}};
export function HoopsGame({assetBase,onExit,onEvent,hostSettings,hostCommand}:HoopsGameProps){
  const canvas=useRef<HTMLCanvasElement>(null),session=useRef<{start:()=>void;pause:(force?:boolean)=>void;input:HoopsInput;settings:(s:Settings)=>void}|null>(null);
  const [attempt,setAttempt]=useState(0),[error,setError]=useState(""),[loaded,setLoaded]=useState(false),[view,setView]=useState(initial),[settings,setSettings]=useState<Settings>({sfx:true,music:false});
  const eventHandler=useRef(onEvent);
  useEffect(()=>{eventHandler.current=onEvent;},[onEvent]);
  useEffect(()=>{
    const onEvent=(event:HoopsHostEvent)=>eventHandler.current?.(event);
    const abort=new AbortController(),input=new HoopsInput(),audio=new HoopsAudio();let render:ReturnType<typeof createRenderer>|null=null,raf=0,dead=false,paused=false,started=false,last=0,acc=0;
    let storage:Storage|null=null;try{storage=localStorage;}catch{}
    let archive:Archive=readArchive(storage),match:Match=createMatch(crypto.getRandomValues(new Uint32Array(1))[0]),resultSaved=false,matchNumber=0;
    const id=crypto.randomUUID();setSettings(archive.settings);audio.configure(archive.settings);
    const update=()=>setView({score:[...match.score],time:Math.ceil(match.remaining/HZ),shot:Math.ceil(match.shotClock/HZ),charge:match.charge[0],phase:match.phase,paused,started});
    const pause=()=>{paused=true;input.clear();match.buffer=null;acc=0;last=0;audio.pause();update();};
    const start=()=>{if(!render||dead)return;if(match.phase==="result"){match=createMatch(crypto.getRandomValues(new Uint32Array(1))[0]);resultSaved=false;}started=true;paused=false;input.clear();last=0;acc=0;void audio.unlock().catch(()=>{});update();};
    session.current={start,pause:force=>force?pause():paused?start():pause(),input,settings:s=>{archive={...archive,settings:s};writeArchive(storage,archive);audio.configure(s);onEvent?.({type:"settings",payload:s});}};
    const editable=(target:EventTarget|null)=>target instanceof HTMLElement&&!!target.closest('input,textarea,select,[contenteditable="true"]');
    const key=(e:KeyboardEvent)=>{if(e.code==="Escape"&&e.type==="keydown"&&!e.repeat){if(started)session.current?.pause();return;}if(e.type==="keydown"&&editable(e.target))return;if(input.key(e.code,e.type==="keydown"))e.preventDefault();};
    const focusControl=(e:FocusEvent)=>{if(editable(e.target)){input.clear();match.buffer=null;}};
    const background=()=>{if(document.hidden&&started)pause();};
    const blur=()=>{if(started)pause();else input.clear();};
    const lost=(e:Event)=>{e.preventDefault();pause();setError("The court display stopped. Reload the game to continue.");};
    window.addEventListener("keydown",key);window.addEventListener("keyup",key);window.addEventListener("blur",blur);window.addEventListener("focusin",focusControl);document.addEventListener("visibilitychange",background);
    const element=canvas.current!;element.addEventListener("webglcontextlost",lost);
    const loop=(now:number)=>{if(dead)return;raf=requestAnimationFrame(loop);if(!render)return;
      if(started&&!paused&&match.phase!=="result"){
        if(last)acc+=Math.min(.1,(now-last)/1000);last=now;
        while(acc>=1/HZ){step(match,input.read());audio.events(match.events);acc-=1/HZ;}
        if(match.tick%6===0||String(match.phase)==="result")update();
      }else{last=0;acc=0;}
      render.draw(match);
      if(match.phase==="result"&&!resultSaved){resultSaved=true;audio.pause();const result={id:id+":"+(++matchNumber),seed:match.seed,score:[...match.score] as [number,number],completedAt:new Date().toISOString(),rulesVersion:match.version};archive=addResult(archive,result);writeArchive(storage,archive);onEvent?.({type:"result",payload:result});update();}
    };
    void loadPictures(assetBase,abort.signal).then(p=>{if(dead)return;render=createRenderer(element,p);setLoaded(true);onEvent?.({type:"ready",payload:{gameId:"retro-hoops",rulesVersion:match.version}});update();raf=requestAnimationFrame(loop);}).catch(e=>{if(!dead){const message=e instanceof Error?e.message:"The court could not load.";setError(message);onEvent?.({type:"error",payload:{message}});}});
    return()=>{dead=true;abort.abort();cancelAnimationFrame(raf);session.current=null;input.clear();render?.dispose();void audio.dispose();window.removeEventListener("keydown",key);window.removeEventListener("keyup",key);window.removeEventListener("blur",blur);window.removeEventListener("focusin",focusControl);document.removeEventListener("visibilitychange",background);element.removeEventListener("webglcontextlost",lost);};
  },[attempt,assetBase]);
  useEffect(()=>{if(hostSettings){setSettings(hostSettings);session.current?.settings(hostSettings);}},[hostSettings]);
  useEffect(()=>{if(hostCommand?.type==="pause")session.current?.pause(true);else if(hostCommand?.type==="resume")session.current?.start();},[hostCommand]);
  const change=(s:Settings)=>{setSettings(s);session.current?.settings(s);};
  const button=(control:Control,label:string)=> <button type="button" aria-label={label} onPointerDown={e=>{e.preventDefault();e.currentTarget.setPointerCapture(e.pointerId);session.current?.input.down("p"+e.pointerId,control);}} onPointerUp={e=>session.current?.input.up("p"+e.pointerId)} onPointerCancel={e=>session.current?.input.up("p"+e.pointerId)} onLostPointerCapture={e=>session.current?.input.up("p"+e.pointerId)}>{label}</button>;
  return <section className={styles.root} aria-label="Retro Hoops">
    <header className={styles.header}><button onClick={()=>{onEvent?.({type:"exit",payload:{}});onExit();}}>Exit</button><h1>RETRO HOOPS</h1><button disabled={!loaded||!view.started||view.phase==="result"} onClick={()=>session.current?.pause()}>{view.paused?"Resume":"Pause"}</button></header>
    <div className={styles.score} aria-live="off"><span>NAVY <strong>{view.score[0]}</strong></span><span><b>{Math.floor(view.time/60)}:{String(view.time%60).padStart(2,"0")}</b><small>SHOT {view.shot} · SUPER {view.charge}%</small></span><span><strong>{view.score[1]}</strong> AMBER</span></div>
    <div className={styles.court}><canvas ref={canvas} width={480} height={360} aria-label="Full-court three versus three basketball" />
      {(error||!loaded||!view.started||view.paused||view.phase==="result")&&<div className={styles.overlay} role={error?"alert":"status"}>
        <h2>{error?"COURT UNAVAILABLE":!loaded?"LOADING COURT":view.phase==="result"?(view.score[0]===view.score[1]?"DRAW":view.score[0]>view.score[1]?"NAVY WINS":"AMBER WINS"):view.paused?"PAUSED":"THREE MINUTES. FULL COURT."}</h2>
        {error?<><p>{error}</p><button onClick={()=>{setError("");setLoaded(false);setView(initial);setAttempt(n=>n+1);}}>Retry loading</button></>:loaded&&<><p>Move with arrows / WASD. J shoots or blocks. K passes or steals. A full charge powers your next shot.</p><button onClick={()=>session.current?.start()}>{view.phase==="result"?"Rematch":view.paused?"Resume match":"Start match"}</button></>}
      </div>}
    </div>
    <div className={styles.controls}><div className={styles.pad}>{button("up","↑")}<div>{button("left","←")}{button("down","↓")}{button("right","→")}</div></div><div className={styles.actions}>{button("shoot","J · Shoot / Block")}{button("pass","K · Pass / Steal")}</div></div>
    <footer><label><input type="checkbox" checked={settings.sfx} onChange={e=>change({...settings,sfx:e.target.checked})}/> Sound</label><label>Sound volume<input aria-label="Sound volume" type="range" min="0" max="1" step="0.05" value={settings.sfxVolume??.7} onChange={e=>change({...settings,sfxVolume:Number(e.target.value)})}/></label><label><input type="checkbox" checked={settings.music} onChange={e=>change({...settings,music:e.target.checked})}/> Music</label><label>Music volume<input aria-label="Music volume" type="range" min="0" max="1" step="0.05" value={settings.musicVolume??.4} onChange={e=>change({...settings,musicVolume:Number(e.target.value)})}/></label><span>3v3 · No rewards · Fictional teams</span></footer>
  </section>;
}
