# PlayVerse — Phase 3: PlayVerse Studio 2.0

## Install the update
1. Stop the running Next.js server with Ctrl+C.
2. Extract this ZIP into `C:\FlutterProjects\PlayVerse`, replacing the existing source files.
3. Open PowerShell in the project directory and run:

```powershell
npm install
npx prisma generate
npx prisma migrate dev --name studio_2
```

The migration extends the existing Content model and creates Category and Genre tables. It preserves existing catalogue records.

Then start the site:

```powershell
npm run dev
```

Use the port printed by Next.js:
- Website: `http://localhost:3000`
- Studio: `http://localhost:3000/admin`

## Phase 3 features
- PlayVerse Studio navigation for movies, series/episodes, anime, cartoons, shorts, music, channels, manga/comics, podcasts and collections.
- One unified content record model with category, format, metadata, tags, status, artwork and featured flag.
- Multiple playback/source URLs per entry, each with label, provider, primary selection and playback mode.
- Provider auto-detection for YouTube, Vimeo, Dailymotion, direct MP4/M3U8/WebM and external websites.
- Category and genre creation from the taxonomy manager.
- Parent/child content relationship in the database for series, seasons and episodes.
- Public watch detail pages with supported YouTube, Vimeo, Dailymotion and direct MP4/WebM playback; HLS may depend on browser support.
- External viewing fallback for providers that cannot be embedded.
- Public catalogue continues to show only Published entries.

## Important
This remains a local development build. The admin APIs do not yet have authentication or role-based access control. Do not expose this server publicly or deploy it as production until authentication, authorization, validation hardening, upload security, rate limits and operational safeguards are implemented.

The Series & Episodes module is currently a content catalogue and the database supports parent/child relationships. A dedicated season/episode tree editor is a follow-on enhancement. The current taxonomy manager supports category and genre creation/deletion; category assignment on content entries is currently entered as text.

Use only media, links, and artwork you own or are authorised to use. Embedded playback depends on each provider's terms, permissions and embed availability.


## Phase 4 — Featured hero carousel

The Discover hero is now a featured-content carousel:
- Uses only published records flagged `featured` (with a single-item fallback if no entries are featured).
- Auto-advances every 7 seconds when there is more than one featured item.
- Pauses on hover and keyboard focus.
- Previous/next controls and clickable slide indicators.
- Touch swipe support on mobile.
- Watch Now opens the PlayVerse watch detail page.
- Carousel count is based on the actual featured item count.

To apply this update, stop Next.js with Ctrl+C, replace the project files from this ZIP, then run `npm run dev`. No database migration is required.

For a visible multi-slide test, edit at least two published content entries in Studio and enable **Feature on homepage** for each. The carousel will then rotate through those entries. Draft and archived entries never appear in the public hero.


## Phase 5 — Playback and category-flow repair

This update:
- Uses a client-side player so playback-source switching and media errors are handled correctly.
- Supports YouTube watch, youtu.be, Shorts, live and playlist URLs.
- Supports Vimeo and Dailymotion embed URLs.
- Supports direct MP4/WebM/OGV and HLS `.m3u8` streams via hls.js where the browser permits it.
- Adds source switching for entries with multiple URLs.
- Shows a clear external-watch fallback for providers that disallow embedding or unsupported URLs.
- Adds parent selection in Studio so Episodes can be assigned to a Series, and Seasons to a Series; episodes can be assigned to a Season.
- Shows published child entries as selectable episode/related-content rows.
- Connects taxonomy categories to the content category picker and exposes custom categories in the public navigation/discovery sections.

### Apply
Stop Next.js with Ctrl+C. Extract this ZIP over the existing `C:\\FlutterProjects\\PlayVerse` folder. Then:

```powershell
npm install
npx prisma generate
npm run dev
```

No Prisma schema migration is required by this update.

### Important playback facts
A URL being accepted does not mean the host allows third-party embedding. Private, age-restricted, region-blocked, removed, or embed-disabled videos may not play inside PlayVerse. The source switcher and external fallback help with those cases. For YouTube series, add a playlist URL when you want a series playlist experience; for manually managed episodes, create a Series entry and add each Episode with its parent set to that Series (or to a Season).


