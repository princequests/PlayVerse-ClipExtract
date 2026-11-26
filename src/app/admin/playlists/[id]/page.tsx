"use client";
import {useCallback,useEffect,useState} from "react";
import Link from "next/link";
import ThemeToggle from "@/components/theme-toggle";
import {useParams} from "next/navigation";
import {ArrowLeft,Film,PlayCircle,RefreshCw} from "lucide-react";

type Entry={id:string;title:string;description:string;imageUrl:string;kind:string;category:string;status:string;sources?:{url:string;provider:string}[]};
export default function PlaylistDetailPage(){
 const params=useParams<{id:string}>();
 const [playlist,setPlaylist]=useState<Entry|null>(null);
 const [items,setItems]=useState<Entry[]>([]);
 const [loading,setLoading]=useState(true);
 const [refreshing,setRefreshing]=useState(false);
 const [error,setError]=useState("");
 const loadPlaylist=useCallback(async()=>{
  try{
   setError("");
   const response=await fetch(`/api/content?parentId=${encodeURIComponent(params.id)}`,{cache:"no-store"});
   if(!response.ok)throw new Error("Could not load playlist videos.");
   const rows:Entry[]=await response.json();
   const parentResponse=await fetch("/api/content",{cache:"no-store"});
   if(!parentResponse.ok)throw new Error("Could not load playlist details.");
   const all:Entry[]=await parentResponse.json();
   const found=all.find((x)=>x.id===params.id&&x.kind==="Playlist");
   setPlaylist(found||null);
   setItems(rows.filter(x=>x.id!==params.id));
   if(!found)setError("Playlist not found. It may have been deleted.");
  }catch(e){setError(e instanceof Error?e.message:"Something went wrong.");}
  finally{setLoading(false);setRefreshing(false);}
 },[params.id]);
 useEffect(()=>{void loadPlaylist()},[loadPlaylist]);
 const refreshPlaylist=()=>{setRefreshing(true);void loadPlaylist()};
 return <main className="admin-main playlist-detail-page">
  <header className="admin-top"><div><Link href="/admin?section=Playlists" className="playlist-back"><ArrowLeft size={16}/> Back to Playlists</Link><span className="eyebrow">PLAYVERSE STUDIO / PLAYLIST CONTENT</span><h1>{playlist?.title||"Playlist"}</h1><p>View and organize every video or content entry inside this playlist.</p></div><ThemeToggle compact/></header>
  {loading?<section className="table-panel"><p className="playlist-loading">Loading playlist…</p></section>:error?<section className="table-panel"><p className="prototype-note">{error}</p></section>:<><section className="playlist-summary"><div className="playlist-summary-art"><img src={playlist?.imageUrl||"https://placehold.co/320x180/171b25/ffffff?text=Playlist"} alt=""/></div><div><span className="eyebrow">PLAYLIST</span><h2>{playlist?.title}</h2><p>{playlist?.description}</p><span className="playlist-count">{items.length} {items.length===1?"video":"videos"}</span></div></section>
  <section className="table-panel"><div className="table-toolbar"><div><h2>Items in this playlist</h2><p>These videos and other content entries belong to this playlist only.</p></div><div className="playlist-detail-actions"><button type="button" className="playlist-refresh-button" onClick={refreshPlaylist} disabled={refreshing}><RefreshCw size={14} className={refreshing?"is-spinning":""}/><span>{refreshing?"Refreshing…":"Refresh"}</span></button><Link href={`/admin?section=Playlists&edit=${encodeURIComponent(playlist?.id||params.id)}`} className="playlist-add-link">Edit playlist</Link></div></div>
   {items.length?<div className="playlist-items-list">{items.map((item,index)=><article className="playlist-admin-item" key={item.id}><span className="playlist-item-number">{String(index+1).padStart(2,"0")}</span><img src={item.imageUrl||"https://placehold.co/120x72/171b25/ffffff?text=Video"} alt=""/><div className="playlist-item-copy"><strong>{item.title}</strong><span>{item.kind} · {item.status}</span></div><Link href={`/watch/${item.id}`} target="_blank" className="playlist-item-action"><PlayCircle size={16}/> Preview</Link><Link href={`/admin?section=Playlists&edit=${encodeURIComponent(item.id)}`} className="playlist-item-action"><Film size={16}/> Edit</Link></article>)}</div>:<div className="empty-state">This playlist has no entries yet. Edit the playlist in Studio and add or import its videos and other content.</div>}
  </section></>}
 </main>
}
