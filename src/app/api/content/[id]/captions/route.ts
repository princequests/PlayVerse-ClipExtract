import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type Context={params:Promise<{id:string}>};
function toVtt(input:string,format:string){
  const text=input.replace(/^\uFEFF/,"").replace(/\r\n?/g,"\n").trim();
  if(format==="vtt"||/^WEBVTT/m.test(text)) return text.startsWith("WEBVTT")?text:`WEBVTT\n\n${text}`;
  const body=text.replace(/^(\d+)\s*\n(?=\d{2}:\d{2}:\d{2}[,.])/gm,"")
    .replace(/(\d{2}:\d{2}:\d{2}),(\d{3})/g,"$1.$2");
  return `WEBVTT\n\n${body}`;
}
export async function GET(_request:NextRequest,context:Context){
  try{const {id}=await context.params;const tracks=await prisma.captionTrack.findMany({where:{contentId:id},orderBy:[{isDefault:"desc"},{createdAt:"asc"}]});return NextResponse.json(tracks)}
  catch{return NextResponse.json({error:"Could not load captions."},{status:500})}
}
export async function PUT(request:NextRequest,context:Context){
  try{
    const {id}=await context.params;
    const exists=await prisma.content.findUnique({where:{id},select:{id:true}});
    if(!exists)return NextResponse.json({error:"Content not found."},{status:404});
    const body=await request.json();
    if(!Array.isArray(body.tracks))return NextResponse.json({error:"Caption tracks are required."},{status:400});
    const tracks=body.tracks.map((t:any)=>({
      language:String(t.language||"en").slice(0,20),
      label:String(t.label||t.language||"Captions").slice(0,80),
      isDefault:Boolean(t.isDefault),
      format:"vtt",
      contentText:toVtt(String(t.contentText||""),String(t.format||"vtt"))
    }));
    if(tracks.some((t:any)=>!t.contentText||!t.contentText.startsWith("WEBVTT")))return NextResponse.json({error:"Each caption file must contain valid WebVTT or SubRip cues."},{status:400});
    if(tracks.filter((t:any)=>t.isDefault).length>1)tracks.forEach((t:any,i:number)=>t.isDefault=i===0);
    await prisma.$transaction([
      prisma.captionTrack.deleteMany({where:{contentId:id}}),
      ...tracks.map((track:any)=>prisma.captionTrack.create({data:{...track,contentId:id}}))
    ]);
    const saved=await prisma.captionTrack.findMany({where:{contentId:id},orderBy:[{isDefault:"desc"},{createdAt:"asc"}]});
    return NextResponse.json(saved);
  }catch(error){console.error("Save captions",error);return NextResponse.json({error:"Could not save caption tracks."},{status:400})}
}
