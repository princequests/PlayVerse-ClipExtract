import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export async function GET(request: NextRequest) {
  const raw=request.nextUrl.searchParams.get("url");
  if(!raw)return NextResponse.json({error:"A Facebook video URL is required."},{status:400});
  let input:URL;
  try{input=new URL(raw);}catch{return NextResponse.json({error:"Invalid URL."},{status:400});}
  if(input.hostname!=="facebook.com"&&!input.hostname.endsWith(".facebook.com")&&input.hostname!=="fb.watch")
    return NextResponse.json({error:"Only public Facebook video links are supported."},{status:400});
  try{
    // Facebook share/v links are redirect links. Resolve them to the final public
    // permalink first; the video plugin often cannot render the short share URL.
    const redirected=await fetch(input.toString(),{redirect:"follow",headers:{"User-Agent":"Mozilla/5.0 (compatible; PlayVerse/1.0)"},signal:AbortSignal.timeout(9000),cache:"no-store"});
    const finalUrl=redirected.url||input.toString();
    const canonical=new URL(finalUrl);
    if(canonical.hostname!=="facebook.com"&&!canonical.hostname.endsWith(".facebook.com"))throw new Error("Facebook link redirected outside Facebook.");
    const oembedUrl="https://www.facebook.com/plugins/video/oembed.json/?url="+encodeURIComponent(canonical.toString());
    const response=await fetch(oembedUrl,{headers:{"User-Agent":"Mozilla/5.0 (compatible; PlayVerse/1.0)"},signal:AbortSignal.timeout(9000),cache:"no-store"});
    if(!response.ok)throw new Error("Facebook did not provide a public video embed. Check the post's audience and embed permissions.");
    const data=await response.json() as {html?:string;width?:number;height?:number};
    const html=String(data.html||"");
    const iframe=html.match(/src=["']([^"']+)["']/i)?.[1];
    let embedSrc=iframe?new URL(iframe,canonical.origin).toString():"";
    // Normalize plugin iframe and ensure it targets a canonical resolved URL.
    if(!embedSrc||/share\\//i.test(embedSrc)){
      embedSrc="https://www.facebook.com/plugins/video.php?href="+encodeURIComponent(canonical.toString())+"&show_text=0&width=720&allowfullscreen=true";
    }
    const width=Number(data.width)||720,height=Number(data.height)||405;
    return NextResponse.json({src:embedSrc,ratio:width/height,canonicalUrl:canonical.toString()});
  }catch(error){
    return NextResponse.json({error:error instanceof Error?error.message:"Could not resolve this Facebook video."},{status:422});
  }
}