# NEXUS BOARD

A personal dashboard with calendar integration, stock tickers, and crypto crawl.

## Quick Deploy to Vercel (Free)

### Option A: Vercel CLI (fastest)
1. Install: `npm i -g vercel`
2. In this folder, run: `vercel`
3. Follow the prompts — done!

### Option B: Vercel Web Dashboard
1. Go to https://vercel.com and sign up (free with GitHub/Google)
2. Click "Add New..." → "Project"
3. Click "Upload" (or connect a Git repo if you push this to GitHub)
4. Upload this entire `nexus-board` folder
5. Framework Preset: **Vite**
6. Click **Deploy**
7. Your dashboard is live at `https://your-project.vercel.app`

## Add to iPhone Home Screen
1. Open your Vercel URL in Safari on iPhone
2. Tap the Share button (square with arrow)
3. Tap "Add to Home Screen"
4. Name it "Nexus Board" and tap Add
5. It now launches full-screen like a native app!

## Features
- **Calendar**: Paste Google or Apple iCal URLs in Settings
- **Stocks**: Scrolling ticker with live Yahoo Finance data
- **Crypto**: Scrolling ticker with live CoinGecko data
- **Responsive**: Scales from phone to TV display
- **PWA**: Installable on iPhone home screen
- **Persistent Settings**: Your config saves in localStorage

## API Routes
The `/api` folder contains Vercel serverless functions that proxy external APIs, 
solving CORS restrictions that prevent browser-only fetching:
- `/api/calendar?url=...` — Fetches iCal feeds
- `/api/stocks?symbols=AAPL,GOOGL` — Fetches Yahoo Finance data
- `/api/crypto?ids=bitcoin,ethereum` — Fetches CoinGecko data
