# PlayVerse — Dailymotion player

Dailymotion is integrated as its own hosted Player iframe. It does not use the
YouTube or Vimeo wrappers and PlayVerse does not draw a second control bar over
it. Dailymotion owns its native play/pause, timeline, volume, settings,
subtitles and fullscreen UI.

## Configuration

Keep the existing `.env` and set:

```env
NEXT_PUBLIC_DAILYMOTION_PLAYER_ID=x2tvvg9
```

Restart Next.js after changing `.env`.

The player URL follows Dailymotion's current embed format:

```text
https://geo.dailymotion.com/player/{PLAYER_ID}.html?video={VIDEO_ID}
```

For a playlist, use `playlist={PLAYLIST_ID}`. A video and playlist can be sent
together so the selected video plays first and the playlist remains available.

## Native controls

The controls are part of the Dailymotion Player configuration associated with
`x2tvvg9`, not HTML controls that PlayVerse can switch on inside a cross-origin
iframe. In Dailymotion Studio, open the Player configuration for `x2tvvg9` and
make sure its player controls are enabled, then save/publish that configuration.
The change applies to embeds using that Player ID. We intentionally keep all
Dailymotion features enabled for now; no branding, settings, subtitles, or
controls are hidden by PlayVerse.

## Isolation

- YouTube integration is unchanged.
- Vimeo integration is unchanged.
- Dailymotion has its own component and native UI.
- The PlayVerse overlay dock is not rendered over Dailymotion.
- No database migration is required.

Dailymotion controls and playback availability remain subject to the Player
configuration, video privacy/embedding permissions, and Dailymotion account
entitlements.
