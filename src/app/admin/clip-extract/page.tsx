 "use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeft, Download, ExternalLink, Film, Link2, ScanSearch } from "lucide-react";

type VideoSource = { url: string; filename: string; source: string; format: string };
type StudioEntry = {id:string;title:string;kind:string;category:string;status:string;sources?:Array<{url:string;provider:string;label:string;isPrimary:boolean;playbackMode:string}>};
const importKinds=["News video","Episode","Short video","Film","Documentary","Music video","External link"];
export default function ExtractPage() {
  const [url,setUrl] = useState("");
  const [loading,setLoading] = useState(false);
  const [error,setError] = useState("");
  const [message,setMessage] = useState("");
  const [title,setTitle] = useState("");
  const [videos,setVideos] = useState<VideoSource[]>([]);
  const [importKind,setImportKind] = useState("News video");
  const [selectedEntry,setSelectedEntry] = useState("");
  const [entries,setEntries] = useState<StudioEntry[]>([]);
  useEffect(()=>{
    let active=true;
    fetch("/api/content").then(r=>r.ok?r.json():[]).then(data=>{if(active&&Array.isArray(data))setEntries(data)}).catch(()=>{});
    return ()=>{active=false};
  },[]);
  const [notes,setNotes] = useState<string[]>([]);
  async function extract(e: React.FormEvent) {
    e.preventDefault(); setLoading(true); setError(""); setMessage(""); setVideos([]);
    try {
      const res = await fetch("/api/extract",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({url:url.trim()})});
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not scan this page.");
      setTitle(data.title || data.page); setVideos(data.videos || []); setNotes(data.notes || []);
      setMessage(data.videos?.length ? `Scan complete — ${data.videos.length} possible video source(s) found.` : "Scan complete — no direct video files found.");
    } catch (err) { setError(err instanceof Error ? err.message : "Extraction failed."); }
    finally { setLoading(false); }
  }
  const importHref=(v:VideoSource,existingId="")=>{
    const params=new URLSearchParams({source:v.url,importTitle:v.filename.replace(/\.[^.]+$/, ""),kind:importKind});
    if(existingId)params.set("edit",existingId);
    return `/admin?${params.toString()}`;
  };
  return <main className="extract-page">
    <header className="extract-top"><Link href="/admin" className="extract-back"><ArrowLeft size={17}/> Back to Studio</Link><div className="extract-brand"><span><Film size={21}/></span><div><b>PlayVerse</b><small>CLIP EXTRACT</small></div></div></header>
    <section className="extract-hero"><div className="extract-eyebrow"><ScanSearch size={14}/> VIDEO SOURCE DISCOVERY</div><h1>Find videos on<br/><em>webpages.</em></h1><p>Studio utility: scan public pages to find candidate media links, then send a selected source into a draft, episode, short or news entry.</p>
      <form className="extract-form" onSubmit={extract}><div className="extract-input"><Link2 size={19}/><input type="url" required maxLength={2048} placeholder="Paste webpage URL…" value={url} onChange={e=>setUrl(e.target.value)} /></div><button disabled={loading} type="submit">{loading?"Scanning…":"Extract videos"} <ScanSearch size={16}/></button></form>
      <div className="extract-note">Studio-only editorial tool · Public webpages only · No file upload</div>
      <div className="extract-import-config"><label>Import as<select value={importKind} onChange={e=>setImportKind(e.target.value)}>{importKinds.map(k=><option key={k}>{k}</option>)}</select></label><label>Attach to existing content (optional)<select value={selectedEntry} onChange={e=>setSelectedEntry(e.target.value)}><option value="">Create a new draft</option>{entries.map(entry=><option key={entry.id} value={entry.id}>{entry.title} · {entry.kind} · {entry.status}</option>)}</select></label><p>Choose Episode for a series item, Short video for a short, or News video for a news clip. Existing content keeps its metadata; the selected source is added for review.</p></div>
    </section>
    {(message || error) && <section className={`extract-status${error?" is-error":""}`} role="status">{error || message}</section>}
    {videos.length>0 && <section className="extract-results"><div className="extract-result-heading"><div><span className="extract-eyebrow">SCAN RESULTS</span><h2>{title}</h2></div><span>{videos.length} found</span></div>
      {videos.map((v,i)=><article className="extract-video" key={`${v.url}-${i}`}><div className="extract-file-icon"><Film size={21}/></div><div className="extract-file-detail"><b>{v.filename}</b><small>{v.format} · {v.source}</small><a href={v.url} target="_blank" rel="noopener noreferrer" className="extract-url">{v.url}</a></div><div className="extract-actions"><a className="extract-import" href={importHref(v,selectedEntry)}><Link2 size={15}/> {selectedEntry?"Attach to entry":"Use in new draft"}</a><a href={v.url} target="_blank" rel="noopener noreferrer"><ExternalLink size={15}/> Open</a><a href={v.url} download=""><Download size={15}/> Save</a></div></article>)}
      {notes.map(n=><p className="extract-footnote" key={n}>{n}</p>)}
    </section>}
    {!videos.length && message && <section className="extract-results"><div className="extract-empty"><Film size={25}/><b>No direct media links detected</b><p>Some platforms render their players with JavaScript or use streaming/DRM formats that this scanner does not extract.</p></div>{notes.map(n=><p className="extract-footnote" key={n}>{n}</p>)}</section>}
    <section className="extract-features"><article><ScanSearch/><b>Source detection</b><p>Checks common video tags, metadata and direct media URLs.</p></article><article><Download/><b>Open or save</b><p>Use detected links to open the media or try saving it.</p></article><article><Link2/><b>Safety first</b><p>Scans public HTTP/HTTPS pages and blocks private network targets.</p></article></section>
    <footer className="extract-footer">PlayVerse Studio · ClipExtract is an editorial import utility. Only access and use content you are authorized to use.</footer>
    <style jsx global>{`
      .extract-page{min-height:100vh;background:#080b12;color:#f4f5fa;padding:0 24px 50px;font-family:Inter,system-ui,-apple-system,Segoe UI,sans-serif}
      .extract-top{max-width:1120px;margin:auto;padding:26px 0;display:flex;justify-content:space-between;align-items:center;gap:20px}
      .extract-back{display:inline-flex;align-items:center;gap:8px;color:#aeb4c4;text-decoration:none;font-size:14px}.extract-back:hover{color:white}
      .extract-brand{display:flex;align-items:center;gap:10px}.extract-brand>span{width:42px;height:42px;border-radius:13px;background:linear-gradient(135deg,#7858f6,#ad83ff);display:grid;place-items:center}.extract-brand b{font-size:17px;display:block}.extract-brand small{font-size:10px;color:#a5a9b9;letter-spacing:1.3px}
      .extract-hero{max-width:840px;margin:76px auto 0;text-align:center}.extract-eyebrow{color:#a88aff;letter-spacing:1.6px;font-size:11px;font-weight:800;display:inline-flex;align-items:center;gap:8px}
      .extract-hero h1{font-size:clamp(42px,7vw,72px);letter-spacing:-3px;line-height:1.03;margin:20px 0 16px}.extract-hero h1 em{font-style:normal;color:#a88aff}.extract-hero>p{max-width:580px;margin:0 auto;color:#aab0bf;font-size:17px;line-height:1.7}
      .extract-form{max-width:760px;margin:34px auto 0;padding:9px;background:#151925;border:1px solid #2c3242;border-radius:17px;display:flex;gap:8px}.extract-input{display:flex;align-items:center;gap:12px;padding:8px 14px;flex:1;min-width:0;color:#858da2}.extract-input input{background:transparent;border:0;outline:0;color:#f5f6fa;width:100%;font-size:15px;min-width:0}.extract-form button{border:0;border-radius:11px;background:#805df5;color:white;font-weight:750;padding:14px 20px;display:flex;align-items:center;gap:9px;cursor:pointer}.extract-form button:disabled{opacity:.65;cursor:wait}.extract-note{font-size:12px;color:#777f93;margin-top:14px}.extract-import-config{max-width:760px;margin:18px auto 0;padding:18px;text-align:left;background:#111722;border:1px solid #2c3242;border-radius:14px;display:grid;grid-template-columns:1fr 1fr;gap:12px}.extract-import-config label{display:grid;gap:7px;color:#aab0bf;font-size:12px;font-weight:700}.extract-import-config select{width:100%;min-width:0;padding:12px;border:1px solid #343c4d;border-radius:9px;background:#090e16;color:#f5f6fa}.extract-import-config p{grid-column:1/-1;color:#8f98ac;font-size:12px;line-height:1.6;margin:0}
      .extract-status,.extract-results{max-width:760px;margin:24px auto 0}.extract-status{border:1px solid #34394a;background:#151925;padding:14px 17px;border-radius:12px;color:#c1c6d4}.extract-status.is-error{border-color:#753c4b;color:#ffb7c1}
      .extract-result-heading{display:flex;align-items:flex-end;justify-content:space-between;gap:20px;margin-bottom:14px}.extract-result-heading h2{font-size:21px;margin:7px 0 0;overflow-wrap:anywhere}.extract-result-heading>span{color:#9da4b6;font-size:13px;white-space:nowrap}
      .extract-video{display:flex;align-items:center;gap:14px;background:#151925;border:1px solid #2c3242;border-radius:14px;padding:15px;margin:10px 0}.extract-file-icon{width:45px;height:45px;border-radius:12px;background:#28203f;color:#b69aff;display:grid;place-items:center;flex-shrink:0}.extract-file-detail{flex:1;min-width:0}.extract-file-detail b{display:block;overflow-wrap:anywhere}.extract-file-detail small{display:block;color:#9da4b6;font-size:12px;margin:4px 0}.extract-url{display:block;color:#8e9ab4;font-size:11px;overflow-wrap:anywhere;text-decoration:none}.extract-actions{display:flex;gap:7px}.extract-actions a{display:inline-flex;align-items:center;gap:6px;border:1px solid #45405f;color:#c4b3ff;text-decoration:none;border-radius:9px;padding:9px 11px;font-size:12px;font-weight:700;white-space:nowrap}.extract-actions a.extract-import{background:#7d5cf2;color:#fff;border-color:#7d5cf2}.extract-empty{text-align:center;border:1px solid #2c3242;background:#151925;border-radius:14px;padding:32px;color:#aab0bf}.extract-empty b{display:block;color:#f2f3f8;margin:10px 0}.extract-empty p{max-width:480px;margin:auto;font-size:13px;line-height:1.6}.extract-footnote{font-size:12px;color:#858da0;line-height:1.5}.extract-features{max-width:960px;margin:76px auto 0;display:grid;grid-template-columns:repeat(3,1fr);gap:14px}.extract-features article{border:1px solid #262d3c;background:#111620;border-radius:15px;padding:20px}.extract-features article>svg{color:#a88aff;width:21px;height:21px}.extract-features b{display:block;margin:11px 0 5px;font-size:14px}.extract-features p{color:#9da4b6;font-size:12px;line-height:1.6;margin:0}.extract-footer{text-align:center;color:#6f7789;font-size:11px;margin-top:42px}
      @media(max-width:640px){.extract-page{padding:0 16px 36px}.extract-top{padding:20px 0}.extract-hero{margin-top:45px}.extract-hero h1{letter-spacing:-1.7px}.extract-form{flex-direction:column}.extract-form button{justify-content:center}.extract-import-config{grid-template-columns:1fr}.extract-video{align-items:flex-start;flex-wrap:wrap}.extract-file-detail{min-width:calc(100% - 65px)}.extract-actions{width:100%;padding-left:58px}.extract-features{grid-template-columns:1fr;margin-top:45px}.extract-result-heading{align-items:flex-start}}
    `}</style>
  </main>;
}
