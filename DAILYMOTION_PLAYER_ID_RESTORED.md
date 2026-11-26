# Dailymotion Player ID restored

The current PlayVerse player architecture and shared player UI are preserved.
The Dailymotion source resolver now uses the established hosted Player ID
`x2tvvg9` when `NEXT_PUBLIC_DAILYMOTION_PLAYER_ID` is not set. Render may
override it through the environment variable. The selected video and configured
playlist remain passed to the dedicated Dailymotion player.

No Google Drive, YouTube, X/Twitter, aspect-ratio, control-bar, source-switching,
or layout code was changed for this fix.
