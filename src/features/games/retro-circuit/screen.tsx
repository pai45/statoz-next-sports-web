"use client";
import {useEffect,useRef} from "react";
import {useRouter} from "next/navigation";
import {mountCircuit,type CircuitSession} from "./mount";
import type {GameLauncherProps} from "../components/game-launcher";
import "./circuit.css";
export function RetroCircuit(props:GameLauncherProps){
 const root=useRef<HTMLDivElement>(null),router=useRouter();
 useEffect(()=>{const container=root.current;if(!container)return;let session:CircuitSession|undefined;
  try{session=mountCircuit(container,{onExit:()=>router.push("/games/motorsport")});}
  catch{container.replaceChildren();const alert=document.createElement("section"),text=document.createElement("p"),back=document.createElement("button");alert.setAttribute("role","alert");alert.className="grid min-h-dvh place-content-center gap-4 p-8";text.textContent="Retro Circuit could not start. Return to motorsport and try again.";back.type="button";back.textContent="BACK TO MOTORSPORT";back.onclick=()=>router.push("/games/motorsport");alert.append(text,back);container.append(alert);}
  return ()=>{session?.dispose();container.replaceChildren();container.classList.remove("retro-circuit");};
 },[router]);
 return <div ref={root} aria-label={props.entry.title} />;
}
