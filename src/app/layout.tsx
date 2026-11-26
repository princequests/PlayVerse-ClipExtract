import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PlayVerse — Your universe of entertainment",
  description: "Discover movies, anime, animation, music, documentaries and more in one entertainment universe."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en" suppressHydrationWarning><head><script dangerouslySetInnerHTML={{__html:`(function(){try{var m=localStorage.getItem('playverse-theme')||'system';var t=m==='system'?(window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'):m;document.documentElement.dataset.theme=t;document.documentElement.style.colorScheme=t;}catch(e){document.documentElement.dataset.theme='dark';}})();`}}/></head><body>{children}</body></html>;
}
