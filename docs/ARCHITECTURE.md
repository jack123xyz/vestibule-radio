# Architecture

How Vestibule Community Radio works, from Discord post to audio in your browser.

Read this before picking up any issues. It'll save you a lot of "wait, how does this connect to that?"

## The Pipeline

```
Discord Thread → Bot → Downloader → Music Dir + tracks.json
                                           |
                                           v
                    Clips Directory → Playout Engine → Stream Server → Web Frontend
                                           ↑                              |
                                      pick_next.py                   Player + Taste Map
                                      (smart queue,                      |
                                       feedback weights)           Feedback API → feedback.json
```

Each component is described below.

## Discord Bot

Python. Polling mode (runs on a cron, not a persistent connection). Decided.

Connects to Discord, pulls message history from the music thread, finds YouTube and Spotify links with a regex, and records who posted each one. Checks new URLs against `data/seen_links.json` to avoid re-downloading stuff we already have, then hands new URLs off to the downloader.

URL patterns: `youtube.com/watch?v=`, `youtu.be/`, `open.spotify.com/track/`. Strips playlist params like `&list=` so we only grab the single video. Handles multiple links per message (each credited to the same poster) and URLs wrapped in `<brackets>` or markdown.

Runs every 30 minutes via systemd timer. Connects, scrapes, exits.

## Audio Downloader

yt-dlp for YouTube, spotdl for Spotify. Decided.

Takes a URL, downloads the audio as an MP3 (192kbps), and drops it in the `/music` directory. Filenames get sanitized since track titles regularly contain characters that break file paths.

After download, reads ID3 tags from the MP3 using `mutagen` to pull out title, artist, album, genre, and duration. YouTube metadata is hit or miss here. The artist field might just be the channel name, or the title might be "Artist - Song Title" with empty tags. The downloader tries the tags first and falls back to parsing the video title.

Writes an entry to `data/tracks.json` for every successful download:

```json
{
  "id": "a7f3b2c1",
  "url": "https://youtube.com/watch?v=dQw4w9WgXcQ",
  "title": "Never Gonna Give You Up",
  "artist": "Rick Astley",
  "album": "Whenever You Need Somebody",
  "genre": "pop",
  "posted_by": "Darren",
  "posted_at": "2026-04-10T18:32:00Z",
  "downloaded_at": "2026-04-10T19:00:12Z",
  "file": "music/Rick Astley - Never Gonna Give You Up.mp3",
  "duration_seconds": 213,
  "source": "youtube"
}
```

`album` and `genre` will be null sometimes, especially for YouTube downloads where the uploader didn't bother with tags. That's fine. The taste map and any future features should handle missing fields gracefully.

## tracks.json

A flat JSON file. The downloader writes to it, everything else reads from it. Not a database, just an array of track objects.

Readers:
- Playout engine (what songs are available)
- Interstitial generator (who posted this, what artist)
- Taste map (the whole visualization is built from this)
- Web player (optionally, for richer now-playing info)

Only the downloader writes. One writer, many readers, no locking issues.

If we outgrow a JSON file (concurrent writes, complex queries, hundreds of tracks), the natural upgrade is SQLite. Postgres if the project scope gets much bigger. But JSON is the right starting point.

## Interstitials

A `/clips` directory full of short MP3s (5-30 seconds) that get played between songs. The playout engine grabs one and inserts it before the next track.

What goes in here is wide open:
- AI DJ intros from a text-to-speech engine
- Someone recording "here's why I love this band" on their phone
- Skits, station IDs, weird ambient noises, whatever
- The person who posted the song explaining the story behind it

The playout engine doesn't know or care how these clips were made. It just sees MP3 files. Creative work and technical work are fully decoupled here, which means anyone can contribute audio without touching code.

Two ways to insert them: randomly (any clip every N songs) or paired (a specific clip plays before a specific song, matched by track ID in the filename). We haven't decided which model to start with.

## Playout Engine

