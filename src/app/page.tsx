"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import ThemeToggle from "@/components/theme-toggle";
import { Search, Play, ChevronRight, ChevronLeft, Sparkles, Film, Clapperboard, Music2, Tv, Gamepad2, BookOpen, Radio, Compass, Bookmark, Clock3, Menu, X, ArrowUpRight, PanelLeftClose, PanelLeftOpen } from "lucide-react";

type Item = { id: string; title: string; category: string; kind: string; description: string; image: string; source: string; featured?: boolean; year?: string; duration?: string; };

const initialItems: Item[] = [
  { id:"1", title:"Beyond the Horizon", category:"Movies", kind:"Film", description:"A breathtaking journey through a world waiting to be discovered.", image:"https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?w=1000", source:"YouTube", featured:true, year:"2025", duration:"2h 04m" },
  { id:"2", title:"Neon Nights", category:"Anime", kind:"Series", description:"A new generation discovers the secrets hidden beneath their city.", image:"https://images.unsplash.com/photo-1578632767115-351597cf2477?w=700", source:"Vimeo", year:"2025" },
  { id:"3", title:"Wild Earth", category:"Documentaries", kind:"Documentary", description:"An intimate look at the extraordinary life of the natural world.", image:"https://images.unsplash.com/photo-1472396961693-142e6e269027?w=700", source:"YouTube", year:"2024", duration:"48 min" },
  { id:"4", title:"The Colour Club", category:"Animation", kind:"Cartoon", description:"A joyful animated adventure for the whole family.", image:"https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=700", source:"YouTube", year:"2025" },
  { id:"5", title:"Live From Lagos", category:"Music", kind:"Performance", description:"Electric performances and fresh sounds from the city.", image:"https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=700", source:"YouTube", year:"2026" },
  { id:"6", title:"Creator Sessions", category:"Vibes", kind:"Short video", description:"Quick inspiration, humour and creative moments.", image:"https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=700", source:"YouTube", year:"2026", duration:"0:42" },
  { id:"7", title:"The Last Kingdom", category:"Movies", kind:"Film", description:"A kingdom stands at the edge of a defining battle.", image:"https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=700", source:"Vimeo", year:"2024", duration:"1h 52m" },
  { id:"8", title:"Deep Space", category:"Documentaries", kind:"Series", description:"Explore the mysteries and possibilities beyond our planet.", image:"https://images.unsplash.com/photo-1462331940025-496dfbfc7564?w=700", source:"YouTube", year:"2025" }
];

const categories = [
  { name:"Discover", icon:Compass }, { name:"Movies", icon:Film }, { name:"Series", icon:Tv },
  { name:"Anime", icon:Sparkles }, { name:"Animation", icon:Clapperboard }, { name:"Music", icon:Music2 },
  { name:"Vibes", icon:Radio }, { name:"Documentaries", icon:BookOpen }, { name:"Gaming", icon:Gamepad2 }
];

function Card({ item, large=false, saved=false, onSave, onOpen }: { item:Item; large?:boolean; saved?:boolean; onSave?:()=>void; onOpen?:()=>void }) {
  return <article className={`media-card ${large ? "media-card-large" : ""}`}>
    <div className="poster-wrap">
      <Link href={`/watch/${item.id}`} onClick={onOpen} className="poster" aria-label={`Watch ${item.title}`} style={{backgroundImage:`url("${item.image}")`,display:"block"}}>
        <span className="type-pill">{item.kind}</span>
        {item.duration&&<span className="duration-pill">{item.duration}</span>}
        <span className="play-float" aria-hidden="true"><Play size={18} fill="currentColor"/></span>
        <span className="poster-shade" aria-hidden="true"/>
      </Link>
      <button type="button" className={`card-save-button${saved?" is-saved":""}`} onClick={onSave} aria-label={saved?"Remove from My Collection":"Save to My Collection"} title={saved?"Remove from My Collection":"Save to My Collection"}><Bookmark size={15} fill={saved?"currentColor":"none"}/></button>
    </div>
    <div className="media-card-info">
      <Link href={`/watch/${item.id}`} onClick={onOpen} className="media-card-title">{item.title}</Link>
      <div className="media-card-meta"><span>{item.category}</span><i/> <span>{item.year||item.kind}</span></div>
    </div>
  </article>;
}

