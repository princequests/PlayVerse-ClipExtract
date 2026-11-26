# PlayVerse product and media flow

## Product structure

PlayVerse has three connected surfaces: the public viewer, PlayVerse Studio, and ClipExtract (a sourcing workspace inside Studio). The public viewer never exposes extraction or editorial controls. All content enters one catalogue and uses a common playback-source model.

## Editorial intake flow

1. **Source** — select YouTube, Vimeo, Dailymotion, Google Drive, Direct URL, or ClipExtract; paste the link.
2. **Inspect** — explicitly inspect the URL. Detect provider and content shape, then retrieve only metadata the provider or page makes available. Do not fabricate missing fields.
3. **Review details** — editor can change title, description, artwork, category, content kind, language, age rating, tags, duration, and parent series/season/playlist.
4. **Review playback** — validate source, select primary and alternative sources, and preview the player mode.
5. **Publish** — draft by default; then publish, schedule, feature, or archive.

A failed inspection must not erase the pasted URL or draft. It should return a readable reason and allow manual metadata entry when the source is otherwise valid.

## Content model principles

- One PlayVerse content item can have multiple source records.
- Each source stores provider, URL, label, primary flag, and playback mode.
- Content type and editorial category are separate: Episode belongs to a Series/Season; Shorts, News, and Live have dedicated shelves.
- Provider identity is not the editorial category. The YouTube shelf is source-filtered; YouTube-sourced content can still be a film, episode, news clip, or short.
- ClipExtract import creates a draft or appends a source to an existing item; it never publishes automatically.

## Provider behaviour

- **YouTube:** official embed/player and supported channel/playlist metadata; do not attempt to extract protected raw video.
- **Vimeo / Dailymotion:** provider-native or supported embed playback.
- **Google Drive:** authenticated/permission-aware file links; validate share access and playback compatibility.
- **Direct URL:** allow only compatible public media URLs or trusted hosted media.
- **ClipExtract:** scan permitted public pages for candidate media and metadata; surface multiple candidates and source attribution. DRM, private sessions, bot protections, and inaccessible JavaScript streams may only be detected or linked, not universally downloaded.

## Mobile viewer principles

- Responsive 2-column poster grid on phones, larger editorial layouts on tablet/desktop.
- Fixed, safe-area-aware quick navigation with large touch targets.
- Keep search accessible, controls uncluttered, and the hero CTA reachable without excessive scrolling.
- Respect reduced-motion preferences and maintain readable contrast.

## Live flow

Create/schedule event in Studio → select supported provider → attach official stream/embed URL → preview metadata and player → publish event page → show in Live shelf when active. The initial product is an embedded live directory; native ingest/RTMP relay is a later, separately scoped feature.

## Roadmap

1. Finish public discovery and mobile experience.
2. Stabilise source-first editorial intake and provider playback.
3. Add YouTube channel/playlist curation and batch item creation.
4. Expand ClipExtract adapters, candidate selection, attribution, and authorised Drive storage.
5. Add series/season, shorts/news source inbox, scheduling, and live event management.