**UNDECIDED.** This is the biggest open question. See [issue #5](https://github.com/jack123xyz/vestibule-radio/issues/5).

This is the thing that actually makes it a radio station instead of a folder of MP3s. It picks songs, crossfades between them, injects interstitials, and outputs a continuous audio stream to the stream server. It re-scans the music directory every ~10 minutes so new downloads show up without a restart. If the music dir is empty, it needs to play silence or a placeholder instead of crashing.

Three options on the table:

**Liquidsoap** is a scripting language built specifically for radio automation. It handles crossfading, jingles, dynamic playlists, metadata, and failovers natively. Community radio stations have used it for 15+ years. The catch is that it's its own language with its own syntax, and the docs range from great to nonexistent. Version 2.x broke a lot of 1.x examples you'll find online.

**AzuraCast** is a Docker image that bundles Liquidsoap, Icecast, a web admin panel, and a REST API. You `docker-compose up` and you have a radio station. The admin UI is nice for non-technical people. The tradeoff is less flexibility for custom stuff (paired interstitials, creative scheduling, the smart queue, feedback-weighted song selection) and heavier resource usage. You also end up writing Liquidsoap config anyway if you want anything beyond the defaults. See the Smart Queue section below for specifics on where AzuraCast falls short.

**Custom ffmpeg pipeline** means writing our own playout logic in Python or Node, piping audio through ffmpeg. Full control in a familiar language. The problem is that crossfading, gapless playback, and error recovery are genuinely hard problems, and we'd be building a worse version of Liquidsoap from scratch.

## Stream Server

**UNDECIDED.** Linked to the playout engine decision. See [issue #6](https://github.com/jack123xyz/vestibule-radio/issues/6).

Takes the audio feed from the playout engine and serves it to listeners over HTTP. Also exposes a metadata endpoint (current track, listener count) that the frontend polls.

At 192kbps, each listener is about 24 KB/s of bandwidth. 100 concurrent listeners would be ~2.4 MB/s. A cheap VPS handles that easily.

**Icecast2** is the standard. Lightweight, reliable, has a JSON status endpoint at `/status-json.xsl`. Config is an XML file, which is annoying but you only write it once. Doesn't handle SSL on its own so you need Nginx or Caddy in front.

**AzuraCast** bundles Icecast, so if we go that route for the playout engine this is already handled.

**Nginx + HLS** serves chunked audio segments instead of a continuous stream. Better for flaky mobile connections but adds 10-30 seconds of latency and a lot of setup complexity. Overkill for us.

## Web Player

A page with an `<audio>` tag pointed at the stream URL. Play/pause button, now-playing display (title, artist, who posted it), listener count, volume slider, and thumbs up/down buttons for the current track.

The now-playing info comes from polling the stream server's metadata endpoint every few seconds. The playout engine pushes metadata like `"Rick Astley - Never Gonna Give You Up (posted by Darren)"` to the stream server, and the frontend JS parses that string apart for display. The track ID is also included in the metadata so the frontend knows which track to attach votes to.

Frontend stack is undecided. See [issue #11](https://github.com/jack123xyz/vestibule-radio/issues/11).

## Taste Map

A visual graph showing who posted what and where tastes overlap.

The frontend fetches `tracks.json`, pulls out unique users and artists, and draws a force-directed network graph. Users are nodes, artists are nodes, edges connect a user to the artists they posted. The physics simulation pulls connected nodes together, so people who post the same artists naturally cluster near each other.

Hover shows connections, click for detail, zoom and pan to explore. Library is undecided. See [issue #12](https://github.com/jack123xyz/vestibule-radio/issues/12).

The `genre` field in tracks.json could also feed into this, letting us color-code nodes or add genre clusters to the visualization. That's a future enhancement though.

## Listener Feedback

Thumbs up / thumbs down on whatever's currently playing. Votes influence how often a song comes up in rotation.

Votes get stored in `data/feedback.json`, keyed by track ID:

```json
{
  "a7f3b2c1": { "up": 12, "down": 3 },
  "b8e4c3d2": { "up": 1, "down": 7 }
}
```

The frontend shows two buttons while a song is playing. When someone votes, it sends a POST to a small API endpoint on the VPS (a lightweight Python server, Flask or FastAPI) that updates the tally. We need this API because the rest of the frontend is static files with no backend.

The `pick_next.py` script (which the playout engine calls to choose the next song) reads `feedback.json` and uses the vote ratio to weight songs. Popular songs play more often, disliked songs play less. A song with 1 up / 7 down might come up once a week instead of once a day. Nothing ever gets fully removed automatically, but we could add a hard removal threshold later if the group wants that.

How we identify voters is undecided. Options range from fully anonymous (easy to abuse), to cookie-based (one vote per browser per song, prevents casual spam), to Discord OAuth (one vote per account, most reliable but adds login friction). See [issue #13](https://github.com/jack123xyz/vestibule-radio/issues/13).

## Smart Queue

Pure random shuffle has problems. Same song twice in a row, same artist three times in an hour, a cluster of slow tracks back to back. The queue needs to be smarter than that.

The fix is `pick_next.py`, a Python script that the playout engine calls when it needs the next song. Instead of uniform random, it does weighted random with constraints:

1. Load `tracks.json` (all songs) and `feedback.json` (vote weights)
2. Load `data/recent_plays.json` (the last N track IDs that played)
3. Filter out anything in the recently-played buffer
4. Penalize songs by the same artist if that artist played recently (half weight if same artist came up in the last 5 songs)
5. Weighted random selection from what's left
6. Update `recent_plays.json` with the pick
7. Return the file path to the playout engine

The recently-played buffer is the key piece. If the buffer holds 10 track IDs, you're guaranteed at least 10 different songs before anything repeats. The buffer size should scale with library size so it doesn't deadlock a small collection (e.g. `min(10, library_size / 2)` -- if you only have 6 songs, the buffer is 3, not 10).

Songs start at weight 1.0. Upvotes push it higher, downvotes push it lower. New songs get the same starting weight as everything else so they get fair rotation from the moment they're downloaded.

### How this interacts with the playout engine decision

This is worth flagging: the smart queue relies on an external script (`pick_next.py`) controlling what plays next. Not all playout options support that equally.

**Liquidsoap** has `request.dynamic`, which calls an external script every time it needs a new track. You point it at `pick_next.py`, it runs, prints a file path, and Liquidsoap plays it. All the intelligence lives in Python. This is the cleanest fit.

**AzuraCast** doesn't support this out of the box. Its shuffle is basic (randomize within a playlist, basic duplicate prevention, no external scoring or artist cooldown). It doesn't know about `feedback.json` or our weighting system. You could drop into AzuraCast's Advanced Playlist mode and write raw Liquidsoap config to wire up `request.dynamic` yourself, but at that point you're bypassing AzuraCast's playlist management and just using it as a container for Liquidsoap and Icecast. You could also hack around it by using AzuraCast's REST API to periodically reorder the playlist externally, but that's fighting the tool.

**Custom ffmpeg pipeline** would call `pick_next.py` directly since you control the whole loop. No friction, but you still have all the other problems with building your own playout engine.

If the smart queue and feedback weighting are important (and they are), that's a real point in favor of Liquidsoap over AzuraCast. Worth considering when the group votes on [issue #5](https://github.com/jack123xyz/vestibule-radio/issues/5).

## Infrastructure

All of this runs on a single Linux VPS.

The playout engine and stream server run as systemd services so they survive reboots and restart on failure. The bot runs on a systemd timer. Nginx or Caddy sits in front of the stream server for SSL termination. Domain points at the box, Let's Encrypt handles the cert.

Disk usage is minimal. MP3 at 192kbps is about 1.5 MB per minute of audio. A few hundred songs fits comfortably in a few GB.

## Data Flow (end to end)

```
Someone posts a YouTube link in the Discord thread
  → bot picks it up on its next cron run
    → downloader grabs the audio, reads ID3 tags
      → MP3 saved to /music, metadata written to tracks.json
        → playout engine asks pick_next.py for the next song
          → pick_next.py checks tracks.json, feedback.json, and recent_plays.json
            → returns a weighted random pick, avoiding repeats
              → playout engine plays it (maybe with a clip before it), pushes metadata to stream server
                → stream server sends audio to anyone listening
                  → web player shows what's playing, listeners vote thumbs up/down
                    → votes hit the feedback API, update feedback.json
                      → next time pick_next.py runs, it factors in the new votes
```