export default function Home() {
  const [items, setItems] = useState<Item[]>(initialItems);
  useEffect(() => {
    fetch("/api/taxonomy").then(r=>r.ok?r.json():null).then(data=>{
      if(data?.categories) setCustomCategories(data.categories.map((c:{name:string})=>c.name));
    }).catch(()=>{});
    fetch("/api/content?status=Published")
      .then(r => r.ok ? r.json() : Promise.reject())
      .then((rows: Array<{id:string;title:string;category:string;kind:string;description:string;imageUrl:string;featured:boolean;year?:string|null;duration?:string|null;sources?:Array<{url:string;provider:string;isPrimary:boolean}>}>) => {
        if (rows.length) setItems(rows.map(row => ({
          id: row.id, title: row.title, category: row.category, kind: row.kind,
          description: row.description, image: row.imageUrl || "", featured: row.featured,
          source: row.sources?.find(s => s.isPrimary)?.provider || "External",
          year: row.year || undefined, duration: row.duration || undefined
        })));
      })
      .catch(() => { /* Keep the local demo catalogue visible while the database is offline. */ });
  }, []);
  const [active, setActive] = useState("Discover");
  const [query, setQuery] = useState("");
  const [savedIds,setSavedIds]=useState<string[]>([]);
  const [recentIds,setRecentIds]=useState<string[]>([]);
  useEffect(()=>{
    try{
      setSavedIds(JSON.parse(localStorage.getItem("playverse-my-collection")||"[]"));
      setRecentIds(JSON.parse(localStorage.getItem("playverse-recently-watched")||"[]"));
    }catch{setSavedIds([]);setRecentIds([])}
  },[]);
  const toggleSaved=(id:string)=>{
    setSavedIds(current=>{
      const next=current.includes(id)?current.filter(x=>x!==id):[id,...current];
      try{localStorage.setItem("playverse-my-collection",JSON.stringify(next))}catch{}
      return next;
    });
  };
  const recordWatched=(id:string)=>{
    setRecentIds(current=>{
      const next=[id,...current.filter(x=>x!==id)].slice(0,100);
      try{localStorage.setItem("playverse-recently-watched",JSON.stringify(next))}catch{}
      return next;
    });
  };
  const [mobileOpen, setMobileOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  useEffect(() => {
    try { setSidebarCollapsed(localStorage.getItem("playverse-sidebar-collapsed") === "true"); } catch {}
  }, []);
  const toggleSidebar = () => setSidebarCollapsed(value => {
    const next = !value;
    try { localStorage.setItem("playverse-sidebar-collapsed", String(next)); } catch {}
    return next;
  });
  const [customCategories, setCustomCategories] = useState<string[]>([]);
  const [heroIndex, setHeroIndex] = useState(0);
  const [heroPaused, setHeroPaused] = useState(false);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const filtered = useMemo(() => {
    const base=active==="My Collection"?items.filter(x=>savedIds.includes(x.id)):
      active==="Recently Watched"?recentIds.map(id=>items.find(x=>x.id===id)).filter((x):x is Item=>Boolean(x)):
      items.filter(x=>active==="Discover"||x.category===active||(active==="Series"&&x.kind==="Series"));
    return base.filter(x=>`${x.title} ${x.category} ${x.description} ${x.kind}`.toLowerCase().includes(query.toLowerCase()));
  }, [items,active,query,savedIds,recentIds]);
  const featuredItems = items.filter(x => x.featured);
  const heroSlides = featuredItems.length ? featuredItems : items.slice(0, 1);
  const featured = heroSlides[Math.min(heroIndex, Math.max(0, heroSlides.length - 1))] || items[0];
  useEffect(() => {
    if (heroSlides.length < 2 || heroPaused) return;
    const timer = window.setInterval(() => setHeroIndex(current => (current + 1) % heroSlides.length), 7000);
    return () => window.clearInterval(timer);
  }, [heroSlides.length, heroPaused]);
  useEffect(() => { setHeroIndex(0); }, [heroSlides.length]);
  const goToHero = (index: number) => setHeroIndex((index + heroSlides.length) % heroSlides.length);
  const nextHero = () => goToHero(heroIndex + 1);
  const previousHero = () => goToHero(heroIndex - 1);
  const sections = active === "Discover" ? Array.from(new Set(items.map(item=>item.category))).slice(0,8) : [active];
  const visibleCategories = [...categories, ...customCategories.filter(name=>!categories.some(c=>c.name===name)).map(name=>({name,icon:Compass}))];

  return <main className={`app-shell${sidebarCollapsed ? " sidebar-collapsed" : ""}`}>
    <aside className={`sidebar ${mobileOpen ? "sidebar-open" : ""}`}>
      <div className="sidebar-brand-row">
        <Link href="/" className="brand"><span className="brand-mark">P</span><span>play<span>verse</span></span></Link>
        <button type="button" className="sidebar-collapse-button" onClick={toggleSidebar} aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"} title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}>
          {sidebarCollapsed ? <PanelLeftOpen size={18}/> : <PanelLeftClose size={18}/>}
        </button>
      </div>
      <div className="side-label">YOUR UNIVERSE</div>
      <nav>{visibleCategories.map(({name,icon:Icon})=><button key={name} onClick={()=>{setActive(name);setMobileOpen(false)}} className={`nav-item ${active===name?"nav-active":""}`} title={name}><Icon size={18}/><span>{name}</span>{name==="Discover"&&<span className="nav-dot"/>}</button>)}</nav>
      <div className="side-divider"/>
      <div className="side-label">YOUR SPACE</div>
      <button className={`nav-item ${active==="My Collection"?"nav-active":""}`} title="My Collection" onClick={()=>{setActive("My Collection");setQuery("");setMobileOpen(false)}}><Bookmark size={18}/><span>My Collection</span></button>
      <button className={`nav-item ${active==="Recently Watched"?"nav-active":""}`} title="Recently Watched" onClick={()=>{setActive("Recently Watched");setQuery("");setMobileOpen(false)}}><Clock3 size={18}/><span>Recently Watched</span></button>
      <div className="sidebar-bottom"><div className="upgrade-card"><Sparkles size={18}/><strong>Your next favourite is waiting.</strong><span>Explore something unexpected today.</span></div><Link href="/admin" className="admin-link">Creator studio <ArrowUpRight size={14}/></Link><span className="copyright">© 2026 PLAYVERSE</span></div>
    </aside>
    {mobileOpen && <button className="scrim" onClick={()=>setMobileOpen(false)} aria-label="Close menu"/>}
    <section className="main-area">
      <header className="topbar">
        <button className="mobile-menu" onClick={()=>setMobileOpen(!mobileOpen)} aria-label="Toggle menu">{mobileOpen?<X/>:<Menu/>}</button>
        <div className="breadcrumb">Explore <span>/</span> <b>{active}</b></div>
        <div className="top-actions"><ThemeToggle compact/><label className="search-box"><Search size={17}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search your universe..."/><kbd>⌘ K</kbd></label><button className="avatar">PV</button></div>
      </header>
      <div className="content-wrap">
        <section className="welcome-row"><div><div className="eyebrow"><span className="eyebrow-line"/> THE WORLD IS YOUR PLAYGROUND</div><h1>Find your <em>next</em><br/>favourite thing.</h1><p>Stories, sounds, characters and moments. All in one universe.</p></div><div className="welcome-orb"><span>PV</span></div></section>
        {active==="Discover" && !query && featured && <section
          className="hero hero-carousel"
          onMouseEnter={() => setHeroPaused(true)}
          onMouseLeave={() => setHeroPaused(false)}
          onFocus={() => setHeroPaused(true)}
          onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setHeroPaused(false); }}
          onTouchStart={(event) => setTouchStart(event.touches[0]?.clientX ?? null)}
          onTouchEnd={(event) => {
            if (touchStart === null) return;
            const delta = event.changedTouches[0]?.clientX - touchStart;
            if (delta > 45) previousHero(); else if (delta < -45) nextHero();
            setTouchStart(null);
          }}
          style={{backgroundImage:`linear-gradient(90deg,rgba(7,10,16,.96) 0%,rgba(7,10,16,.72) 42%,rgba(7,10,16,.05) 100%),linear-gradient(0deg,rgba(7,10,16,.45),transparent),url("${featured.image}")`}}
        >
          <div className="hero-content" key={featured.id}>
            <div className="eyebrow"><Sparkles size={14}/> EDITOR&apos;S SPOTLIGHT</div>
            <div className="hero-meta"><span>{featured.category}</span>{featured.year && <><i/><span>{featured.year}</span></>}{featured.duration && <><i/><span>{featured.duration}</span></>}</div>
            <h2>{featured.title}</h2><p>{featured.description}</p>
            <div className="hero-buttons">
              <Link href={`/watch/${featured.id}`} onClick={()=>recordWatched(featured.id)} className="primary-button"><Play size={16} fill="currentColor"/> Watch now</Link>
              <button className="secondary-button" type="button" onClick={()=>toggleSaved(featured.id)}><Bookmark size={16} fill={savedIds.includes(featured.id)?"currentColor":"none"}/> {savedIds.includes(featured.id)?"In your collection":"Add to collection"}</button>
            </div>
          </div>
          {heroSlides.length > 1 && <>
            <div className="hero-arrows">
              <button type="button" onClick={previousHero} aria-label="Previous featured title"><ChevronLeft size={19}/></button>
              <button type="button" onClick={nextHero} aria-label="Next featured title"><ChevronRight size={19}/></button>
            </div>
            <div className="hero-index"><span>{String(heroIndex+1).padStart(2,"0")}</span><i/> {String(heroSlides.length).padStart(2,"0")}</div>
            <div className="hero-dots" aria-label="Choose featured title">
              {heroSlides.map((slide,index)=><button key={slide.id} type="button" className={index===heroIndex?"active":""} onClick={()=>goToHero(index)} aria-label={`Show featured title ${index+1}`}/>)}
            </div>
          </>}
        </section>}
        <div className="section-heading"><div><div className="eyebrow">CURATED FOR THE CURIOUS</div><h2>{query ? "Search results" : active==="Discover" ? "Explore the universe" : active}</h2></div><span className="result-count">{filtered.length} titles <ChevronRight size={15}/></span></div>
        {sections.map(section=><section className="content-section" key={section}><div className="row-heading"><h3>{section==="Vibes"?"Quick Hits":section==="Animation"?"Animated Worlds":section==="Documentaries"?"Real Stories":active==="My Collection"||active==="Recently Watched"?section:`Explore ${section}`}</h3>{active==="Discover"&&<button onClick={()=>setActive(section)}>View all <ArrowUpRight size={14}/></button>}</div><div className="card-grid">{(active==="Discover"?filtered.filter(x=>section==="Movies"?x.category==="Movies":section==="Anime"?x.category==="Anime":section==="Music"?x.category==="Music":section==="Documentaries"?x.category==="Documentaries":x.category===section):filtered).map(item=><Card key={item.id} item={item} saved={savedIds.includes(item.id)} onSave={()=>toggleSaved(item.id)} onOpen={()=>recordWatched(item.id)}/>)}</div></section>)}
        {filtered.length===0 && <div className="empty-state"><Search size={28}/><h3>{active==="My Collection"?"Your collection is empty":active==="Recently Watched"?"Nothing watched yet":"No titles found"}</h3><p>{active==="My Collection"?"Save films and videos with the bookmark icon and they will appear here.":active==="Recently Watched"?"Titles you open will appear here for quick access.":"Try another search or choose a different category."}</p></div>}
        <footer className="footer"><span className="brand-small">PLAYVERSE</span><span>One universe. Infinite ways to play.</span><Link href="/admin">Manage content <ArrowUpRight size={13}/></Link></footer>
      </div>
    </section>
  </main>;
}
