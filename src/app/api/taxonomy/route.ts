import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const [categories, genres] = await Promise.all([
      prisma.category.findMany({orderBy:{sortOrder:"asc"}}),
      prisma.genre.findMany({orderBy:{name:"asc"}})
    ]);
    return NextResponse.json({categories,genres});
  } catch { return NextResponse.json({error:"Could not load taxonomy."},{status:503}); }
}
export async function POST(request:NextRequest) {
  try {
    const body=await request.json();
    const name=String(body.name||"").trim();
    if(!name) return NextResponse.json({error:"A name is required."},{status:400});
    if(body.type==="genre") {
      const item=await prisma.genre.create({data:{name}});
      return NextResponse.json(item,{status:201});
    }
    const item=await prisma.category.create({data:{name,description:String(body.description||""),sortOrder:Number(body.sortOrder)||0}});
    return NextResponse.json(item,{status:201});
  } catch { return NextResponse.json({error:"That category or genre may already exist."},{status:409}); }
}
export async function DELETE(request:NextRequest) {
  try {
    const id=request.nextUrl.searchParams.get("id");
    const type=request.nextUrl.searchParams.get("type");
    if(!id) return NextResponse.json({error:"Missing item id."},{status:400});
    if(type==="genre") await prisma.genre.delete({where:{id}});
    else await prisma.category.delete({where:{id}});
    return NextResponse.json({success:true});
  } catch { return NextResponse.json({error:"Could not delete item."},{status:400}); }
}
