# Dailymotion playback controls

The Dailymotion watch page now attempts to initialize the official Dailymotion Player Library Script using the configured Player ID. This exposes the official Web SDK so the PlayVerse control row can call `play`, `pause`, `seek`, `setVolume`, and `setPlaybackSpeed`, and listen for playback/time/volume/buffering events.

If the library or player initialization fails or takes longer than 14 seconds, the component falls back to the hosted Dailymotion iframe URL. Video playback therefore remains available, but PlayVerse's external playback controls are disabled in fallback mode; the native controls inside Dailymotion remain usable.

The configured Player ID, selected video ID, and playlist ID are passed through unchanged. YouTube and Vimeo player implementations are not modified.
