# NutriTrack AI — Production PWA Nutrition Tracker

NutriTrack AI is a complete, production-quality, AI-powered progressive web application designed specifically for iPhone Safari and mobile browsers.

## Key Features
- **AI Natural Language Logging**: Parses complex meals ("3 rotis, 2 boiled eggs, one bowl of dal and 250 ml milk") with ambiguity detection.
- **AI Photo Meal Scanner**: Upload or snap food photos for automated portion estimation.
- **Curated Food Database**: 46+ verified Indian & international foods with full macros and 20+ vitamins & minerals (ICMR-NIN IFCT 2024 & USDA FoodData Central).
- **Open Food Facts Live API**: Search packaged barcode and international products directly.
- **Mifflin-St Jeor Energy Engine**: Precise BMR, TDEE, surplus/deficit goal calculations with safety floor checks.
- **Integrated NutriChat Assistant**: In-app conversational AI grounded in your actual diary data.
- **Offline PWA Support**: Service Worker caching, Web Manifest, and standalone iPhone Home Screen experience.
- **Local-First & Private**: Data persisted in browser IndexedDB/localStorage. JSON Backup/Restore and CSV export.

## 1-Minute Free Deployment
### Option A: Vercel (Recommended)
1. Unzip this package.
2. Run `npx vercel` or push to a GitHub repository and import into [Vercel](https://vercel.com) (100% Free Hobby Tier).
3. Your PWA is live with HTTPS!

### Option B: Netlify / Cloudflare Pages / GitHub Pages
Drag-and-drop the unzipped folder into Netlify Drop or Cloudflare Pages.

## How to Install on iPhone Home Screen
1. Open your deployed URL in **Safari on iPhone**.
2. Tap the **Share icon** (square with an arrow pointing upward).
3. Scroll down and tap **Add to Home Screen**.
4. Tap **Add**. The app will launch in full-screen standalone mode with no browser URL bar!

## 100% Free AI Setup (Google Gemini)
1. Go to [Google AI Studio](https://aistudio.google.com/app/apikey).
2. Sign in and tap **Create API Key**.
3. In NutriTrack AI, navigate to **Profile > AI Service Configuration**, paste the key, and tap **Save Key**.
