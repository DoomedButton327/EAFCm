# Mettlestate × EA FC Mobile League — v5

A self-hosted, mobile-first league management web app for EA FC Mobile. No backend required — runs entirely in the browser, persists to GitHub Pages.

## New Data Structure (v5)

```
data/
├── player-data.json              ← All player records
├── index.json                    ← Index of all match-day paths
└── YYYY-MM/
    └── YYYY-MM-DD/
        ├── match-day.json        ← Fixtures + results for that day
        └── match-images/         ← Evidence screenshots
```

## Quick Setup

### 1. GitHub Pages
1. Fork or push this repo to GitHub
2. Go to **Settings → Pages → Deploy from branch → main / root**
3. Your app will be live at `https://{username}.github.io/{repo}/`

### 2. Discord Webhook
1. In your Discord server: **Server Settings → Integrations → Webhooks → New Webhook**
2. Copy the URL
3. Replace `YOUR_DISCORD_WEBHOOK_URL_HERE` in:
   - `js/config.js`
   - `newplayers/index.html`

### 3. GitHub PAT Token
1. **GitHub → Settings → Developer Settings → Personal Access Tokens → Fine-grained**
2. Required permissions: **Contents** (read + write)
3. Enter in **Admin → GitHub Sync** — never commit the token!

### 4. Gemini OCR (Optional)
1. Visit [aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey)
2. Create a free API key (1,500 req/day)
3. Enter in **Admin → WhatsApp OCR**

## Migration from v4

If you have an existing `league-data.json` from the old season-based structure:

1. Open `https://{your-site}/migrate/`
2. Upload your `league-data.json`
3. Download the converted files
4. Place them in your repo following the new `data/` structure

## File Structure

```
/
├── index.html                    ← Main dashboard
├── newplayers/
│   └── index.html                ← Player self-registration
├── migrate/
│   └── index.html                ← v4 → v5 migration tool
├── data/
│   ├── player-data.json
│   ├── index.json
│   └── YYYY-MM/YYYY-MM-DD/
│       ├── match-day.json
│       └── match-images/
├── css/
│   ├── base.css                  ← Variables, reset, typography
│   ├── layout.css                ← Nav, top bar, sync bar, modals
│   ├── components.css            ← All UI components
│   ├── admin.css                 ← Admin panel, accordions, themes
│   └── animations.css            ← 22 @keyframes
└── js/
    ├── config.js                 ← Constants, SAST utils, SA holidays
    ├── state.js                  ← Global state singleton
    ├── storage.js                ← localStorage abstraction
    ├── github.js                 ← GitHub API (new path system)
    ├── discord.js                ← Discord webhook embeds
    ├── themes.js                 ← 10 themes
    ├── players.js                ← Player CRUD, stats, render
    ├── fixtures.js               ← Fixture gen, postponements, forfeit
    ├── results.js                ← Score logging, evidence, lightbox
    ├── standings.js              ← Leaderboard, podium, exports
    ├── calendar.js               ← Calendar, Mettlestate events, scheduler
    ├── ocr.js                    ← WhatsApp Gemini OCR
    ├── admin.js                  ← Admin panel logic
    └── app.js                    ← Entry point, navigation, init
```

## Themes

10 built-in themes selectable from Admin → Theme:
Godmode · Cyber Blue · Blood Red · Royal Purple · Solar Orange · Arctic · Matrix · Rose Gold · Void · Neon ⚡

## Data Model

### player-data.json
```json
{
  "players": [{ "name": "...", "username": "...", "phone": "...", "played": 0, "wins": 0, "draws": 0, "losses": 0, "points": 0, "gf": 0, "ga": 0, "form": [], "postponements": 20, "suspended": false }],
  "lastUpdated": "ISO"
}
```

### data/index.json
```json
{
  "matchDays": [{ "date": "2026-04-15", "path": "data/2026-04/2026-04-15/match-day.json" }],
  "lastUpdated": "ISO"
}
```

### data/YYYY-MM/YYYY-MM-DD/match-day.json
```json
{
  "date": "2026-04-15",
  "fixtures": [{ "id": 123, "home": "user1", "away": "user2", "postponedBy": null, "scheduledDate": "2026-04-15" }],
  "results":  [{ "id": 124, "home": "user1", "away": "user2", "result": "home", "homeGoals": 3, "awayGoals": 1, "date": "2026-04-15" }],
  "lastUpdated": "ISO"
}
```
