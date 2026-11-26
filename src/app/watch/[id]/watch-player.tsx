"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import Hls from "hls.js";
import Link from "next/link";
import DailymotionPlayer, { type DailymotionPlayerApi } from "./dailymotion-player";
import { AlertCircle, Maximize2, Theater, ListVideo, ChevronLeft, ChevronRight, ArrowUpLeft, Share2 } from "lucide-react";

declare global {
 interface Window {
  Vimeo?: { Player: new (element: HTMLIFrameElement) => VimeoSdkPlayer };
}
}
type VimeoSdkPlayer={
 on:(event:string,callback:(data:any)=>void)=>void;
 off:(event:string,callback:(data:any)=>void)=>void;
 ready:()=>Promise<void>;
 getDuration:()=>Promise<number>;
 getVolume:()=>Promise<number>;
 getPaused:()=>Promise<boolean>;
 play:()=>Promise<void>;
 pause:()=>Promise<void>;
 setCurrentTime:(seconds:number)=>Promise<number>;
 setVolume:(volume:number)=>Promise<number>;
 setPlaybackRate:(rate:number)=>Promise<number>;
 destroy:()=>Promise<void>;
};



type Source={id:string;url:string;provider:string;label:string;isPrimary:boolean};
type SeriesEntry={id:string;title:string;kind:string};
type CaptionTrack={id:string;language:string;label:string;isDefault:boolean;contentText:string};
type CaptionCue={start:number;end:number;text:string};
function parseCaptionCues(vtt:string):CaptionCue[]{
 const normalized=vtt.replace(/^WEBVTT[^\n]*\n/,"").replace(/\r/g,"");
 return normalized.split(/\n\s*\n/).map(block=>{
   const lines=block.split("\n").filter(Boolean);
   const timeIndex=lines.findIndex(line=>line.includes("-->"));
   if(timeIndex<0)return null;
   const match=lines[timeIndex].match(/(\d{2}:\d{2}:\d{2}\.\d{3}|\d{2}:\d{2}\.\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2}\.\d{3}|\d{2}:\d{2}\.\d{3})/);
   if(!match)return null;
   const seconds=(value:string)=>{const parts=value.split(":").map(Number);return parts.length===3?parts[0]*3600+parts[1]*60+parts[2]:parts[0]*60+parts[1]};
   return {start:seconds(match[1]),end:seconds(match[2]),text:lines.slice(timeIndex+1).join("\n")};
 }).filter((cue):cue is CaptionCue=>Boolean(cue));
}
function resolvePlayer(raw:string){
  try{
    const u=new URL(raw),host=u.hostname.toLowerCase(),path=u.pathname;
    if(host==="youtu.be"||host.endsWith("youtube.com")||host.endsWith("youtube-nocookie.com")){
      const videoId=host==="youtu.be"?path.split("/").filter(Boolean)[0]:
        u.searchParams.get("v")||path.match(/\/(?:shorts|embed|live|v)\/([^/?]+)/)?.[1];
      const list=u.searchParams.get("list");
      if(videoId)return {kind:"iframe" as const,src:`https://www.youtube.com/embed/${encodeURIComponent(videoId)}${list?`?list=${encodeURIComponent(list)}&rel=0&playsinline=1&controls=1&disablekb=0&iv_load_policy=3&showinfo=0&enablejsapi=1`:"?rel=0&playsinline=1&controls=1&disablekb=0&iv_load_policy=3&showinfo=0&enablejsapi=1"}`};
      if(list)return {kind:"iframe" as const,src:`https://www.youtube-nocookie.com/embed/videoseries?list=${encodeURIComponent(list)}&controls=1&disablekb=0&rel=0&iv_load_policy=3&showinfo=0&enablejsapi=1&origin=${encodeURIComponent(typeof window!=="undefined"?window.location.origin:"")}`};
      return null;
    }

    if(host==="drive.google.com"||host==="docs.google.com"){
      const driveId=path.match(/\/file\/d\/([^/]+)/)?.[1]||u.searchParams.get("id");
      if(driveId&&/^[a-zA-Z0-9_-]{10,}$/.test(driveId))return {kind:"iframe" as const,src:"https://drive.google.com/file/d/"+encodeURIComponent(driveId)+"/preview"};
      return null;
    }
    if(host==="x.com"||host.endsWith(".x.com")||host==="twitter.com"||host.endsWith(".twitter.com")){
      const postId=path.match(/\/status\/(\d+)/)?.[1];
      if(postId)return {kind:"iframe" as const,src:"https://platform.twitter.com/embed/Tweet.html?id="+postId+"&dnt=true&theme=dark&conversation=none"};
      return null;
    }
    if(host==="facebook.com"||host.endsWith(".facebook.com")||host==="fb.watch"){
      const cleanUrl=new URL(u.href);["mibextid","__tn__","__cft__","ref","refsrc"].forEach(key=>cleanUrl.searchParams.delete(key));
      return {kind:"iframe" as const,src:"https://www.facebook.com/plugins/video.php?href="+encodeURIComponent(cleanUrl.toString())+"&show_text=0&width=720&allowfullscreen=true"};
    }
    if(host==="instagram.com"||host.endsWith(".instagram.com")){
      const shortcode=path.match(/\/(?:reel|reels|p|tv)\/([A-Za-z0-9_-]+)/)?.[1];
      if(shortcode){const route=/\/reels?\//i.test(path)?"reel":/\/tv\//i.test(path)?"tv":"p";return {kind:"iframe" as const,src:"https://www.instagram.com/"+route+"/"+encodeURIComponent(shortcode)+"/embed/"};}
      return null;
    }
    if(host==="tiktok.com"||host.endsWith(".tiktok.com")){
      const videoId=path.match(/\/video\/(\d+)/)?.[1];
      if(videoId)return {kind:"iframe" as const,src:"https://www.tiktok.com/embed/v2/"+videoId};
      return null;
    }
    if(host.endsWith("vimeo.com")){
      const id=path.match(/(?:video\/)?(\d+)(?:$|\/)/)?.[1]||path.split("/").filter(Boolean).pop();
      if(id&&/^\d+$/.test(id))return {kind:"iframe" as const,src:`https://player.vimeo.com/video/${id}?controls=0&title=0&byline=0&portrait=0&dnt=1&api=1&download=0&pip=0`};
    }
    if(host==="geo.dailymotion.com"){
      // New Dailymotion embeds must include a valid Player ID.
      if(/^\/player\/[^/]+\.html$/i.test(path)&&(u.searchParams.has("video")||u.searchParams.has("playlist"))){
        return {kind:"dailymotion" as const,playerId:path.match(/^\/player\/([^/]+)\.html$/i)?.[1]||"",videoId:u.searchParams.get("video")||undefined,playlistId:u.searchParams.get("playlist")||undefined};
      }
    }
    if(host.endsWith("dailymotion.com")||host==="dai.ly"){
      // Dailymotion playlist URLs are /playlist/{playlistId}; video URLs are
      // /video/{videoId}. The current Geo Player endpoint supports both.
      const playlistId=host!=="dai.ly"?
        (u.searchParams.get("playlist")||path.match(/\/playlist\/([^/?]+)/)?.[1]):null;
      const videoId=host==="dai.ly"?path.split("/").filter(Boolean)[0]:
        (u.searchParams.get("video")||path.match(/\/(?:video|embed\/video)\/([^_/?]+)/)?.[1]);
      // Restore the Player ID already used by PlayVerse's previously working
      // Dailymotion integration. Render can override it with an env variable,
      // but an unset variable must not make public Dailymotion videos fail.
      const playerId=process.env.NEXT_PUBLIC_DAILYMOTION_PLAYER_ID?.trim()||"x2tvvg9";
      // Keep the selected video AND its playlist together. The playlist powers
      // Dailymotion's native queue/previous/next controls in the hosted player.
      const defaultPlaylistId=process.env.NEXT_PUBLIC_DAILYMOTION_PLAYLIST_ID?.trim()||"x814o4";
      if(playerId&&(playlistId||videoId)){
        return {
          kind:"dailymotion" as const,
          playerId,
          videoId:videoId||undefined,
          playlistId:playlistId||defaultPlaylistId,
        };
      }
      if(videoId)return {kind:"iframe" as const,src:`https://www.dailymotion.com/embed/video/${encodeURIComponent(videoId)}?autoplay=0&mute=0&controls=1`};
      if(playlistId)return {kind:"iframe" as const,src:`https://www.dailymotion.com/embed/playlist/${encodeURIComponent(playlistId)}?autoplay=0&mute=0&controls=1`};
    }
    if(/\.(mp4|webm|ogv)(?:$|[?#])/i.test(raw))return {kind:"video" as const,src:raw};
    if(/\.m3u8(?:$|[?#])/i.test(raw))return {kind:"hls" as const,src:raw};
    return null;
  }catch{return null}
}
export default function WatchPlayer({sources,title,poster,contentKind="",captions=[],seriesEntries=[],previousHref,nextHref,seriesHref,seriesTitle,listTitle}:{sources:Source[];title:string;poster:string;contentKind?:string;captions?:CaptionTrack[];seriesEntries?:SeriesEntry[];previousHref?:string;nextHref?:string;seriesHref?:string;seriesTitle?:string;listTitle?:string}){
 const [active,setActive]=useState(()=>Math.max(0,sources.findIndex(s=>s.isPrimary)));
 const [failed,setFailed]=useState(false);
 const [vimeoPlaying,setVimeoPlaying]=useState(false);
 const [vimeoCurrentTime,setVimeoCurrentTime]=useState(0);
 const [vimeoDuration,setVimeoDuration]=useState(0);
 const [vimeoVolume,setVimeoVolume]=useState(1);
 const [vimeoMuted,setVimeoMuted]=useState(false);
 const [vimeoBuffering,setVimeoBuffering]=useState(false);
 const [vimeoRate,setVimeoRate]=useState(1);
 const vimeoSdkRef=useRef<VimeoSdkPlayer|null>(null);
 const dailymotionSdkRef=useRef<DailymotionPlayerApi|null>(null);
 const [dmApiReady,setDmApiReady]=useState(false);
 const [youtubePlaying,setYoutubePlaying]=useState(false);
 const [youtubeMuted,setYoutubeMuted]=useState(false);
 const [youtubeVolume,setYoutubeVolume]=useState(100);
 const [dmPlaying,setDmPlaying]=useState(false);
 const [dmCurrentTime,setDmCurrentTime]=useState(0);
 const [dmDuration,setDmDuration]=useState(0);
 const [dmVolume,setDmVolume]=useState(1);
 const [dmMuted,setDmMuted]=useState(false);
 const [dmBuffering,setDmBuffering]=useState(false);
 const [dmRate,setDmRate]=useState(1);

 const [theatre,setTheatre]=useState(false);
 const [aspectOverride,setAspectOverride]=useState<"16:9"|"9:16"|null>(null);
 const [detectedPortrait,setDetectedPortrait]=useState<boolean|null>(null);
 const [showSeries,setShowSeries]=useState(false);
 const [overlayVisible,setOverlayVisible]=useState(true);
 const overlayTimer=useRef<ReturnType<typeof setTimeout>|null>(null);
 const [speed,setSpeed]=useState("1");
 const [progress,setProgress]=useState(0);
 const [duration,setDuration]=useState(0);
 const [captionTrackId,setCaptionTrackId]=useState(()=>captions.find(c=>c.isDefault)?.id||"");
 const [captionsEnabled,setCaptionsEnabled]=useState(()=>captions.some(c=>c.isDefault));
 const [captionCue,setCaptionCue]=useState("");
 const [captionSize,setCaptionSize]=useState("medium");
 const [showCaptionMenu,setShowCaptionMenu]=useState(false);
 const source=sources[active]||sources[0];
 const player=useMemo(()=>source?resolvePlayer(source.url):null,[source]);
 const [facebookEmbed,setFacebookEmbed]=useState<{src:string;ratio:number}|null>(null);
 useEffect(()=>{
   setFacebookEmbed(null);
   if(!source||!/(facebook|fb\.watch)/i.test(source.provider))return;
   const controller=new AbortController();
   fetch(`/api/social/facebook-embed?url=${encodeURIComponent(source.url)}`,{signal:controller.signal})
     .then(response=>response.ok?response.json():Promise.reject(new Error("Facebook embed resolution failed")))
     .then(data=>{if(data.src)setFacebookEmbed({src:data.src,ratio:Number(data.ratio)||16/9});})
     .catch(error=>{if(error.name!=="AbortError")console.warn("Facebook public embed could not be resolved:",error);});
   return()=>controller.abort();
 },[source?.id,source?.url,source?.provider]);
 const isVimeoPlayer=player?.kind==="iframe"&&(/vimeo/i.test(source?.provider||"")||/player\.vimeo\.com/i.test(player.src));
 const isYouTubePlayer=player?.kind==="iframe"&&(/youtube/i.test(source?.provider||"")||/youtube(?:-nocookie)?\.com\/embed/i.test(player.src));
 const isDailymotionPlayer=player?.kind==="dailymotion";
 const socialProvider=(source?.provider||"").toLowerCase();
 const isSocialPlayer=player?.kind==="iframe"&&/(facebook|instagram|tiktok|^x$|twitter)/i.test(socialProvider);
 const sourceUrl=source?.url||"";
 const urlSuggestsPortrait=/(?:tiktok\.com|\/(?:reel|reels|shorts)\/|youtube\.com\/shorts\/)/i.test(sourceUrl)||/instagram/i.test(socialProvider);
 const inferredPortrait=detectedPortrait??(urlSuggestsPortrait||(/facebook/i.test(socialProvider)&&Boolean(facebookEmbed&&facebookEmbed.ratio<.85))||/short/i.test(contentKind));
 const isPortraitSource=aspectOverride?aspectOverride==="9:16":inferredPortrait;
 useEffect(()=>{setDetectedPortrait(null);},[source?.id,source?.url]);
 useEffect(()=>{
   if(!poster)return;
   const image=new Image();
   image.onload=()=>{if(image.naturalWidth&&image.naturalHeight)setDetectedPortrait(current=>current===null?image.naturalHeight>image.naturalWidth*1.05:current);};
   image.src=poster;
   return()=>{image.onload=null;};
 },[poster]);
 const iframeRef=useRef<HTMLIFrameElement>(null);
 const videoRef=useRef<HTMLVideoElement>(null);
 const directVideoRef=useRef<HTMLVideoElement>(null);
 const playerRef=useRef<HTMLDivElement>(null);
 const openFullscreen=async()=>{const target=playerRef.current;if(!target)return;try{if(document.fullscreenElement){await document.exitFullscreen();}else if(target.requestFullscreen){await target.requestFullscreen();}}catch(error){console.error("Could not enter fullscreen playback:",error);}};
 const toggleTheatre=()=>setTheatre(value=>!value);
 const toggleDailymotionPlayback=()=>{const api=dailymotionSdkRef.current;if(!api)return;void (dmPlaying?api.pause():api.play());};
 const sendYouTubeCommand=(func:string,args:any[]=[])=>{iframeRef.current?.contentWindow?.postMessage(JSON.stringify({event:"command",func,args}),"*");};
 const toggleYouTubePlayback=()=>{const next=!youtubePlaying;setYoutubePlaying(next);sendYouTubeCommand(next?"playVideo":"pauseVideo");};
 const toggleYouTubeMute=()=>{const next=!youtubeMuted;setYoutubeMuted(next);sendYouTubeCommand(next?"mute":"unMute");};
 const setYouTubeVolume=(value:number)=>{const next=Math.max(0,Math.min(100,value));setYoutubeVolume(next);setYoutubeMuted(next===0);sendYouTubeCommand("setVolume",[next]);if(next===0)sendYouTubeCommand("mute");else sendYouTubeCommand("unMute");};
 const seekDailymotion=(percent:number)=>{const api=dailymotionSdkRef.current;if(api&&dmDuration>0)void api.seek((percent/100)*dmDuration);};
 const setDailymotionVolume=(volume:number)=>{setDmVolume(volume);setDmMuted(volume===0);const api=dailymotionSdkRef.current;if(api)void api.setVolume(volume);};
 const setDailymotionSpeed=(rate:number)=>{setDmRate(rate);const api=dailymotionSdkRef.current;if(api)void api.setPlaybackSpeed(rate);};
 const handleDailymotionReady=(api:DailymotionPlayerApi|null)=>{dailymotionSdkRef.current=api;setDmApiReady(Boolean(api));};
 const handleDailymotionState=(state:Record<string,any>)=>{
   if(typeof state.playerIsPlaying==="boolean")setDmPlaying(state.playerIsPlaying);
   if(typeof state.videoTime==="number")setDmCurrentTime(state.videoTime);
   if(typeof state.videoDuration==="number")setDmDuration(state.videoDuration);
   if(typeof state.playerVolume==="number")setDmVolume(state.playerVolume);
   if(typeof state.playerIsMuted==="boolean")setDmMuted(state.playerIsMuted);
   else if(typeof state.playerVolume==="number")setDmMuted(state.playerVolume===0);
   if(typeof state.playerIsBuffering==="boolean")setDmBuffering(state.playerIsBuffering);
   if(typeof state.playerPlaybackSpeed==="number")setDmRate(state.playerPlaybackSpeed);
 };

 const setPlaybackSpeed=(value:string)=>{setSpeed(value);if(directVideoRef.current)directVideoRef.current.playbackRate=Number(value);if(videoRef.current)videoRef.current.playbackRate=Number(value);};
 const toggleDirectPlayback=()=>{const v=directVideoRef.current||videoRef.current;if(!v)return;if(v.paused){void v.play();}else{v.pause();}};
 const seekDirect=(value:number)=>{const v=directVideoRef.current||videoRef.current;if(v&&Number.isFinite(v.duration)){v.currentTime=(value/100)*v.duration;setProgress(value);}};
 const syncDirectTime=(v:HTMLVideoElement)=>{
   if(v.videoWidth>0&&v.videoHeight>0)setDetectedPortrait(v.videoHeight>v.videoWidth*1.05);
   setProgress(v.duration?100*v.currentTime/v.duration:0);
   setDuration(Number.isFinite(v.duration)?v.duration:0);
   if(captionsEnabled&&captionTrackId){
     const track=captions.find(c=>c.id===captionTrackId);
     const cue=track?parseCaptionCues(track.contentText).find(c=>v.currentTime>=c.start&&v.currentTime<=c.end):undefined;
     setCaptionCue(cue?.text||"");
   }else setCaptionCue("");
 };
 const openPictureInPicture=async()=>{const video=directVideoRef.current||videoRef.current;if(!video||!document.pictureInPictureEnabled)return;try{if(document.pictureInPictureElement)await document.exitPictureInPicture();else await video.requestPictureInPicture();}catch(error){console.error("Picture-in-Picture is unavailable:",error);}};
 const clearOverlayTimer=()=>{if(overlayTimer.current){clearTimeout(overlayTimer.current);overlayTimer.current=null;}};
 const scheduleOverlayHide=()=>{
   clearOverlayTimer();
   overlayTimer.current=setTimeout(()=>{setOverlayVisible(false);setShowSeries(false);setShowCaptionMenu(false);},10000);
 };
 const revealOverlay=()=>{setOverlayVisible(true);scheduleOverlayHide();};
 const handlePlaybackStart=()=>{scheduleOverlayHide();};
 const handlePlaybackPause=()=>{setOverlayVisible(true);setShowSeries(false);scheduleOverlayHide();};

 useEffect(()=>{
   const frame=iframeRef.current;
   if(!frame||player?.kind!=="iframe")return;
   const provider=source?.provider?.toLowerCase()||"";
   const isYouTube=/youtube|youtu\.be/i.test(provider)||/youtube(-nocookie)?\.com/i.test(player.src);
   const send=(payload:unknown,targetOrigin:string)=>{
     try{frame.contentWindow?.postMessage(JSON.stringify(payload),targetOrigin);}catch{}
   };
   const subscribe=()=>{
     if(isYouTube){
       send({event:"listening",id:source?.id},"https://www.youtube-nocookie.com");
       send({event:"command",func:"addEventListener",args:["onStateChange"]},"https://www.youtube-nocookie.com");
     }
   };
   const handleProviderMessage=(event:MessageEvent)=>{
     if(event.source!==frame.contentWindow)return;
     let data:any=event.data;
     if(typeof data==="string"){try{data=JSON.parse(data)}catch{return}}
     if(!data||typeof data!=="object")return;
     if(isYouTube&&event.origin==="https://www.youtube-nocookie.com"&&data.event==="onStateChange"){
       const state=Number(data.info);
       if(state===1)handlePlaybackStart();
       else if(state===2||state===0)handlePlaybackPause();
     }

   };
   window.addEventListener("message",handleProviderMessage);
   frame.addEventListener("load",subscribe);
   const retry=window.setTimeout(subscribe,900);
   return()=>{window.removeEventListener("message",handleProviderMessage);frame.removeEventListener("load",subscribe);window.clearTimeout(retry);};
 },[player,source?.id]);

 
 useEffect(()=>{
   if(!isVimeoPlayer||!iframeRef.current)return;
   let disposed=false;
   let sdk:VimeoSdkPlayer|null=null;
   let script=document.querySelector<HTMLScriptElement>('script[data-playverse-vimeo-sdk]');
   const onPlay=()=>{if(disposed)return;setVimeoPlaying(true);setVimeoBuffering(false);handlePlaybackStart();};
   const onPause=()=>{if(disposed)return;setVimeoPlaying(false);handlePlaybackPause();};
   const onEnded=()=>{if(disposed)return;setVimeoPlaying(false);handlePlaybackPause();};
   const onTime=(data:{seconds:number;duration:number;percent:number})=>{if(disposed)return;setVimeoCurrentTime(data.seconds||0);setVimeoDuration(data.duration||0);setProgress(data.percent?data.percent*100:0);};
   const onProgress=()=>{if(!disposed)setVimeoBuffering(false);};
   const onBufferStart=()=>{if(!disposed)setVimeoBuffering(true);};
   const onVolume=(data:{volume:number})=>{if(!disposed){setVimeoVolume(data.volume);setVimeoMuted(data.volume===0);}};
   const initialize=()=>{
     if(disposed||!iframeRef.current||!window.Vimeo?.Player)return;
     sdk=new window.Vimeo.Player(iframeRef.current);
     vimeoSdkRef.current=sdk;
     sdk.on("play",onPlay);sdk.on("pause",onPause);sdk.on("ended",onEnded);
     sdk.on("timeupdate",onTime);sdk.on("progress",onProgress);sdk.on("bufferstart",onBufferStart);
     sdk.on("bufferend",onProgress);sdk.on("volumechange",onVolume);
     sdk.ready().then(async()=>{try{if(!sdk)return;const [duration,volume,paused]=await Promise.all([sdk.getDuration(),sdk.getVolume(),sdk.getPaused()]);if(!disposed){setVimeoDuration(duration);setVimeoVolume(volume);setVimeoMuted(volume===0);setVimeoPlaying(!paused);}}catch{}});
   };
   if(window.Vimeo?.Player)initialize();
   else{
     if(!script){script=document.createElement("script");script.src="https://player.vimeo.com/api/player.js";script.async=true;script.dataset.playverseVimeoSdk="true";document.head.appendChild(script);}
     script.addEventListener("load",initialize);
   }
   return()=>{disposed=true;if(script)script.removeEventListener("load",initialize);if(sdk){sdk.off("play",onPlay);sdk.off("pause",onPause);sdk.off("ended",onEnded);sdk.off("timeupdate",onTime);sdk.off("progress",onProgress);sdk.off("bufferstart",onBufferStart);sdk.off("bufferend",onProgress);sdk.off("volumechange",onVolume);if(vimeoSdkRef.current===sdk)vimeoSdkRef.current=null;sdk.destroy().catch(()=>{});}};
 },[isVimeoPlayer,source?.id]);

 const toggleVimeoPlayback=async()=>{const sdk=vimeoSdkRef.current;if(!sdk)return;try{if(await sdk.getPaused())await sdk.play();else await sdk.pause();}catch(error){console.warn("Vimeo playback command was blocked:",error);}};
 const seekVimeo=async(value:number)=>{const sdk=vimeoSdkRef.current;if(!sdk||!vimeoDuration)return;const seconds=Math.max(0,Math.min(vimeoDuration,(value/100)*vimeoDuration));setVimeoCurrentTime(seconds);setProgress(value);try{await sdk.setCurrentTime(seconds);}catch(error){console.warn("Vimeo seek failed:",error);}};
 const setVimeoVolumeLevel=async(value:number)=>{const sdk=vimeoSdkRef.current;if(!sdk)return;setVimeoVolume(value);setVimeoMuted(value===0);try{await sdk.setVolume(value);}catch{}};
 const toggleVimeoMute=()=>void setVimeoVolumeLevel(vimeoMuted?Math.max(.5,vimeoVolume||1):0);
 const formatPlayerTime=(value:number)=>{if(!Number.isFinite(value))return "0:00";const seconds=Math.floor(value);return `${Math.floor(seconds/60)}:${String(seconds%60).padStart(2,"0")}`;};

 useEffect(()=>{
   // Start the inactivity countdown as soon as the player is mounted.
   scheduleOverlayHide();
   const handleGlobalPointerActivity=(event:PointerEvent)=>{
     const root=playerRef.current;
     if(!root)return;
     const rect=root.getBoundingClientRect();
     const inside=event.target instanceof Node&&root.contains(event.target);
     const insideByPosition=event.clientX>=rect.left&&event.clientX<=rect.right&&event.clientY>=rect.top&&event.clientY<=rect.bottom;
     if(inside||insideByPosition)revealOverlay();
   };
   const handleFullscreenChange=()=>revealOverlay();
   document.addEventListener("pointermove",handleGlobalPointerActivity,{passive:true});
   document.addEventListener("pointerdown",handleGlobalPointerActivity,{passive:true});
   document.addEventListener("fullscreenchange",handleFullscreenChange);
   return()=>{
     document.removeEventListener("pointermove",handleGlobalPointerActivity);
     document.removeEventListener("pointerdown",handleGlobalPointerActivity);
     document.removeEventListener("fullscreenchange",handleFullscreenChange);
     clearOverlayTimer();
   };
 },[]);


 useEffect(()=>{
   if(player?.kind!=="hls"||!videoRef.current)return;
   const video=videoRef.current;
   if(Hls.isSupported()){
     const hls=new Hls();hls.loadSource(player.src);hls.attachMedia(video);
     hls.on(Hls.Events.ERROR,(_event,data)=>{if(data.fatal)setFailed(true)});
     return ()=>hls.destroy();
   }
   if(video.canPlayType("application/vnd.apple.mpegurl"))video.src=player.src;
   else setFailed(true);
 },[player]);
 return <section className="pv-player-layout" aria-label="PlayVerse media player">
  <div className={`pv-player-shell${theatre?" pv-theatre":""}`} ref={playerRef} onPointerMove={revealOverlay} onPointerEnter={revealOverlay}>
   <div className={`pv-player-stage ${isPortraitSource?"pv-portrait":"pv-landscape"}`}>
    {!source?<div className="pv-player-empty"><AlertCircle/><strong>No playback source</strong><p>This title has not been given a playable source yet.</p></div>:
     player?.kind==="dailymotion"?<DailymotionPlayer playerId={player.playerId} videoId={player.videoId} playlistId={player.playlistId} onPlayerReady={handleDailymotionReady} onPlayerState={handleDailymotionState}/>:
     player?.kind==="iframe"?<div className="pv-provider-stage">
       <iframe ref={iframeRef} key={source.id} src={socialProvider.includes("facebook")?(facebookEmbed?.src||player.src):player.src} title={title} allow="autoplay; encrypted-media; picture-in-picture; fullscreen; web-share" allowFullScreen referrerPolicy="strict-origin-when-cross-origin"/>
       {(/youtube/i.test(source?.provider||"")||/youtube\.com\/embed/i.test(player.src))&&<div className="playverse-provider-title-shield" aria-hidden="true"/>}
       {isVimeoPlayer&&<div className="playverse-vimeo-surface" onPointerMove={revealOverlay} onPointerEnter={revealOverlay} onClick={()=>void toggleVimeoPlayback()} aria-label="Tap to play or pause" role="button" tabIndex={0} onKeyDown={event=>{if(event.key===" "||event.key==="Enter"){event.preventDefault();void toggleVimeoPlayback();}}}/>}
      </div>:
     player?.kind==="video"?<video className="pv-native-video" ref={directVideoRef} key={source.id} src={player.src} playsInline preload="metadata" poster={poster} onClick={toggleDirectPlayback} onTimeUpdate={event=>syncDirectTime(event.currentTarget)} onLoadedMetadata={event=>syncDirectTime(event.currentTarget)} onPlay={handlePlaybackStart} onPause={handlePlaybackPause} onError={()=>setFailed(true)}/>:
     player?.kind==="hls"?<video className="pv-native-video" ref={videoRef} playsInline preload="metadata" poster={poster} onClick={toggleDirectPlayback} onTimeUpdate={event=>syncDirectTime(event.currentTarget)} onLoadedMetadata={event=>syncDirectTime(event.currentTarget)} onPlay={handlePlaybackStart} onPause={handlePlaybackPause} onError={()=>setFailed(true)}/>:
     <div className="pv-player-empty"><AlertCircle/><strong>Can't play this source here</strong><p>It may be private, unavailable, or block embedded playback. Try another source if one is available.</p></div>}
    {captions.length>0&&(player?.kind==="video"||player?.kind==="hls")&&<div className={`playverse-caption-overlay caption-${captionSize}`}>{captionsEnabled?captionCue:""}</div>}
    {captions.length>0&&(player?.kind==="video"||player?.kind==="hls")&&<div className="pv-caption-action"><button type="button" onClick={()=>{setCaptionsEnabled(v=>!v);setShowCaptionMenu(v=>!v)}} aria-label="Captions">CC</button>{showCaptionMenu&&<div className="playverse-caption-menu"><strong>Captions</strong><label>Language<select value={captionTrackId} onChange={e=>{setCaptionTrackId(e.target.value);setCaptionsEnabled(Boolean(e.target.value));}}><option value="">Off</option>{captions.map(c=><option key={c.id} value={c.id}>{c.label}</option>)}</select></label><label>Size<select value={captionSize} onChange={e=>setCaptionSize(e.target.value)}><option value="small">Small</option><option value="medium">Medium</option><option value="large">Large</option></select></label></div>}</div>}
    <div className={`pv-player-controls ${overlayVisible?"pv-controls-visible":"pv-controls-hidden"}`} onPointerEnter={revealOverlay} onPointerMove={revealOverlay}>
     {(player?.kind==="video"||player?.kind==="hls"||isVimeoPlayer||isDailymotionPlayer)&&<div className="pv-progress-row">
      <span>{formatPlayerTime(isVimeoPlayer?vimeoCurrentTime:isDailymotionPlayer?dmCurrentTime:(directVideoRef.current||videoRef.current)?.currentTime||0)}</span>
      <input aria-label="Video progress" type="range" min="0" max="100" step="0.1" value={isVimeoPlayer?(vimeoDuration?100*vimeoCurrentTime/vimeoDuration:0):isDailymotionPlayer?(dmDuration?100*dmCurrentTime/dmDuration:0):progress} onChange={e=>isVimeoPlayer?void seekVimeo(Number(e.target.value)):isDailymotionPlayer?seekDailymotion(Number(e.target.value)):seekDirect(Number(e.target.value))}/>
      <span>{formatPlayerTime(isVimeoPlayer?vimeoDuration:isDailymotionPlayer?dmDuration:duration)}</span>
     </div>}
     <div className="pv-control-row">
      <div className="pv-control-group">
       {(player?.kind==="video"||player?.kind==="hls"||isVimeoPlayer||isDailymotionPlayer||isYouTubePlayer)&&<button type="button" className="pv-play-button" onClick={()=>isYouTubePlayer?toggleYouTubePlayback():isVimeoPlayer?void toggleVimeoPlayback():isDailymotionPlayer?toggleDailymotionPlayback():toggleDirectPlayback()} aria-label="Play or pause">{(isYouTubePlayer?youtubePlaying:isVimeoPlayer?vimeoPlaying:isDailymotionPlayer?dmPlaying:!((directVideoRef.current||videoRef.current)?.paused??true))?"Ⅱ":"▶"}</button>}
        {(player?.kind==="video"||player?.kind==="hls"||isVimeoPlayer||isDailymotionPlayer||isYouTubePlayer)&&<button type="button" className="pv-icon-button" aria-label="Mute or unmute" onClick={()=>{if(isYouTubePlayer)toggleYouTubeMute();else if(isVimeoPlayer){toggleVimeoMute();}else if(isDailymotionPlayer){setDailymotionVolume(dmMuted?Math.max(.6,dmVolume):0);}else{const v=directVideoRef.current||videoRef.current;if(v){v.muted=!v.muted;}}}}>{(isYouTubePlayer?youtubeMuted:isVimeoPlayer?vimeoMuted:isDailymotionPlayer?dmMuted:((directVideoRef.current||videoRef.current)?.muted??false))?"Mute":"Sound"}</button>}
       {(player?.kind==="video"||player?.kind==="hls"||isVimeoPlayer||isDailymotionPlayer||isYouTubePlayer)&&<label className="pv-volume"><input aria-label="Volume" type="range" min="0" max={isYouTubePlayer?100:1} step={isYouTubePlayer?1:.05} value={isYouTubePlayer?youtubeVolume:isVimeoPlayer?(vimeoMuted?0:vimeoVolume):isDailymotionPlayer?(dmMuted?0:dmVolume):((directVideoRef.current||videoRef.current)?.volume??1)} onChange={e=>{const n=Number(e.target.value);if(isYouTubePlayer)setYouTubeVolume(n);else if(isVimeoPlayer)void setVimeoVolumeLevel(n);else if(isDailymotionPlayer)setDailymotionVolume(n);else{const v=directVideoRef.current||videoRef.current;if(v){v.volume=n;v.muted=n===0;}}}}/></label>}
      </div>
      <div className="pv-control-group">
       {(player?.kind==="video"||player?.kind==="hls"||isVimeoPlayer||isDailymotionPlayer)&&<label className="pv-speed">Speed<select value={isVimeoPlayer?vimeoRate:isDailymotionPlayer?dmRate:speed} onChange={e=>{const n=Number(e.target.value);if(isVimeoPlayer){setVimeoRate(n);void vimeoSdkRef.current?.setPlaybackRate(n).catch(()=>setVimeoRate(1));}else if(isDailymotionPlayer)setDailymotionSpeed(n);else setPlaybackSpeed(String(n));}}><option value=".5">0.5×</option><option value=".75">0.75×</option><option value="1">1×</option><option value="1.25">1.25×</option><option value="1.5">1.5×</option><option value="2">2×</option></select></label>}
       <button type="button" className="pv-frame-button" onClick={()=>setAspectOverride(isPortraitSource?"16:9":"9:16")} aria-label="Switch frame shape">{isPortraitSource?"9:16":"16:9"}</button>
       {seriesEntries.length>0&&<div className="pv-episode-wrap"><button type="button" className="pv-icon-button" onClick={()=>setShowSeries(v=>!v)} aria-expanded={showSeries} aria-label="Episodes or playlist"><ListVideo size={18}/></button>{showSeries&&<div className="pv-episode-popover"><strong>{seriesTitle||listTitle||"Up next"}</strong>{seriesEntries.map(entry=><Link key={entry.id} href={`/watch/${entry.id}`}>{entry.title}<small>{entry.kind}</small></Link>)}</div>}</div>}
       {previousHref&&<Link className="pv-icon-button" href={previousHref} aria-label="Previous episode"><ChevronLeft size={18}/></Link>}
       {nextHref&&<Link className="pv-next-button" href={nextHref}>Next <ChevronRight size={16}/></Link>}
       {seriesHref&&<Link className="pv-icon-button" href={seriesHref} aria-label="Series details"><ArrowUpLeft size={18}/></Link>}
       <button type="button" className={`pv-icon-button${theatre?" active":""}`} onClick={toggleTheatre} aria-label="Theatre mode"><Theater size={18}/></button>
       <button type="button" className="pv-icon-button" onClick={openFullscreen} aria-label="Fullscreen"><Maximize2 size={18}/></button>
       <button type="button" className="pv-icon-button" onClick={async()=>{try{if(navigator.share)await navigator.share({title,url:window.location.href});else await navigator.clipboard.writeText(window.location.href);}catch{}}} aria-label="Share video"><Share2 size={18}/></button>
      </div>
     </div>
    </div>
   </div>
   {sources.length>1&&<div className="pv-source-switcher" aria-label="Available playback sources"><span>PLAYING FROM</span>{sources.map((s,i)=><button type="button" key={s.id} className={i===active?"selected":""} onClick={()=>{setActive(i);setFailed(false);setAspectOverride(null);}}>{s.label||s.provider||`Source ${i+1}`}</button>)}</div>}
   {failed&&<p className="pv-player-notice">Playback couldn't start. Please choose another available source.</p>}
  </div>
  </section>;
}