## PlayVerse captions
Studio content editor accepts multiple `.vtt` and `.srt` subtitle files per title. Choose language labels and one default track; SRT files are converted to WebVTT when saved. Captions are stored in PostgreSQL and displayed by the PlayVerse caption overlay for direct MP4 and HLS playback. YouTube, Vimeo and Dailymotion remain embedded provider players; their own caption systems are used because their cross-origin iframe timelines cannot safely drive PlayVerse's independent subtitle overlay.

## Dailymotion player reliability update

Dailymotion now uses its hosted Player page directly in an isolated iframe (`geo.dailymotion.com/player/{Player ID}.html`) instead of relying on dynamically inserting the Embed Script into a React-managed container. This keeps Dailymotion's native player UI and avoids the Embed Script initialization path that previously remained stuck on the loading screen. The player has a retry action and an external Dailymotion fallback if the hosted player does not respond.

No database migration is required. Keep your existing `.env` and `NEXT_PUBLIC_DAILYMOTION_PLAYER_ID` value. Stop Next.js, extract this ZIP over the existing project, then run `npx prisma generate` and `npm run dev`.


## Dailymotion native player (dedicated integration)

Dailymotion now uses its own hosted Player iframe with the Player ID from
`NEXT_PUBLIC_DAILYMOTION_PLAYER_ID` (keep your existing `.env`; the expected
Player ID in this setup is `x2tvvg9`). Its native controls are owned by
Dailymotion and PlayVerse does not overlay its own dock. YouTube and Vimeo are
unchanged. See `DAILYMOTION_DEDICATED_PLAYER.md` for the Player configuration
needed to keep Dailymotion's native controls enabled. No database migration is
required.

## Dailymotion native player appearance

PlayVerse embeds Dailymotion's hosted player in an iframe. The player UI is rendered inside Dailymotion's cross-origin frame, so PlayVerse CSS cannot draw or force its native title bar, queue buttons, share button, subtitles, settings, timeline, volume, or fullscreen controls. Those options are controlled by the Dailymotion Player configuration associated with `NEXT_PUBLIC_DAILYMOTION_PLAYER_ID`.

In Dailymotion Studio, open **Embeds → Players**, edit the Player whose ID is `x2tvvg9`, and enable:

- **Player controls**
- **Video info** (video title and uploader)
- **Share button**
- **Subtitles** (if subtitles are available for the video)
- **Video title link** / **Profile link**, if desired
- Keep the playlist/queue feature available.

PlayVerse passes the current Dailymotion video together with playlist `x814o4` by default, so Dailymotion can provide its own queue and previous/next navigation. To change the default playlist, set `NEXT_PUBLIC_DAILYMOTION_PLAYLIST_ID` in `.env`. The existing `NEXT_PUBLIC_DAILYMOTION_PLAYER_ID` remains `x2tvvg9`. Restart the Next.js server after changing `.env`.

Use the Dailymotion Studio **Full Preview** to confirm the native UI configuration before testing it in PlayVerse.


## Phase 6 — PlayVerse Clip Extract

PlayVerse now includes a **Clip Extract** utility at `/extract` and a shortcut in the main navigation. Enter a publicly accessible webpage URL to identify common direct video sources (`video`/`source` tags, Open Graph video metadata, and direct media links). Results provide Open and Save links.

### Deployment

This feature is part of the existing Next.js application, so deploy the updated repository using the same Render web service and GitHub repository. No separate Express service or extra Render service is required. The new endpoint is `/api/extract`; it runs in the Node.js runtime.

After replacing/updating the project:
```bash
npm install
npx prisma generate
npm run build
```
No database migration is needed for Clip Extract.

### Known limitations and safety

- This is a source-link detector, not a universal downloader.
- JavaScript-rendered players, DRM, authenticated content, and HLS/DASH manifests may not produce downloadable single-file links.
- Some hosts prevent cross-origin browser downloads; the Save link may open the media instead.
- The endpoint accepts public HTTP(S) pages, blocks private/reserved addresses, rejects redirects, and limits page scans to 2 MB / 12 seconds.
- For production, configure outbound network restrictions and rate limiting at the hosting layer; DNS validation alone is not a complete defense against DNS rebinding.
- Use only media you own or have permission to access and download.
