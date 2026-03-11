# DineWise Live Upgrade Notes

This version adds a stronger scaffold for the features you asked for:

- live-location discovery for nearby eating places
- Google Places sync so you do not need to manually enter restaurant details
- AI food assistant endpoint
- profile page with phone, address, plans and coupons
- login/register screen with a richer visual background
- verified review flow with bill/storefront image upload
- reward logic: +10 for verified place reviews, +50 for verified dish ratings
- optional Firebase mirroring for users/reviews

## What is fully wired

### Frontend
- Home screen can request live location and call `/api/places/nearby`
- Profile screen added
- Login page redesigned
- Restaurant review modal now accepts:
  - place vs dish review
  - dish name
  - bill/storefront image

### Backend
- `/api/places/nearby`
- `/api/assistant/recommend`
- `/api/reviews/verified`

## What still needs your API keys / cloud setup

These features need configuration before they become truly production-grade:

### 1) Google Maps / Places
Add in `.env`:

```env
GOOGLE_MAPS_API_KEY=your_key_here
```

Without this key, nearby discovery falls back to the local database.

### 2) Gemini image verification
Add in `.env`:

```env
GEMINI_API_KEY=your_key_here
```

Without this key, the app still saves reviews in fallback mode, but it cannot truly inspect bill/storefront images.

### 3) Firebase realtime mirror
Add in frontend `.env`:

```env
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
```

Firebase is optional in this build. If configured, the app mirrors signed-in users and review events.

## Important honesty note

This build **scaffolds** the real-data workflow, but it is **not a finished fraud-proof production system** yet.

Things that still need more work for a real launch:
- stronger OCR / receipt parsing
- duplicate image detection / hash comparison
- spam detection heuristics / rate limiting
- Firebase auth + storage rules
- persistent Google review sync strategy
- separate verified vs pending review states in DB
- better place-detail mapping for newly synced Google entries

## Run

```bash
npm install
npm run build:web
npx cap sync android
npx cap open android
```

For backend:

```bash
npm run dev
```
