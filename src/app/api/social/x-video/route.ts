import { NextRequest, NextResponse } from "next/server";

type VideoCandidate = { url: string; bitrate: number; type: string };

function collectCandidates(value: unknown, found: VideoCandidate[] = []): VideoCandidate[] {
  if (!value || typeof value !== "object") return found;
  if (Array.isArray(value)) {
    for (const item of value) collectCandidates(item, found);
    return found;
  }

  const record = value as Record<string, unknown>;
  const videoInfo = record.video_info as Record<string, unknown> | undefined;
  const variants = videoInfo?.variants;

  if (Array.isArray(variants)) {
    for (const item of variants) {
      if (!item || typeof item !== "object") continue;
      const variant = item as Record<string, unknown>;
      const url = typeof variant.url === "string" ? variant.url : "";
      const type = String(variant.content_type || "");
      if (url && /^https:\/\//i.test(url) && (/mp4/i.test(type) || /\.mp4(?:$|[?#])/i.test(url))) {
        found.push({ url, bitrate: Number(variant.bitrate) || 0, type });
      }
    }
  }

  // VxTwitter/FixTweet responses expose direct media URLs in different shapes.
  for (const [key, child] of Object.entries(record)) {
    if (typeof child === "string" && /^(?:https?:)?\/\//i.test(child)) {
      const normalized = child.startsWith("//") ? `https:${child}` : child;
      try {
        const parsed = new URL(normalized);
        const host = parsed.hostname.toLowerCase();
        const isXMediaHost = host === "video.twimg.com" || host === "video.x.com";
        const looksLikeVideo = /\.mp4(?:$|[?#])/i.test(parsed.pathname) || /\/vid\//i.test(parsed.pathname);
        if (isXMediaHost && looksLikeVideo && /(?:url|video|media|src|mp4)/i.test(key)) {
          found.push({ url: parsed.toString(), bitrate: 0, type: "video/mp4" });
        }
      } catch {
        // Ignore malformed URLs from external metadata.
      }
    } else if (key !== "variants") {
      collectCandidates(child, found);
    }
  }
  return found;
}

function getPoster(data: unknown): string {
  if (!data || typeof data !== "object") return "";
  const record = data as Record<string, unknown>;
  const details = record.mediaDetails ?? record.media_extended ?? record.media;
  if (Array.isArray(details)) {
    for (const item of details) {
      if (!item || typeof item !== "object") continue;
      const media = item as Record<string, unknown>;
      const poster = media.media_url_https || media.thumbnail_url || media.poster;
      if (typeof poster === "string") return poster;
    }
  }
  return "";
}

async function fetchJson(url: string): Promise<unknown | null> {
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; PlayVerse/1.0)",
        Accept: "application/json",
      },
      cache: "no-store",
      signal: AbortSignal.timeout(9000),
    });
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  const raw = request.nextUrl.searchParams.get("url") || "";
  let statusId = "";

  try {
    const url = new URL(raw);
    const host = url.hostname.toLowerCase().replace(/^www\./, "");
    if (host !== "x.com" && host !== "twitter.com" && !host.endsWith(".x.com") && !host.endsWith(".twitter.com")) {
      throw new Error("Unsupported host");
    }
    statusId = url.pathname.match(/\/status\/(\d+)/)?.[1] || "";
  } catch {
    return NextResponse.json({ error: "Provide a public X/Twitter post URL." }, { status: 400 });
  }

  if (!statusId) {
    return NextResponse.json({ error: "This X/Twitter link does not contain a post ID." }, { status: 400 });
  }

  // Use X's public syndication metadata first, then public tweet metadata
  // services as a fallback. We return only the media stream—not the tweet embed.
  const resolvers = [
    `https://cdn.syndication.twimg.com/tweet-result?id=${statusId}&lang=en`,
    `https://api.vxtwitter.com/Twitter/status/${statusId}`,
    `https://api.fxtwitter.com/${statusId}`,
  ];

  let poster = "";
  const candidates: VideoCandidate[] = [];
  for (const endpoint of resolvers) {
    const data = await fetchJson(endpoint);
    if (!data) continue;
    poster ||= getPoster(data);
    collectCandidates(data, candidates);
    const best = candidates.sort((a, b) => b.bitrate - a.bitrate)[0];
    if (best) {
      return NextResponse.json({ videoUrl: best.url, poster });
    }
  }

  return NextResponse.json(
    { error: "X did not expose a playable public video stream for this post. The post itself will not be embedded as a substitute." },
    { status: 404 },
  );
}
