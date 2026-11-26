import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function cleanSources(body: any) {
  const input = Array.isArray(body.sources) && body.sources.length
    ? body.sources
    : [{ url: body.url, provider: body.provider, label: "Primary source", isPrimary: true, playbackMode: "auto" }];
  return input.filter((s: any) => typeof s.url === "string" && s.url.trim()).map((s: any, i: number) => {
    const url = s.url.trim();
    let parsed: URL;
    try { parsed = new URL(url); } catch { throw new Error("Every source must have a valid http or https URL."); }
    if (!["http:", "https:"].includes(parsed.protocol)) throw new Error("Only http and https sources are supported.");
    return { url, provider: s.provider || detectProvider(url), label: s.label || `Source ${i + 1}`, isPrimary: Boolean(s.isPrimary) || i === 0, playbackMode: s.playbackMode || "auto" };
  });
}
function detectProvider(url: string) {
  const host = new URL(url).hostname.toLowerCase();
  if (host.includes("youtube.com") || host === "youtu.be") return "YouTube";
  if (host.includes("vimeo.com")) return "Vimeo";
  if (host.includes("dailymotion.com") || host === "dai.ly") return "Dailymotion";
  if (/\.(mp4|m3u8|webm)(\?|$)/i.test(url)) return "Direct video";
  return "External website";
}
export async function GET(request: NextRequest) {
  try {
    const status = request.nextUrl.searchParams.get("status");
    const category = request.nextUrl.searchParams.get("category");
    const kind = request.nextUrl.searchParams.get("kind");
    const parentId = request.nextUrl.searchParams.get("parentId");
    const q = request.nextUrl.searchParams.get("q");
    const items = await prisma.content.findMany({
      where: {
        ...(status ? { status } : {}), ...(category ? { category } : {}),
        ...(kind ? { kind } : {}),
        ...(parentId === "root" || (status === "Published" && !parentId) ? { parentId: null } : parentId ? { parentId } : {}),
        ...(q ? { OR: [{ title: { contains: q, mode: "insensitive" } }, { description: { contains: q, mode: "insensitive" } }, { category: { contains: q, mode: "insensitive" } }] } : {})
      },
      include: { captions: true, sources: { orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }] }, children: { include: { captions: true, sources: true }, orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] } },
      // Child entries must use the same stable sequence as the watch page.
      // The general catalogue remains newest-first, while parent-scoped
      // requests (playlist/series contents) are oldest-first within sort order.
      orderBy: parentId && parentId !== "root"
        ? [{ sortOrder: "asc" }, { createdAt: "asc" }]
        : [{ featured: "desc" }, { sortOrder: "asc" }, { createdAt: "desc" }]
    });
    return NextResponse.json(items);
  } catch (error) {
    console.error("GET /api/content", error);
    return NextResponse.json({ error: "Database unavailable. Start PostgreSQL and run migrations." }, { status: 503 });
  }
}
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    if (!body.title?.trim() || !body.description?.trim() || !body.category?.trim() || !body.kind?.trim())
      return NextResponse.json({ error: "Title, description, category and format are required." }, { status: 400 });
    const sources = cleanSources(body);
    if (!sources.length) return NextResponse.json({ error: "Add at least one source URL." }, { status: 400 });
    const item = await prisma.content.create({
      data: {
        title: body.title.trim(), description: body.description.trim(), imageUrl: body.imageUrl?.trim() || "",
        category: body.category.trim(), kind: body.kind.trim(), tags: Array.isArray(body.tags) ? body.tags : [],
        status: body.status || "Draft", featured: Boolean(body.featured), year: body.year || null,
        duration: body.duration || null, language: body.language || "", country: body.country || "",
        ageRating: body.ageRating || "", parentId: body.parentId || null, sortOrder: Number(body.sortOrder) || 0,
        sources: { create: sources }
      }, include: { captions: true, sources: true }
    });
    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not save content.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
