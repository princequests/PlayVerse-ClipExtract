"use client";

import { useEffect, useRef } from "react";

export type DailymotionPlayerApi = {
  play: () => Promise<void>;
  pause: () => Promise<void>;
  seek: (seconds: number) => Promise<void>;
  setVolume: (volume: number) => Promise<void>;
  setPlaybackSpeed: (rate: number) => Promise<void>;
  setFullscreen: (enabled: boolean) => Promise<void>;
  getState: () => Promise<Record<string, any>>;
  on: (event: string, callback: (state?: any) => void) => void;
  off?: (event: string, callback?: (state?: any) => void) => void;
  destroy?: () => Promise<void>;
};

type DailymotionState = {
  playerIsPlaying?: boolean;
  playerIsBuffering?: boolean;
  playerIsMuted?: boolean | null;
  playerVolume?: number;
  playerPlaybackSpeed?: number;
  videoTime?: number;
  videoDuration?: number;
};

type DailymotionPlayerProps = {
  playerId: string;
  videoId?: string;
  playlistId?: string;
  onPlayerReady?: (player: DailymotionPlayerApi | null) => void;
  onPlayerState?: (state: Record<string, any>) => void;
};

type DailymotionGlobal = {
  createPlayer: (containerId: string, options: { video?: string; playlist?: string; params?: { autoplay?: boolean } }) => Promise<DailymotionPlayerApi>;
};

declare global {
  interface Window {
    dailymotion?: DailymotionGlobal;
  }
}

const libraryLoads = new Map<string, Promise<void>>();

function loadDailymotionLibrary(playerId: string): Promise<void> {
  const existing = libraryLoads.get(playerId);
  if (existing) return existing;

  const promise = new Promise<void>((resolve, reject) => {
    const src = `https://geo.dailymotion.com/libs/player/${encodeURIComponent(playerId)}.js`;
    if (window.dailymotion?.createPlayer) {
      resolve();
      return;
    }
    const alreadyLoaded = Array.from(document.scripts).find((script) => script.src === src);
    if (alreadyLoaded) {
      // A script may already have fired its load event before this component
      // mounts. Check the global again on the next task before subscribing.
      if ((alreadyLoaded as HTMLScriptElement).dataset.playverseLoaded === "true") {
        if (window.dailymotion?.createPlayer) resolve();
        else reject(new Error("Dailymotion script loaded without initializing the Player API"));
        return;
      }
      alreadyLoaded.addEventListener("load", () => resolve(), { once: true });
      alreadyLoaded.addEventListener("error", () => reject(new Error("Dailymotion library failed to load")), { once: true });
      return;
    }
    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.onload = () => {
      script.dataset.playverseLoaded = "true";
      if (window.dailymotion?.createPlayer) resolve();
      else reject(new Error("Dailymotion Player API did not initialize"));
    };
    script.onerror = () => reject(new Error("Dailymotion library failed to load"));
    document.body.appendChild(script);
  });

  libraryLoads.set(playerId, promise);
  promise.catch(() => libraryLoads.delete(playerId));
  return promise;
}

/**
 * Dailymotion owns the DOM inside each mount node. React only owns the empty
 * mount root; each effect gets a unique child node which is removed
 * synchronously during cleanup. This prevents React and the SDK from trying
 * to remove the same iframe/node during StrictMode remounts or route changes.
 */
let dailymotionMountSequence = 0;

