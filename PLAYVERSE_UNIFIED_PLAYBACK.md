# PlayVerse Unified Playback and Social Video Intake

## Product rule

Every PlayVerse watch page uses the same outer cinema shell: black 16:9 stage, responsive rounded frame, consistent page spacing, Theatre and Fullscreen actions, and the same title/series/reactions/comments area. Source adapters may change the playback technology, but must not create a separate watch-page design.

## Playback modes

### PlayVerse-hosted media
For media uploaded by the owner or supplied with documented hosting rights, PlayVerse can use its own HTML5/HLS player. This is the path for consistent PlayVerse controls, adaptive bitrate, CDN delivery, server-side transcoding, captions, resume position and reliable prebuffering. A source URL alone does not mean PlayVerse has stored or optimized the media.

### Provider-hosted media
YouTube, Vimeo, Dailymotion and public social posts can be played through their supported player/embed integrations. The PlayVerse shell remains consistent, while provider controls and playback restrictions remain inside the provider iframe/API. A provider may reject embedding, require login, remove a post, restrict a region or disable playback; the UI should offer a clear “Watch at source” fallback.

## Social source workflow

Studio ClipExtract should recognize public video-post URLs from X, Facebook, Instagram and TikTok as source candidates. These are **source references**, not extracted/downloaded files. Editors can review the source, add title/description/category/thumbnail, and publish the post to Shorts or Trending only after checking rights, attribution and availability.

Do not bypass private access, DRM, login restrictions, platform safeguards or download restrictions. If PlayVerse later hosts an authorized copy, the editor must provide an upload or rights-cleared media file and the backend can process it into adaptive streaming formats.

## YouTube playlist import

A playlist import should create one PlayVerse series/collection record and ordered episode records, rather than publishing every item as an unrelated title. Keep the playlist/source ID and episode order. Public playlist metadata and items can be retrieved using the YouTube Data API when a configured API key is available; the playlist embed remains a fallback when API metadata is unavailable.

## Buffering and preload

For hosted HLS assets, use adaptive bitrate playback and a bounded forward buffer. Preload metadata/poster on discovery cards, not entire movies. Begin media buffering when a viewer opens a watch page or presses Play, and retain the source's native streaming behavior for external embeds. Browser autoplay and data-saving policies must be respected.
