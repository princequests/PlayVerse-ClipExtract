"use client";
import { useCallback, useEffect, useState } from "react";
import { ThumbsUp, ThumbsDown, MessageCircle, Send, ArrowUpDown } from "lucide-react";

type Comment={id:string;author:string;body:string;createdAt:string};
type Data={comments:Comment[];likes:number;dislikes:number;commentCount:number};
function getVoterKey(){
  const key="playverse-community-voter";
  let value=localStorage.getItem(key);
  if(!value){value=`pv_${crypto.randomUUID().replace(/-/g,"")}`;localStorage.setItem(key,value)}
  return value;
}
function compact(value:number){
  return new Intl.NumberFormat("en",{notation:value>=1000?"compact":"standard",maximumFractionDigits:1}).format(value);
}
export default function Community({contentId}:{contentId:string}){
  const [data,setData]=useState<Data>({comments:[],likes:0,dislikes:0,commentCount:0});
  const [myRating,setMyRating]=useState(0);
  const [body,setBody]=useState("");
  const [author,setAuthor]=useState("");
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");
  const [sort,setSort]=useState<"newest"|"oldest">("newest");
  const [voterKey,setVoterKey]=useState("");
  const load=useCallback(async()=>{
    try{const key=getVoterKey();setVoterKey(key);const response=await fetch(`/api/content/${contentId}/community?voterKey=${encodeURIComponent(key)}`,{cache:"no-store"});if(!response.ok)throw new Error("Could not load community");const result=await response.json();setData(result);setMyRating(result.myRating||0)}
    catch{setError("Comments and ratings are temporarily unavailable.")}
  },[contentId]);
  useEffect(()=>{setVoterKey(getVoterKey());void load()},[load]);
  const rate=async(value:1|-1)=>{
    if(!voterKey)return;
    setError("");
    try{
      const response=await fetch(`/api/content/${contentId}/community`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"rate",value,voterKey})});
      const result=await response.json();if(!response.ok)throw new Error(result.error||"Rating failed");
      setData(current=>({...current,likes:result.likes,dislikes:result.dislikes}));setMyRating(result.myRating);
    }catch(e){setError(e instanceof Error?e.message:"Could not save rating")}
  };
  const submit=async(event:React.FormEvent)=>{
    event.preventDefault();if(!body.trim()||!voterKey||busy)return;
    setBusy(true);setError("");
    try{
      const response=await fetch(`/api/content/${contentId}/community`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"comment",body,author,voterKey})});
      const result=await response.json();if(!response.ok)throw new Error(result.error||"Comment could not be posted");
      setBody("");setData(current=>({...current,comments:[result.comment,...current.comments],commentCount:current.commentCount+1}));
    }catch(e){setError(e instanceof Error?e.message:"Could not post comment")}
    finally{setBusy(false)}
  };
  const comments=[...data.comments].sort((a,b)=>sort==="newest"?new Date(b.createdAt).getTime()-new Date(a.createdAt).getTime():new Date(a.createdAt).getTime()-new Date(b.createdAt).getTime());
  return <section className="pv-community" aria-label="Video ratings and comments">
    <div className="pv-video-rating" aria-label="Rate this video">
      <div className="pv-rating-group">
        <button type="button" className={myRating===1?"active":""} onClick={()=>void rate(1)} aria-pressed={myRating===1}><ThumbsUp size={19}/><span>{compact(data.likes)}</span></button>
        <span className="pv-rating-divider"/>
        <button type="button" className={myRating===-1?"active":""} onClick={()=>void rate(-1)} aria-pressed={myRating===-1}><ThumbsDown size={19}/><span>{compact(data.dislikes)}</span></button>
      </div>
    </div>
    <div className="pv-community-toolbar">
      <div className="pv-community-count"><h2>{compact(data.commentCount)} {data.commentCount===1?"Comment":"Comments"}</h2></div>
      <button className="pv-sort-button" type="button" onClick={()=>setSort(v=>v==="newest"?"oldest":"newest")}><ArrowUpDown size={17}/>{sort==="newest"?"Newest first":"Oldest first"}</button>
    </div>
    <form className="pv-comment-form" onSubmit={submit}>
      <div className="pv-comment-avatar">{(author.trim()[0]||"G").toUpperCase()}</div>
      <div className="pv-comment-compose">
        <input aria-label="Display name" value={author} onChange={e=>setAuthor(e.target.value)} placeholder="Your name (optional)" maxLength={40}/>
        <textarea aria-label="Add a comment" value={body} onChange={e=>setBody(e.target.value)} placeholder="Add a comment..." maxLength={2000} rows={2}/>
        <div className="pv-comment-form-actions"><span>{body.length}/2000</span><button type="button" className="pv-cancel-button" onClick={()=>setBody("")}>Cancel</button><button type="submit" className="pv-comment-submit" disabled={!body.trim()||busy}>{busy?"Posting…":<><Send size={14}/> Comment</>}</button></div>
      </div>
    </form>
    {error&&<p className="pv-community-error" role="alert">{error}</p>}
    <div className="pv-comment-list">
      {comments.length===0?<div className="pv-no-comments"><MessageCircle size={24}/><b>Start the conversation</b><span>Be the first to share your thoughts.</span></div>:comments.map(comment=><article className="pv-comment" key={comment.id}>
        <div className="pv-comment-avatar">{(comment.author[0]||"G").toUpperCase()}</div>
        <div className="pv-comment-content"><div className="pv-comment-meta"><b>{comment.author}</b><time>{new Intl.DateTimeFormat(undefined,{dateStyle:"medium"}).format(new Date(comment.createdAt))}</time></div><p>{comment.body}</p></div>
      </article>)}
    </div>
  </section>;
}