export default function DailymotionPlayer({
  playerId,
  videoId,
  playlistId,
  onPlayerReady,
  onPlayerState,
}: DailymotionPlayerProps) {
  const mountRootRef = useRef<HTMLDivElement>(null);
  const onReadyRef = useRef(onPlayerReady);
  const onStateRef = useRef(onPlayerState);

  useEffect(() => { onReadyRef.current = onPlayerReady; }, [onPlayerReady]);
  useEffect(() => { onStateRef.current = onPlayerState; }, [onPlayerState]);

  useEffect(() => {
    const root = mountRootRef.current;
    if (!root) return;

    let active = true;
    let player: DailymotionPlayerApi | null = null;
    const listeners: Array<[string, (state?: any) => void]> = [];
    const mount = document.createElement("div");
    mount.id = `playverse-dm-sdk-${++dailymotionMountSequence}`;
    mount.className = "playverse-dailymotion-sdk-mount";
    root.appendChild(mount);

    const showIframeFallback = () => {
      if (!active || mount.querySelector("iframe")) return;
      const fallbackUrl = new URL(`https://geo.dailymotion.com/player/${encodeURIComponent(playerId)}.html`);
      if (videoId) fallbackUrl.searchParams.set("video", videoId);
      if (playlistId) fallbackUrl.searchParams.set("playlist", playlistId);
      fallbackUrl.searchParams.set("autoplay", "1");
      const iframe = document.createElement("iframe");
      iframe.src = fallbackUrl.toString();
      iframe.title = "Dailymotion video player";
      iframe.allow = "autoplay; fullscreen; picture-in-picture; web-share; encrypted-media";
      iframe.allowFullscreen = true;
      iframe.referrerPolicy = "strict-origin-when-cross-origin";
      iframe.loading = "eager";
      iframe.className = "playverse-dailymotion-fallback-frame";
      mount.appendChild(iframe);
      onReadyRef.current?.(null);
    };

    const initialize = async () => {
      try {
        await loadDailymotionLibrary(playerId);
        if (!active) return;
        if (!window.dailymotion?.createPlayer) throw new Error("Dailymotion Player API is unavailable");

        const created = await window.dailymotion.createPlayer(mount.id, {
          ...(videoId ? { video: videoId } : {}),
          ...(playlistId ? { playlist: playlistId } : {}),
          params: { autoplay: true },
        });

        // A route change or StrictMode cleanup may happen while createPlayer is
        // pending. Never attach that stale instance to a newer React render.
        if (!active) {
          try { await created.destroy?.(); } catch { /* stale player teardown */ }
          return;
        }

        player = created;
        onReadyRef.current?.(player);
        // Autostart is requested through the official SDK runtime parameter.
        // Also attempt play after initialization; browsers may still require
        // a viewer gesture when audible autoplay is blocked.
        void created.setVolume(1).catch(() => undefined);
        void created.play().catch((error) => {
          console.info("Dailymotion autoplay requires a user gesture:", error);
        });

        const refresh = (eventState?: DailymotionState) => {
          if (!active) return;
          if (eventState && typeof eventState === "object") onStateRef.current?.(eventState);
          void player?.getState().then((state) => {
            if (active) onStateRef.current?.(state as DailymotionState);
          }).catch(() => undefined);
        };

        [
          "VIDEO_PLAYING", "VIDEO_PLAY", "VIDEO_PAUSE", "VIDEO_TIMECHANGE",
          "VIDEO_DURATIONCHANGE", "VIDEO_BUFFERING", "PLAYER_VOLUMECHANGE",
          "PLAYER_PLAYBACKSPEEDCHANGE", "PLAYER_VIDEOCHANGE",
        ].forEach((eventName) => {
          const handler = (state?: any) => refresh(state);
          listeners.push([eventName, handler]);
          player?.on(eventName, handler);
        });
        refresh();
      } catch (error) {
        if (!active) return;
        console.warn("Dailymotion Player API failed; using the hosted iframe.", error);
        showIframeFallback();
      }
    };

    onReadyRef.current?.(null);
    void initialize();

    return () => {
      active = false;
      onReadyRef.current?.(null);
      if (player) {
        listeners.forEach(([eventName, handler]) => {
          try { player?.off?.(eventName, handler); } catch { /* ignore listener cleanup */ }
        });
        // Remove our isolated mount synchronously. Dailymotion never shares a
        // React-managed node, so its asynchronous destroy cannot race React's
        // reconciliation and trigger removeChild NotFoundError.
        const stalePlayer = player;
        player = null;
        mount.remove();
        try { void stalePlayer.destroy?.().catch(() => undefined); } catch { /* ignore teardown */ }
      } else {
        mount.remove();
      }
    };
  }, [playerId, videoId, playlistId]);

  const validId = /^[a-zA-Z0-9]+$/.test(playerId.trim());
  if (!validId || (!videoId && !playlistId)) {
    return <div className="playverse-dm-message" role="alert">Dailymotion Player ID or video information is missing.</div>;
  }

  return (
    <section className="playverse-dailymotion-shell" aria-label="Dailymotion video player">
      <div ref={mountRootRef} className="playverse-dailymotion-mount-root" />
      <style jsx>{`
        .playverse-dailymotion-shell { position:relative;width:100%;aspect-ratio:16/9;min-height:220px;overflow:hidden;background:#000;isolation:isolate; }
        .playverse-dailymotion-mount-root { position:absolute;inset:0;width:100%;height:100%; }
        .playverse-dailymotion-sdk-mount { position:absolute;inset:0;display:block;width:100%;height:100%;border:0;background:#000; }
        .playverse-dailymotion-sdk-mount iframe,.playverse-dailymotion-fallback-frame { position:absolute;inset:0;display:block;width:100%;height:100%;border:0;background:#000; }
        .playverse-dm-message { display:flex;min-height:220px;align-items:center;justify-content:center;padding:24px;color:#fff;background:#090909;text-align:center; }
      `}</style>
    </section>
  );
}
