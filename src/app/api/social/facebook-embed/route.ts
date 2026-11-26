import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const FACEBOOK_HOST = /(^|\\.)facebook\\.com$|^fb\\.watch$/i;

function decodeHtml(value: string) {
  return value
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#0*39;/gi, "'")
    .replace(/&#x0*27;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">");
}

function isFacebookUrl(value: URL) {
  return FACEBOOK_HOST.test(value.hostname.toLowerCase());
}

function canonicalFacebookUrl(value: string, base: string) {
  const url = new URL(decodeHtml(value), base);
  if (!isFacebookUrl(url)) return null;
  // Remove Facebook tracking parameters while retaining video/reel identifiers.
  for (const key of [...url.searchParams.keys()]) {
    if (/^(utm_|mibextid|__tn__|__cft__|ref|refsrc|locale|sfnsn)$/i.test(key)) {
      url.searchParams.delete(key);
    }
  }
  url.hash = "";
  return url;
}

function findCanonical(html: string, base: string) {
  const candidates = [
    html.match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i)?.[1],
    html.match(/<link[^>]+href=["']([^"']+)["'][^>]+rel=["']canonical["']/i)?.[1],
    html.match(/<meta[^>]+property=["']og:url["'][^>]+content=["']([^"']+)["']/i)?.[1],
    html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:url["']/i)?.[1],
  ].filter(Boolean) as string[];

  for (const candidate of candidates) {
    const parsed = canonicalFacebookUrl(candidate, base);
    if (parsed && !/\/share\//i.test(parsed.pathname)) return parsed;
  }
  return null;
}

export async function GET(request: NextRequest) {
  const raw = request.nextUrl.searchParams.get("url");
  if (!raw) return NextResponse.json({ error: "A Facebook video URL is required." }, { status: 400 });

  let input: URL;
  try {
    input = new URL(raw);
  } catch {
    return NextResponse.json({ error: "Invalid URL." }, { status: 400 });
  }

  if (!isFacebookUrl(input)) {
    return NextResponse.json({ error: "Only public Facebook video links are supported." }, { status: 400 });
  }

  try {
    const headers = {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      Accept: "text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.8",
    };

    // Resolve share/v and fb.watch short links through Facebook's redirect chain.
    const page = await fetch(input.toString(), {
      redirect: "follow",
      headers,
      signal: AbortSignal.timeout(12000),
      cache: "no-store",
    });

    let canonical = canonicalFacebookUrl(page.url || input.toString(), input.toString());
    const html = await page.text().catch(() => "");

    // Facebook sometimes serves the share landing page without a useful final
    // response URL. Its canonical/og:url metadata contains the actual Reel URL.
    if (!canonical || /\/share\//i.test(canonical.pathname)) {
      canonical = findCanonical(html, page.url || input.toString()) || canonical;
    }

    if (!canonical || /\/share\//i.test(canonical.pathname)) {
      // A numeric reel/video ID in the page can still be used to form a stable
      // permalink when Facebook's canonical metadata is missing.
      const reelId =
        html.match(/facebook\\.com\\/(?:reel|videos)\\/(\\d{6,})/i)?.[1] ||
        html.match(/["'](?:video_id|videoID|story_fbid)["']\\s*:\\s*["']?(\\d{6,})/i)?.[1];
      if (reelId) canonical = new URL("https://www.facebook.com/reel/" + reelId);
    }

    if (!canonical || !isFacebookUrl(canonical)) {
      throw new Error("Facebook could not resolve this link to a public video permalink.");
    }

    // Ask Facebook for its official embed metadata. This is optional: oEmbed
    // may be rate-limited or return no HTML even for a public, embeddable Reel.
    let embedSrc = "";
    let ratio = 16 / 9;
    try {
      const oembedUrl =
        "https://www.facebook.com/plugins/video/oembed.json/?url=" +
        encodeURIComponent(canonical.toString());
      const response = await fetch(oembedUrl, {
        headers,
        signal: AbortSignal.timeout(9000),
        cache: "no-store",
      });
      if (response.ok) {
        const data = (await response.json()) as { html?: string; width?: number; height?: number };
        const iframe = String(data.html || "").match(/src=["']([^"']+)["']/i)?.[1];
        if (iframe) {
          const parsed = new URL(decodeHtml(iframe), canonical.origin);
          if (isFacebookUrl(parsed)) embedSrc = parsed.toString();
        }
        const width = Number(data.width);
        const height = Number(data.height);
        if (width > 0 && height > 0) ratio = width / height;
      }
    } catch {
      // Use the official Facebook video plugin below as a resilient fallback.
    }

    // Crucial fallback: always embed the resolved permalink, never the original
    // /share/v/ URL. This is what fixes public share links that oEmbed rejects.
    if (!embedSrc || /\\/share\\//i.test(embedSrc)) {
      embedSrc =
        "https://www.facebook.com/plugins/video.php?href=" +
        encodeURIComponent(canonical.toString()) +
        "&show_text=0&width=720&allowfullscreen=true";
    }

    return NextResponse.json({
      src: embedSrc,
      ratio,
      canonicalUrl: canonical.toString(),
      resolved: canonical.toString() !== input.toString(),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not resolve this Facebook video." },
      { status: 422 },
    );
  }
}
