import { NextRequest, NextResponse } from "next/server";

function decode(value: string) {
  return value.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">");
}
function providerFor(host: string, url: string) {
  if (host === "youtu.be" || host.endsWith("youtube.com") || host.endsWith("youtube-nocookie.com")) return "YouTube";
  if (host === "vimeo.com" || host.endsWith("vimeo.com")) return "Vimeo";
  if (host === "dai.ly" || host.endsWith("dailymotion.com")) return "Dailymotion";
  if (host === "drive.google.com" || host === "docs.google.com") return "Google Drive";
  if (/\.(mp4|m3u8|webm)(\?|$)/i.test(url)) return "Direct video";
  return "External website";
}
function youtubeId(url: URL) { return url.hostname === "youtu.be" ? url.pathname.split("/").filter(Boolean)[0] : url.searchParams.get("v") || url.pathname.match(/\/(?:embed|shorts)\/([^/?]+)/)?.[1] || null; }
function xmlEntries(xml: string) {
  const entries = [...xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)].map((m) => m[1]);
  return entries.map((entry) => {
    const get = (tag: string) => decode(entry.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`))?.[1] || "").trim();
    const videoId = get("yt:videoId");
    return { title: get("title"), description: get("media:description"), imageUrl: videoId ? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg` : "", url: videoId ? `https://www.youtube.com/watch?v=${videoId}` : "", provider: "YouTube" };
  }).filter((x) => x.url && x.title);
}
async function fetchText(url: string) {
  const response = await fetch(url, { headers: { "User-Agent": "PlayVerse/1.0 (+metadata import)" }, signal: AbortSignal.timeout(8000), cache: "no-store" });
  if (!response.ok) throw new Error(`Provider returned ${response.status}`);
  return response.text();
}
export async function POST(request: NextRequest) {
  try {
    const { url: raw } = await request.json();
    if (typeof raw !== "string") return NextResponse.json({ error: "Paste a valid source URL." }, { status: 400 });
    const url = new URL(raw.trim());
    if (!["http:", "https:"].includes(url.protocol)) throw new Error("Only HTTP and HTTPS links are supported.");
    const host = url.hostname.toLowerCase();
    const provider = providerFor(host, url.toString());
    const result: any = { provider, title: "", description: "", imageUrl: "", kind: "Film", category: "Movies", isPlaylist: false, items: [], notes: [] };

    if (provider === "YouTube") {
      const listId = url.searchParams.get("list");
      if (listId) {
        result.kind = "Playlist"; result.category = "Collections"; result.isPlaylist = true;
        result.title = "YouTube playlist"; result.description = "Imported from a public YouTube playlist.";
        try {
          const xml = await fetchText(`https://www.youtube.com/feeds/videos.xml?playlist_id=${encodeURIComponent(listId)}`);
          result.items = xmlEntries(xml);
          const feedTitle = decode(xml.match(/<feed[\s\S]*?<title[^>]*>([\s\S]*?)<\/title>/)?.[1] || "").trim();
          if (feedTitle) result.title = feedTitle;
          if (result.items.length) { result.title = result.title || "YouTube playlist"; result.notes.push(`Found ${result.items.length} recent playlist videos. YouTube's public feed may not expose the full playlist.`); }
          else result.notes.push("The playlist feed did not return public videos. It may be private, restricted, or unavailable.");
        } catch { result.notes.push("Could not read the public playlist feed. Check that the playlist is public."); }
        result.imageUrl = result.items[0]?.imageUrl || "";
      } else {
        const id = youtubeId(url);
        if (id) result.imageUrl = `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
        try {
          const data = await fetchText(`https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(url.toString())}`);
          const o = JSON.parse(data); result.title = o.title || ""; result.imageUrl = o.thumbnail_url || result.imageUrl;
          result.description = `YouTube video by ${o.author_name || "the channel owner"}.`;
          result.category = "Movies"; result.kind = "Film";
        } catch { result.notes.push("YouTube did not expose metadata for this link. You can still save it and enter the details manually."); }
      }
    } else if (provider === "Vimeo" || provider === "Dailymotion") {
      try {
        const data = await fetchText((provider === "Vimeo" ? `https://vimeo.com/api/oembed.json?url=${encodeURIComponent(url.toString())}` : `https://www.dailymotion.com/services/oembed?url=${encodeURIComponent(url.toString())}&format=json`));
        const o = JSON.parse(data); result.title = o.title || ""; result.description = o.author_name ? `Video by ${o.author_name}.` : ""; result.imageUrl = o.thumbnail_url || "";
      } catch { result.notes.push(`${provider} did not return public metadata for this link. The source can still be saved manually.`); }
      result.kind = "Film"; result.category = "Movies";
      if (provider === "Dailymotion" && /\/playlist\//i.test(url.pathname)) {
        result.kind = "Playlist"; result.category = "Collections"; result.isPlaylist = true;
        const playlistId = url.pathname.match(/\/playlist\/([^/]+)/i)?.[1];
        if (playlistId) {
          // Try Dailymotion's public API first, then the public playlist page's
          // embedded state. Some playlists expose metadata in the page even
          // when the unauthenticated API response is unavailable.
          let apiError = "";
          try {
            const apiText = await fetchText(`https://api.dailymotion.com/playlist/${encodeURIComponent(playlistId)}/videos?fields=id,title,description,thumbnail_720_url,url&limit=100`);
            const data = JSON.parse(apiText);
            result.items = (data.list || []).map((v: any) => ({ title: v.title || "Dailymotion video", description: v.description || "", imageUrl: v.thumbnail_720_url || "", url: v.url || `https://www.dailymotion.com/video/${v.id}`, provider: "Dailymotion" }));
          } catch (error) { apiError = error instanceof Error ? error.message : "Public API unavailable"; }
          try {
            const html = await fetchText(`https://www.dailymotion.com/playlist/${encodeURIComponent(playlistId)}`);
            const title = html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)/i)?.[1]
              || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:title["']/i)?.[1];
            if (title) result.title = decode(title);
            if (!result.items.length) {
              const ids = [...new Set([...html.matchAll(/(?:dailymotion\.com\/(?:video|embed\/video)\/|"videoId"\s*:\s*")([a-zA-Z0-9]+)/g)].map(m => m[1]))];
              result.items = ids.map((id) => ({ title: `Dailymotion video ${id}`, description: "", imageUrl: `https://www.dailymotion.com/thumbnail/video/${id}`, url: `https://www.dailymotion.com/video/${id}`, provider: "Dailymotion" }));
            }
          } catch { /* API results remain usable if the page is not readable. */ }
          if (!result.title) result.title = "Dailymotion playlist";
          if (result.items.length) result.notes.push(`Found ${result.items.length} playlist videos. Review the imported titles in Studio before publishing.`);
          else result.notes.push(`Dailymotion identified this playlist, but did not expose its video list publicly${apiError ? ` (${apiError})` : ""}. Add its videos manually or configure Dailymotion API access with playlist.read permission.`);
        }
      }
      if (provider === "Vimeo" && /\/(showcase|album)\//i.test(url.pathname)) { result.kind = "Playlist"; result.category = "Collections"; result.isPlaylist = true; result.notes.push("Vimeo showcase detected. Importing all showcase videos requires a Vimeo API token; add the showcase link as a collection source for now."); }
    } else if (provider === "Google Drive") {
      const id = url.pathname.match(/\/file\/d\/([^/]+)/)?.[1] || url.searchParams.get("id");
      if (/\/folders\//.test(url.pathname)) {
        result.kind = "Playlist"; result.category = "Collections"; result.isPlaylist = true; result.title = "Google Drive folder";
        result.notes.push("Google Drive folder detected. Listing its files requires Google Drive API access; share the folder publicly or configure an API connection to import its contents.");
      } else {
        result.kind = "Film"; result.category = "Movies"; result.title = "Google Drive video";
        if (id) { result.imageUrl = `https://drive.google.com/thumbnail?id=${encodeURIComponent(id)}&sz=w1000`; result.description = "Video hosted on Google Drive."; }
        result.notes.push("For playback, set the Drive file sharing permission to 'Anyone with the link'. Private files cannot be played publicly.");
      }
    } else if (provider === "Direct video") {
      result.title = decode(url.pathname.split("/").pop() || "Video").replace(/\.(mp4|m3u8|webm)$/i, "").replace(/[-_]/g, " ");
      result.description = "Direct video source."; result.kind = "Film"; result.category = "Movies";
    } else {
      result.notes.push("This link is recognised as an external website. PlayVerse can save it as an External link, but automatic metadata depends on the website exposing public metadata.");
      result.kind = "External link"; result.category = "External";
    }
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not inspect this link." }, { status: 400 });
  }
}
