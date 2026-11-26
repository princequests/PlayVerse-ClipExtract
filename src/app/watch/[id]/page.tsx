import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ArrowLeft } from "lucide-react";
import WatchPlayer from "./watch-player";
import ThemeToggle from "./theme-toggle";
import PlaylistRefresh from "./playlist-refresh";
import Community from "./community";
import ViewTracker from "@/components/view-tracker";

export default async function WatchPage({params}:{params:Promise<{id:string}>}) {
  const {id}=await params;
  const item=await prisma.content.findUnique({where:{id},include:{
    sources:{orderBy:[{isPrimary:"desc"},{createdAt:"asc"}]},
    captions:{orderBy:[{isDefault:"desc"},{createdAt:"asc"}]},
    children:{where:{status:"Published"},include:{sources:true},orderBy:[{sortOrder:"asc"},{createdAt:"asc"}]},
    parent:{include:{parent:{include:{children:{where:{status:"Published"},orderBy:[{sortOrder:"asc"},{createdAt:"asc"}]}}},children:{where:{status:"Published"},orderBy:[{sortOrder:"asc"},{createdAt:"asc"}]}}}
  }});
  if(!item||item.status!=="Published") notFound();
  const sources=item.sources.map(s=>({id:s.id,url:s.url,provider:s.provider,label:s.label,isPrimary:s.isPrimary}));
  const isContainer=["Series","Season","Album","Playlist","Channel","Podcast","Collection","Manga"].includes(item.kind);
  // Build in-player navigation for both episodic series and ordered playlists.
  const isPlaylistChild = item.parent?.kind === "Playlist";
  const seriesOwner = item.kind === "Series" ? item : item.kind === "Season" ? item.parent : item.parent?.kind === "Series" ? item.parent : null;
  const seriesEntriesRaw = isPlaylistChild
    ? [...(item.parent?.children ?? [])].reverse()
    : item.kind === "Episode"
      ? (item.parent?.children ?? [])
      : item.kind === "Season" || item.kind === "Series"
        ? item.children
        : seriesOwner?.children ?? [];
  const isPlayablePlaylistEntry = (entry: (typeof seriesEntriesRaw)[number]) =>
    !["Series","Season","Album","Playlist","Channel","Podcast","Collection","Manga"].includes(entry.kind);
  const sequenceFilter = isPlaylistChild
    ? isPlayablePlaylistEntry
    : (entry: (typeof seriesEntriesRaw)[number]) => ["Episode","Season"].includes(entry.kind);
  const episodeSequence = seriesEntriesRaw.filter(sequenceFilter).map(entry => ({id:entry.id,title:entry.title,kind:entry.kind}));
  const seriesEntries = isPlaylistChild ? episodeSequence : episodeSequence.filter(entry => entry.id !== item.id);
  // Resolve the actual Series root (Series > Season > Episode). Never send
  // "Back to series" to the homepage, a playlist, or the current Series page.
  const seriesRoot = item.kind === "Series"
    ? item
    : item.kind === "Season"
      ? (item.parent?.kind === "Series" ? item.parent : null)
      : item.parent?.kind === "Series"
        ? item.parent
        : item.parent?.parent?.kind === "Series"
          ? item.parent.parent
          : null;
  const currentPosition = episodeSequence.findIndex(entry => entry.id === item.id);
  const previousHref = currentPosition > 0 ? `/watch/${episodeSequence[currentPosition-1].id}` : undefined;
  const nextHref = currentPosition >= 0 && currentPosition < episodeSequence.length-1 ? `/watch/${episodeSequence[currentPosition+1].id}` : undefined;
  const seriesHref = !isPlaylistChild && seriesRoot && seriesRoot.id !== item.id ? `/watch/${seriesRoot.id}` : undefined;
  const listTitle = isPlaylistChild ? item.parent?.title : seriesRoot?.title;
  const captions = item.captions.map(c=>({id:c.id,language:c.language,label:c.label,isDefault:c.isDefault,contentText:c.contentText}));
  // A playlist's sibling videos are rendered beneath the description on every playlist item page.
  const playlistEntries = isPlaylistChild ? [...(item.parent?.children ?? [])].reverse() : item.kind === "Playlist" ? [...item.children].reverse() : [];
  const displayEntries = isPlaylistChild ? playlistEntries : item.children;
  const displayHeading = isPlaylistChild ? `More videos in ${item.parent?.title ?? "this playlist"}` : item.kind === "Playlist" ? "Videos in this playlist" : item.kind === "Series" || item.kind === "Season" ? "Episodes" : "Related content";
  const playerProps = {sources,title:item.title,poster:item.imageUrl,contentKind:item.kind,captions,seriesEntries,previousHref,nextHref,seriesHref,seriesTitle:listTitle,listTitle:isPlaylistChild ? "Playlist" : "Episodes"};

  return <main className="watch-shell">
    <ViewTracker contentId={item.id}/>
    <div className="watch-top"><Link href="/" className="brand"><span className="brand-mark">P</span><span>play<span>verse</span></span></Link><div className="watch-top-actions"><ThemeToggle/><Link href="/" className="secondary-button"><ArrowLeft size={15}/> Back to discover</Link></div></div>
    {!isContainer&&<WatchPlayer {...playerProps}/>}
    {isContainer&&sources.length>0&&<WatchPlayer {...playerProps}/>}
    <section className="watch-details"><div className="eyebrow">{item.category} · {item.kind} {item.year?`· ${item.year}`:""}</div><h1>{item.title}</h1><p>{item.description}</p>
      {(isContainer || isPlaylistChild) && <div className="playlist-section-heading"><h2 style={{fontFamily:"Manrope",marginTop:34}}>{displayHeading}</h2>{(item.kind==="Playlist"||isPlaylistChild)&&<PlaylistRefresh/>}</div>}
      {displayEntries.length>0?<div className={isPlaylistChild || item.kind === "Playlist" ? "playlist-video-list" : "episode-list"}>{displayEntries.map((child,index)=>{
        const playlistCard=isPlaylistChild || item.kind==="Playlist";
        return <Link className={playlistCard?"playlist-video-card":"episode-row"} key={child.id} href={`/watch/${child.id}`} aria-current={child.id===item.id?"page":undefined}>
          {playlistCard ? <>
            <span className="playlist-video-thumb">
              {child.imageUrl ? <img src={child.imageUrl} alt="" loading="lazy"/> : <span className="playlist-thumb-fallback">▶</span>}
              <span className="playlist-video-number">{String(index+1).padStart(2,"0")}</span>
              <span className="playlist-thumb-play">▶</span>
            </span>
            <span className="playlist-video-info"><b>{child.title}</b><small>{child.kind} <span>·</span> {child.category}</small></span>
            <span className="playlist-video-action">{child.id===item.id?"Now playing":<><span>Play</span><span aria-hidden="true">→</span></>}</span>
          </> : <>
            <span className="episode-number">{String(index+1).padStart(2,"0")}</span>
            <span className="episode-copy"><b>{child.title}</b><small>{child.kind} · {child.category}</small></span>
            <span className="episode-play">{child.id===item.id?"Now playing":"Play →"}</span>
          </>}
        </Link>;
      })}</div>: (isContainer || isPlaylistChild)?<p className="player-error">No published videos have been added to this playlist yet. Add videos to this playlist in Studio.</p>:null}
    </section>
    <div className="watch-community-wrap"><Community contentId={item.id}/></div>
  </main>;
}
