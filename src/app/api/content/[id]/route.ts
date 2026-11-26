import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type Context = { params: Promise<{ id: string }> };
function detectProvider(url: string) {
  const host = new URL(url).hostname.toLowerCase();
  if (host.includes("youtube.com") || host === "youtu.be") return "YouTube";
  if (host.includes("vimeo.com")) return "Vimeo";
  if (host.includes("dailymotion.com") || host === "dai.ly") return "Dailymotion";
  if (/\.(mp4|m3u8|webm)(\?|$)/i.test(url)) return "Direct video";
  return "External website";
}
function cleanSources(body: any) {
  const input = Array.isArray(body.sources) && body.sources.length ? body.sources : [{url:body.url,provider:body.provider,isPrimary:true,label:"Primary source"}];
  return input.filter((s:any)=>typeof s.url==="string"&&s.url.trim()).map((s:any,i:number)=>{
    let u:URL; try{u=new URL(s.url.trim())}catch{throw new Error("Every source must have a valid URL.")}
    if(!["http:","https:"].includes(u.protocol))throw new Error("Only http and https sources are supported.");
    return {url:u.toString(),provider:s.provider||detectProvider(u.toString()),label:s.label||`Source ${i+1}`,isPrimary:Boolean(s.isPrimary)||i===0,playbackMode:s.playbackMode||"auto"};
  });
}
export async function PATCH(request: NextRequest, context: Context) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    if (!body.title?.trim() || !body.description?.trim() || !body.category?.trim() || !body.kind?.trim())
      return NextResponse.json({ error: "Title, description, category and format are required." }, { status: 400 });
    const existing = await prisma.content.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: "Content not found." }, { status: 404 });
    const sources = cleanSources(body);
    if (!sources.length) return NextResponse.json({ error: "At least one source URL is required." }, { status: 400 });
    const item = await prisma.content.update({
      where: { id }, data: {
        title:body.title.trim(), description:body.description.trim(), imageUrl:body.imageUrl?.trim()||"",
        category:body.category.trim(), kind:body.kind.trim(), tags:Array.isArray(body.tags)?body.tags:[],
        status:body.status||"Draft", featured:Boolean(body.featured), year:body.year||null, duration:body.duration||null,
        language:body.language||"",country:body.country||"",ageRating:body.ageRating||"",parentId:body.parentId||null,
        sortOrder:Number(body.sortOrder)||0,
        sources:{deleteMany:{},create:sources}
      }, include:{sources:true}
    });
    return NextResponse.json(item);
  } catch(error) {
    const message=error instanceof Error?error.message:"Could not update content.";
    return NextResponse.json({error:message},{status:400});
  }
}
export async function DELETE(_request: NextRequest, context: Context) {
  try { const {id}=await context.params; await prisma.content.delete({where:{id}}); return NextResponse.json({success:true}); }
  catch { return NextResponse.json({error:"Could not delete content."},{status:404}); }
}
