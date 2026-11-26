"use client";
import {useTransition} from "react";
import {useRouter} from "next/navigation";
import {RefreshCw} from "lucide-react";

export default function PlaylistRefresh(){
 const router=useRouter();
 const [pending,startTransition]=useTransition();
 return <button type="button" className="playlist-refresh-button" onClick={()=>startTransition(()=>router.refresh())} disabled={pending} aria-label="Refresh playlist" title="Refresh playlist">
  <RefreshCw size={14} className={pending?"is-spinning":""}/>
  <span>{pending?"Refreshing…":"Refresh playlist"}</span>
 </button>;
}
