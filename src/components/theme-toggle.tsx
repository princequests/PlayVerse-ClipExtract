"use client";
import {useEffect,useState} from "react";
import {Monitor, Moon, Sun, Settings2, Type, Rows3} from "lucide-react";

type ThemeMode="light"|"system"|"dark";
type FontScale="small"|"normal"|"large";
type Density="compact"|"comfortable"|"spacious";
const STORAGE_KEY="playverse-theme";
function resolveTheme(mode:ThemeMode){
 if(mode!=="system")return mode;
 return window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light";
}
export default function ThemeToggle({compact=false}:{compact?:boolean}){
 const [mode,setMode]=useState<ThemeMode>("system");
 const [fontScale,setFontScale]=useState<FontScale>("normal");
 const [density,setDensity]=useState<Density>("comfortable");
 const [open,setOpen]=useState(false);
 useEffect(()=>{
  const saved=localStorage.getItem(STORAGE_KEY) as ThemeMode|null;
  const font=localStorage.getItem("playverse-font-scale") as FontScale|null;
  const space=localStorage.getItem("playverse-density") as Density|null;
  if(saved==="light"||saved==="dark"||saved==="system")setMode(saved);
  if(font==="small"||font==="normal"||font==="large")setFontScale(font);
  if(space==="compact"||space==="comfortable"||space==="spacious")setDensity(space);
 },[]);
 useEffect(()=>{
  const apply=()=>{const theme=resolveTheme(mode);document.documentElement.dataset.theme=theme;document.documentElement.style.colorScheme=theme;};
  apply();
  const media=window.matchMedia("(prefers-color-scheme: dark)");
  media.addEventListener("change",apply);
  localStorage.setItem(STORAGE_KEY,mode);
  return()=>media.removeEventListener("change",apply);
 },[mode]);
 useEffect(()=>{
  document.documentElement.dataset.fontSize=fontScale;
  document.documentElement.dataset.density=density;
  localStorage.setItem("playverse-font-scale",fontScale);
  localStorage.setItem("playverse-density",density);
 },[fontScale,density]);
 return <div className={`playverse-appearance${compact?" compact":""}`}>
  <div className={`playverse-theme-toggle${compact?" compact":""}`} role="group" aria-label="Appearance">
   <button type="button" onClick={()=>setMode("light")} className={mode==="light"?"selected":""} aria-label="Light mode" title="Light mode"><Sun size={14}/></button>
   <button type="button" onClick={()=>setMode("system")} className={mode==="system"?"selected":""} aria-label="System appearance" title="Use device setting"><Monitor size={14}/></button>
   <button type="button" onClick={()=>setMode("dark")} className={mode==="dark"?"selected":""} aria-label="Dark mode" title="Dark mode"><Moon size={14}/></button>
  </div>
  <button type="button" className={`appearance-settings-trigger${open?" active":""}`} onClick={()=>setOpen(v=>!v)} aria-expanded={open} aria-label="Display settings" title="Display settings"><Settings2 size={16}/></button>
  {open&&<div className="appearance-settings-panel">
   <div className="appearance-panel-title"><b>Display settings</b><span>Personalise your viewing experience</span></div>
   <div className="appearance-setting-row"><span><Type size={16}/> Text size</span><div className="appearance-options">
    {(["small","normal","large"] as FontScale[]).map(value=><button type="button" key={value} className={fontScale===value?"selected":""} onClick={()=>setFontScale(value)}>{value==="small"?"A−":value==="large"?"A+":"A"}<small>{value==="small"?"Small":value==="large"?"Large":"Default"}</small></button>)}
   </div></div>
   <div className="appearance-setting-row"><span><Rows3 size={16}/> Layout spacing</span><div className="appearance-options density-options">
    {(["compact","comfortable","spacious"] as Density[]).map(value=><button type="button" key={value} className={density===value?"selected":""} onClick={()=>setDensity(value)}><small>{value==="compact"?"Compact":value==="comfortable"?"Comfortable":"Spacious"}</small></button>)}
   </div></div>
  </div>}
 </div>;
}
