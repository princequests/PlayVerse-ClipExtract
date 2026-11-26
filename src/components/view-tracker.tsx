"use client";
import {useEffect} from "react";
export default function ViewTracker({contentId}:{contentId:string}){
 useEffect(()=>{
  try{
   const key="playverse-recently-watched";
   const current=JSON.parse(localStorage.getItem(key)||"[]");
   const next=[contentId,...current.filter((id:string)=>id!==contentId)].slice(0,100);
   localStorage.setItem(key,JSON.stringify(next));
  }catch{}
 },[contentId]);
 return null;
}
