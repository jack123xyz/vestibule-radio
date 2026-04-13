# Vestibule Community Radio

A 24/7 internet radio station powered by music posted in our Discord thread. Community members drop YouTube and Spotify links, and the system automatically downloads, rotates, and streams them to a public website.

## Status

Early development. We're building this together as a community project.

| Decided | |
|---------|---|
| Discord bot | Python, polling (cron-based) |
| Audio downloader | yt-dlp + spotdl |

| Still deciding | Options |
|----------------|---------|
| Playout engine | Liquidsoap · AzuraCast (Tentitively decided) · Custom ffmpeg pipeline |
| Stream server | Icecast2 · Bundled (AzuraCast) · Nginx + HLS |
| Data visualization | D3.js · vis.js · Cytoscape.js · other |
| Frontend | Static HTML/CSS/JS · Svelte · Vue · Astro |

## How it works

```
Discord Thread → Bot → Downloader → Music Dir → Playout Engine → Stream Server → Web Player
                                         ↑                                          ↓
                                    Interstitials                              Taste Map
                                  (DJ, skits, host clips)                  (who likes what)
```

1. A bot polls the Discord music thread for YouTube/Spotify links
2. yt-dlp and spotdl download the audio as MP3 into a shared music directory
3. A playout engine shuffles the tracks, crossfades between them, and can insert interstitial clips between songs (DJ intros, skits, host segments, whatever)
4. A stream server serves the audio over HTTP
5. A web frontend lets anyone hit play and listen, shows what's currently playing and how many people are tuned in
6. A taste map page shows a graph of whose music taste overlaps

## Project structure

```
vestibule-radio/
├── scraper/          # Discord bot + audio downloader (Python)
├── streaming/        # Playout engine + stream server config
│   └── systemd/      # Service files for process management
├── web/              # Public frontend (player + taste map)
├── clips/            # Interstitial audio (DJ, skits, station IDs)
├── music/            # Downloaded MP3 files (gitignored in production)
├── data/             # Track metadata (tracks.json, seen_links.json)
└── docs/             # Architecture, guides, reference
```

## Links

- [Architecture](docs/ARCHITECTURE.md) - how everything works under the hood
- [Contributing](CONTRIBUTING.md) - how to get involved (devs and non-devs)
- [Ownership](OWNERSHIP.md) - who's working on what
- [Project Board](https://github.com/jack123xyz/vestibule-radio/projects) - task tracking

## License

Uhh this project is kinda illegal
