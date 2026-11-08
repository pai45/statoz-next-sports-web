export const STORAGE_KEY="statoz.next.sports-web.retro-hoops.v1";
export type Settings={sfx:boolean;music:boolean;sfxVolume?:number;musicVolume?:number};
export type Result={id:string;seed:number;score:[number,number];completedAt:string;rulesVersion:string};
export type Archive={version:1;settings:Settings;results:Result[]};
export const emptyArchive=():Archive=>({version:1,settings:{sfx:true,music:false,sfxVolume:.7,musicVolume:.4},results:[]});
export function volume(value:unknown,fallback:number){return typeof value==='number'&&Number.isFinite(value)?Math.max(0,Math.min(1,value)):fallback;}
export function readArchive(storage:Pick<Storage,"getItem">|null):Archive {
  try{const a=JSON.parse(storage?.getItem(STORAGE_KEY)||"null");if(a?.version!==1)return emptyArchive();return {version:1,settings:{sfx:typeof a.settings?.sfx==="boolean"?a.settings.sfx:true,music:typeof a.settings?.music==="boolean"?a.settings.music:false,sfxVolume:volume(a.settings?.sfxVolume,.7),musicVolume:volume(a.settings?.musicVolume,.4)},results:Array.isArray(a.results)?a.results.filter((r:Result)=>typeof r?.id==="string"&&Number.isInteger(r.seed)&&Array.isArray(r.score)&&r.score.length===2&&r.score.every(n=>Number.isInteger(n)&&n>=0&&n<1000)&&typeof r.completedAt==="string"&&typeof r.rulesVersion==="string").slice(-20):[]};}catch{return emptyArchive();}
}
export function writeArchive(storage:Pick<Storage,"setItem">|null,a:Archive){try{storage?.setItem(STORAGE_KEY,JSON.stringify(a));}catch{/* Restricted/quota storage never prevents play. */}}
export function addResult(a:Archive,result:Result):Archive{return a.results.some(r=>r.id===result.id)?a:{...a,results:[...a.results,result].slice(-20)};}
