import { NextRequest, NextResponse } from "next/server";

function findVideo(value: unknown, found: Array<{url:string;bitrate:number;type:string}> = []): Array<{url:string;bitrate:number;type:string}> {
  if (!value || typeof value !== "object") return found;
  if (Array.isArray(value)) { for (const item of value) findVideo(item, found); return found; }
  const record = value as Record<string, unknown>;
  const info = record.video_info as Record<string, unknown> | undefined;
  const variants = info?.variants;
  if (Array.isArray(variants)) for (const item of variants) {
    if (!item || typeof item !== "object") continue;
    const variant = item as Record<string, unknown>;
    if (typeof variant.url === "string" && variant.url.startsWith("https://") && String(variant.content_type || "").includes("mp4")) {
      found.push({url:variant.url, bitrate:Number(variant.bitrate)||0, type:String(variant.content_type||"")});
    }
  }
  for (const [key, child] of Object.entries(record)) if (key !== "variants") findVideo(child, found);
  return found;
}

export async function GET(request: NextRequest) {
  const raw = request.nextUrl.searchParams.get("url") || "";
  let statusId = "";
  try {
    const url = new URL(raw);
    if (!/(^|\.)(x|twitter)\.com$/.test(url.hostname.toLowerCase())) throw new Error("Unsupported host");
    statusId = url.pathname.match(/\/status\/(\d+)/)?.[1] || "";
  } catch { return NextResponse.json({error:"Provide a public X post URL."},{status:400}); }
  if (!statusId) return NextResponse.json({error:"This X link does not contain a post ID."},{status:400});
  try {
    const response = await fetch(`https://cdn.syndication.twimg.com/tweet-result?id=${statusId}&lang=en`, {
      headers:{"User-Agent":"Mozilla/5.0 PlayVerse/1.0","Accept":"application/json"},
      cache:"no-store", signal:AbortSignal.timeout(10000)
    });
    if (!response.ok) return NextResponse.json({error:"X did not provide public video data for this post."},{status:502});
    const data: unknown = await response.json();
    const variants = findVideo(data).sort((a,b)=>b.bitrate-a.bitrate);
    const best = variants[0];
    if (!best) return NextResponse.json({error:"No public MP4 video was found in this X post."},{status:404});
    return NextResponse.json({videoUrl:best.url,poster:(data as any)?.mediaDetails?.[0]?.media_url_https || (data as any)?.media?.[0]?.media_url_https || ""});
  } catch {
    return NextResponse.json({error:"Could not retrieve the public X video. Try again later."},{status:502});
  }
}
