import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type Context={params:Promise<{id:string}>};
const voterPattern=/^[a-zA-Z0-9_-]{8,100}$/;

export async function GET(request:NextRequest,context:Context){
  try{
    const {id}=await context.params;
    const voterKey=request.nextUrl.searchParams.get("voterKey")||"";
    const [comments,commentCount,likes,dislikes,myReaction]=await Promise.all([
      prisma.contentComment.findMany({where:{contentId:id},orderBy:{createdAt:"desc"},take:100,select:{id:true,author:true,body:true,createdAt:true}}),
      prisma.contentComment.count({where:{contentId:id}}),
      prisma.contentReaction.count({where:{contentId:id,value:1}}),
      prisma.contentReaction.count({where:{contentId:id,value:-1}}),
      voterPattern.test(voterKey)?prisma.contentReaction.findUnique({where:{contentId_voterKey:{contentId:id,voterKey}}}):Promise.resolve(null)
    ]);
    return NextResponse.json({comments,likes,dislikes,commentCount,myRating:myReaction?.value??0});
  }catch(error){console.error("Load community",error);return NextResponse.json({error:"Could not load comments and ratings."},{status:500})}
}
export async function POST(request:NextRequest,context:Context){
  try{
    const {id}=await context.params;
    const body=await request.json();
    const voterKey=String(body.voterKey||"");
    if(!voterPattern.test(voterKey))return NextResponse.json({error:"A valid browser identity is required."},{status:400});
    const exists=await prisma.content.findUnique({where:{id},select:{id:true,status:true}});
    if(!exists||exists.status!=="Published")return NextResponse.json({error:"Content not found."},{status:404});

    if(body.action==="rate"){
      const value=Number(body.value);
      if(value!==-1&&value!==1)return NextResponse.json({error:"Choose like or dislike."},{status:400});
      const current=await prisma.contentReaction.findUnique({where:{contentId_voterKey:{contentId:id,voterKey}}});
      if(current?.value===value)await prisma.contentReaction.delete({where:{id:current.id}});
      else await prisma.contentReaction.upsert({
        where:{contentId_voterKey:{contentId:id,voterKey}},
        create:{contentId:id,voterKey,value},
        update:{value}
      });
      const [likes,dislikes,updated]=await Promise.all([
        prisma.contentReaction.count({where:{contentId:id,value:1}}),
        prisma.contentReaction.count({where:{contentId:id,value:-1}}),
        prisma.contentReaction.findUnique({where:{contentId_voterKey:{contentId:id,voterKey}}})
      ]);
      return NextResponse.json({likes,dislikes,myRating:updated?.value??0});
    }

    if(body.action==="comment"){
      const text=String(body.body||"").trim();
      const author=String(body.author||"").trim().slice(0,40)||"Guest";
      if(text.length<2||text.length>2000)return NextResponse.json({error:"Comments must be between 2 and 2,000 characters."},{status:400});
      const comment=await prisma.contentComment.create({data:{contentId:id,voterKey,author,body:text}});
      return NextResponse.json({comment},{status:201});
    }
    return NextResponse.json({error:"Unsupported community action."},{status:400});
  }catch(error){console.error("Community action",error);return NextResponse.json({error:"Your request could not be completed."},{status:500})}
}
