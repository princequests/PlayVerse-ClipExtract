import { NextRequest, NextResponse } from "next/server";
import dns from "node:dns/promises";
import net from "node:net";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const blocked = new Set(["localhost", "localhost.localdomain"]);
function private4(ip: string) {
  const p = ip.split(".").map(Number);
  return p.length !== 4 || p.some(n => !Number.isInteger(n) || n < 0 || n > 255) ||
    p[0] === 10 || p[0] === 127 || p[0] === 0 ||
    (p[0] === 169 && p[1] === 254) ||
    (p[0] === 172 && p[1] >= 16 && p[1] <= 31) ||
    (p[0] === 192 && p[1] === 168) ||
    (p[0] === 100 && p[1] >= 64 && p[1] <= 127) || p[0] >= 224;
}
function private6(ip: string) {
  const s = ip.toLowerCase();
  return s === "::1" || s.startsWith("fc") || s.startsWith("fd") ||
    s.startsWith("fe80") || s.startsWith("::ffff:127.") ||
    s.startsWith("::ffff:10.") || s.startsWith("::ffff:192.168.");
}
async function publicUrl(raw: string) {
  let u: URL;
  try { u = new URL(raw); } catch { throw new Error("Enter a valid webpage URL."); }
  if (!["http:", "https:"].includes(u.protocol)) throw new Error("Only HTTP and HTTPS URLs are supported.");
  if (u.username || u.password) throw new Error("URLs containing credentials are not allowed.");
  const host = u.hostname.toLowerCase();
  if (blocked.has(host) || host.endsWith(".local") || host.endsWith(".internal"))
    throw new Error("That hostname is not allowed.");
  if (net.isIP(host)) {
    if ((net.isIPv4(host) && private4(host)) || (net.isIPv6(host) && private6(host)))
      throw new Error("Private or reserved IP addresses are blocked.");
  } else {
    const records = await dns.lookup(host, { all: true });
    if (!records.length || records.some(r => net.isIPv4(r.address) ? private4(r.address) : private6(r.address)))
      throw new Error("This hostname resolves to a private or reserved address.");
  }
  return u;
}
const mediaExt = /\.(mp4|webm|mov|m4v|ogv|3gp)(?:$|[?#])/i;
function socialCandidate(url: URL) {
  const host=url.hostname.toLowerCase();
  let platform="", isVideo=false;
  if(host==="x.com"||host.endsWith(".x.com")||host==="twitter.com"||host.endsWith(".twitter.com")){platform="X";isVideo=/\/status\/\d+/.test(url.pathname);}
  else if(host==="tiktok.com"||host.endsWith(".tiktok.com")){platform="TikTok";isVideo=/\/video\/\d+/.test(url.pathname);}
  else if(host==="instagram.com"||host.endsWith(".instagram.com")){platform="Instagram";isVideo=/\/(?:reel|reels|p|tv)\/[A-Za-z0-9_-]+/.test(url.pathname);}
  else if(host==="facebook.com"||host.endsWith(".facebook.com")||host==="fb.watch"){platform="Facebook";isVideo=/\/(?:videos|watch|reel|reels|share)\//i.test(url.pathname)||host==="fb.watch";}
  if(!platform||!isVideo)return null;
  return {url:url.href,filename:`${platform} public video link`,source:`${platform} embed/source URL (not a downloaded file)`,format:platform.toUpperCase()};
}
function link(value: string, base: string) {
  try { const u = new URL(value, base); return ["http:", "https:"].includes(u.protocol) ? u.href : null; } catch { return null; }
}
function scan(html: string, page: string) {
  const found = new Map<string, {url:string;filename:string;source:string;format:string}>();
  const add = (raw: string, source: string) => {
    const url = link(raw, page); if (!url) return;
    const key = url.split("#")[0]; if (found.has(key)) return;
    let filename = key.split("/").pop() || "video-file";
    try { filename = decodeURIComponent(filename); } catch {}
    found.set(key, {url:key, filename, source, format:(key.match(/\.([a-z0-9]{2,5})(?:$|[?#])/i)?.[1] || "MEDIA").toUpperCase()});
  };
  const patterns = [
    /<video\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/gi,
    /<source\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/gi,
    /<meta\b[^>]*(?:property|name)=["'](?:og:video(?::url)?|twitter:player:stream)["'][^>]*content=["']([^"']+)["'][^>]*>/gi,
    /<meta\b[^>]*content=["']([^"']+)["'][^>]*(?:property|name)=["'](?:og:video(?::url)?|twitter:player:stream)["'][^>]*>/gi
  ];
  patterns.forEach((re,i) => { let m; while ((m=re.exec(html))) add(m[1], ["Video element","Source element","Video metadata","Video metadata"][i]); });
  const attrs = /(?:href|data-src|data-video|data-url)=["']([^"'<>]+)["']/gi;
  let m; while ((m=attrs.exec(html))) if (mediaExt.test(m[1])) add(m[1], "Media link");
  const raw = /https?:\\?\/\\?\/[^\s"'<>\\]+?\.(?:mp4|webm|mov|m4v|ogv)(?:\?[^\s"'<>\\]*)?/gi;
  while ((m=raw.exec(html))) add(m[0].replace(/\\/g,""), "Direct media URL");
  return [...found.values()];
}
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (typeof body?.url !== "string" || body.url.length > 2048)
      return NextResponse.json({error:"Please enter a URL (maximum 2,048 characters)."}, {status:400});
    const u = await publicUrl(body.url);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);
    let response: Response;
    try {
      response = await fetch(u.href, {signal:controller.signal, redirect:"manual",
        headers:{"User-Agent":"PlayVerse-ClipExtract/1.0","Accept":"text/html,application/xhtml+xml"}});
    } finally { clearTimeout(timeout); }
    if ([301,302,303,307,308].includes(response.status)) {
      const candidate=socialCandidate(u);
      if(candidate)return NextResponse.json({page:u.href,title:`${u.hostname} video`,videos:[candidate],notes:["This is a social-platform source link, not a downloaded media file. PlayVerse will use the platform's permitted embed/player when available.","If the post is private, removed, region-limited or blocks embedding, it may not play in PlayVerse."]});
      return NextResponse.json({error:"This page redirects. Please submit the final public URL directly."}, {status:422});
    }
    if (!response.ok) return NextResponse.json({error:`The page returned HTTP ${response.status}.`}, {status:422});
    const type = response.headers.get("content-type") || "";
    if (!type.includes("text/html") && !type.includes("application/xhtml+xml"))
      return NextResponse.json({error:"That URL does not appear to be an HTML webpage."}, {status:422});
    if (!response.body) throw new Error("The page returned no content.");
    const reader = response.body.getReader(); let total=0; const chunks: Uint8Array[]=[];
    while (true) {
      const {done,value}=await reader.read(); if (done) break;
      total += value.length;
      if (total > 2_000_000) { await reader.cancel(); throw new Error("Page is too large to scan (2 MB limit)."); }
      chunks.push(value);
    }
    const html = new TextDecoder().decode(Buffer.concat(chunks));
    const title = (html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || "").replace(/<[^>]+>/g,"").trim() || u.hostname;
    const videos=scan(html,u.href);
    const candidate=socialCandidate(u);
    if(candidate&&!videos.some(v=>v.url===candidate.url))videos.unshift(candidate);
    return NextResponse.json({page:u.href,title,videos,notes:[
      "This finds direct media links and common HTML video sources, and recognizes public social video links for embed-based review.",
      "A social link is a source reference, not a downloaded or PlayVerse-hosted video. Platform permissions, privacy and embed restrictions still apply.",
      "Streaming manifests, login-protected videos and DRM content may not be downloadable as single files."
    ]});
  } catch (e) {
    const message = e instanceof Error ? (e.name === "AbortError" ? "The page took too long to respond." : e.message) : "Extraction failed.";
    return NextResponse.json({error:message}, {status:400});
  }
}
