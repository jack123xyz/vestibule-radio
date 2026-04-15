# Architecture

How Vestibule Community Radio works.

```
Discord Thread → Bot → Downloader → music/ + tracks.json → Liquidsoap → Icecast → Listeners
```

## What's running now

**Liquidsoap** shuffles tracks from the `music/` directory, crossfades between them, normalizes volume, skips blanks, and outputs an MP3 stream.

**Icecast** receives the stream from Liquidsoap and serves it to listeners over HTTP at `/stream`. It also exposes metadata (current track, listener count) at `/status-json.xsl`.

Both run via Docker Compose. Config is in `docker-compose.yml`, Liquidsoap script is in `streaming/radio.liq`.

## What's not built yet

**Discord bot** (Python, polling via cron). Connects to the music thread, regex-matches YouTube/Spotify links, deduplicates against `data/seen_links.json`, hands URLs to the downloader.

**Audio downloader** (yt-dlp for YouTube, spotdl for Spotify). Downloads MP3 at 192kbps, reads ID3 tags with `mutagen`, writes metadata to `data/tracks.json`.

**Web player**. An `<audio>` tag pointed at the stream, now-playing display, who posted the song, listener count, thumbs up/down.

**Taste map**. Force-directed graph built from `tracks.json` showing who posted what and where tastes overlap.

**Smart queue** (`pick_next.py`). Weighted random selection that avoids repeats, penalizes recently-played artists, and factors in listener votes from `data/feedback.json`. Integrates with Liquidsoap via `request.dynamic`.

## Data files

| File | Purpose |
|------|---------|
| `data/tracks.json` | Every downloaded track: title, artist, who posted it, file path, etc. |
| `data/seen_links.json` | URLs already processed, for deduplication |
| `data/feedback.json` | Thumbs up/down tallies per track |
| `data/recent_plays.json` | Last N track IDs, used by the smart queue to avoid repeats |

## Infra

Sylvan is setting up the production environment on his cluster. Locally, `docker compose up` gets you a working stream.
