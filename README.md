# HOXF SPORT TV

Mobile-first Vue 3 football streaming platform frontend.

## Run

```bash
npm install
npm run dev
npm run build
```

## Production image slots

- `public/images/banner-01.jpg` — 1920×1080 — Premier League hero
- `public/images/banner-02.jpg` — 1920×1080 — Champions League hero
- `public/images/banner-03.jpg` — 1920×1080 — La Liga hero
- `public/images/banner-04.jpg` — 1920×1080 — Serie A hero
- `public/images/hero-main.jpg` — 1920×1080 — optional global hero fallback
- `public/images/football-bg.jpg` — 1920×1200 — section/stadium background
- `public/images/vip-trophy.png` — 512×512 transparent PNG — VIP campaign artwork

The current interface is fully styled with CSS gradients, so missing production artwork never shows broken-image UI.

## Football data

Production data does not call API-FOOTBALL from the browser.

```text
Vue
↓
PHP feed
↓
API-FOOTBALL
```

The Vue app reads one shared JSON feed. A PHP cron job is the only process that calls API-FOOTBALL. The API key stays on the server.

Create `.env.local` in the project root:

```env
VITE_FOOTBALL_FEED_URL=https://api.example.com/fixtures.php
```

Then start the app:

```bash
npm run dev
```

If `VITE_FOOTBALL_FEED_URL` is empty, or the feed cannot be read, the home page uses `src/data/matches.js`.

Do not put `VITE_API_FOOTBALL_KEY` in the frontend. Deployment steps, the cron command, and the server-side key are documented in `server/README.md`.

Check translations with:

```bash
npm run check:i18n
```
