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

## Football API

Fixtures come from API-FOOTBALL (API-SPORTS v3). The page stays usable without a key by showing the local match list.

1. Create an account at [API-FOOTBALL](https://www.api-football.com/).
2. Copy the API key from the dashboard.
3. Create `.env.local` in the project root:

```env
VITE_API_FOOTBALL_KEY=your_key_here
```

4. Start the app:

```bash
npm run dev
```

If `VITE_API_FOOTBALL_KEY` is empty, the request times out, or the API returns an error, the home page uses `src/data/matches.js`.

Check translations with:

```bash
npm run check:i18n
```

This is a frontend-only app. Any `VITE_*` variable is compiled into the browser bundle and can be read by visitors. Use a free or low-privilege demo key. Do not use a high-privilege or private production key. Do not commit `.env.local`.
