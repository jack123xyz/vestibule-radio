# Contributing

Whether you write code, record audio, design visuals, or just have ideas.. there's a place for you here.

## If you're a developer

Browse the [issues](https://github.com/jack123xyz/vestibule-radio/issues). Anything labeled `good first issue` is a solid starting point. Pick something, open a PR, and tag someone for review.

## If you're not a developer

You don't need to know git.

- **Record audio clips** for between songs: station IDs, DJ intros, the story behind a song you posted. Drop them in `` on Discord.
- **Design stuff**: mockups, logos, color schemes, branding ideas. Share in ``.
- **Listen and give feedback**: report bugs in ``, suggest features, tell us what's working.
- **Post music**: drop YouTube/Spotify links in the music thread. That's literally what powers the station.

## Getting started (devs)

Clone it:

```bash
git clone https://github.com/jack123xyz/vestibule-radio.git
cd vestibule-radio
```

Read the [architecture doc](docs/ARCHITECTURE.md) so you know how the pieces fit together. Check [OWNERSHIP.md](OWNERSHIP.md) to see what's claimed and what needs help.

To set up the Python scraper locally:

```bash
cd scraper
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

You'll need a `.env` file:

```
DISCORD_BOT_TOKEN=your_token_here
DISCORD_CHANNEL_ID=your_channel_id_here
```

## Opening a PR

1. Branch off `main` (don't push to main directly)
2. Make your changes
3. Open a PR, describe what you did and why
4. Get at least one review, then merge

Keep PRs small and focused. Easier to review, easier to merge.

Commit messages should be short and clear. `Add Spotify URL regex` is good. `updated stuff` is not.

## Issue labels

| Label | What it means |
|-------|---------------|
| `bot` | Discord bot and link scraping |
| `downloader` | yt-dlp/spotdl audio pipeline |
| `streaming` | Playout engine and stream server |
| `frontend` | Web player and taste map |
| `infra` | VPS, deployment, systemd, DNS, SSL |
| `creative` | Interstitial content, branding, design |
| `docs` | Documentation and guides |
| `good first issue` | Small, scoped, good for new contributors |
| `help wanted` | Bigger tasks that need someone to own them |
| `discussion` | Open decisions that need group input |

## Discord channels? (Undecided)

| Channel | What it's for |
|---------|---------------|
| `#radio-announcements` | Weekly updates, milestones (read-only) |
| `#radio-dev` | Technical stuff, PR reviews, debugging |
| `#radio-creative` | Audio clips, design, branding, DJ ideas |
| `#radio-feedback` | Bug reports, feature requests, listener vibes |

## Code of conduct

Be kind. This is a community project built for fun. Disagreements about technical decisions are fine.. keep them respectful and focused on the work. The project lead makes final calls when consensus can't be reached. Any music submitted that isn't 'girly pop' will be brutually roasted by Finn.

## Questions?

Ask in ` ` on Discord or open a GitHub Issue with the `discussion` label.
