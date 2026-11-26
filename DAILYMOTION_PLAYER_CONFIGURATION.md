# Dailymotion player configuration for PlayVerse

PlayVerse deliberately uses Dailymotion's hosted Player iframe. Dailymotion owns the controls inside that cross-origin iframe, so PlayVerse cannot draw or force those controls from its own CSS or React code.

The current PlayVerse integration uses:

- Player ID: `x2tvvg9`
- Playlist ID: `x814o4`
- The selected Dailymotion video ID as the initial video
- The Dailymotion hosted iframe endpoint: `https://geo.dailymotion.com/player/{PLAYER_ID}.html`

## Enable the interface shown in the reference screenshot

In Dailymotion Studio:

1. Open **Embeds → Players**.
2. Select the Player whose ID is `x2tvvg9`.
3. Open its configuration and enable the following options:

| Dailymotion Studio setting | Set to | What it enables |
|---|---:|---|
| Player controls | **On** | Native play/pause, timeline, volume, settings and fullscreen controls |
| Video info | **On** | Video title and uploader name while paused or before playback |
| Profile link | **On** | Makes the uploader name clickable |
| Video title link | **On** | Makes the video title clickable |
| Share button | **On** | Native share icon |
| Enable/Disable Subtitles | **On** | Subtitles option in the native player controls |
| Picture-in-Picture | **On** (optional) | Floating-player capability where supported |

4. Save the Player configuration.
5. Use **Full Preview** in Dailymotion Studio to verify desktop, tablet and mobile layouts.
6. Reload the PlayVerse watch page.

**Important:** Dailymotion only displays title/uploader information when the video is paused or the Player has not started. The controls may auto-hide during playback and reappear when the viewer moves the pointer over the Player or pauses it. This is normal native-player behaviour.

## Playlist navigation

PlayVerse passes both the selected video ID and playlist ID `x814o4` to the hosted Player. Previous/next navigation is available only when Dailymotion recognizes the playlist and the playlist contains navigable videos. Confirm the playlist is public/embeddable and contains the expected videos.

## What PlayVerse can and cannot configure

PlayVerse supplies the Player ID, initial video ID and playlist ID. The Dailymotion Studio Player configuration controls the native interface. Because the iframe is hosted on `geo.dailymotion.com` and is cross-origin, PlayVerse cannot switch on Dailymotion's internal controls using CSS or React props.

The Dailymotion settings above are account-side settings; this project ZIP cannot change them in your Dailymotion Studio account.

## Local configuration

Keep the existing `.env` file. The project should have:

```dotenv
NEXT_PUBLIC_DAILYMOTION_PLAYER_ID=x2tvvg9
NEXT_PUBLIC_DAILYMOTION_PLAYLIST_ID=x814o4
```

Restart the Next.js server after changing `.env` values.
