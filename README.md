# Obsydia Retail

Production-ready ordering site for custom-built mini personal servers (Jellyfin, Immich, Kavita, Audiobookshelf). The frontend is a minimal dark UI with bilingual support, and the backend sends language-aware emails via SMTP2GO API.

## Features
- English and Spanish (Puerto Rico friendly) UI with persistent language selector
- Service selection, order capture, and ATH Móvil instructions
- Email confirmations to customer + admin notifications (SMTP2GO API)
- Railway-ready Express server with environment-based configuration

## Local Setup
1) Install dependencies:
```bash
npm install
```

2) Create your environment file:
```bash
cp .env.example .env
```

3) Set the following values in `.env`:
- `SMTP2GO_API_KEY`
- `FROM_EMAIL` (must be verified in SMTP2GO)
- `ADMIN_EMAILS` (comma-separated)

4) Run the app:
```bash
npm run dev
```

The server listens on `PORT` (defaults to 3000).

## Railway Deployment
- Set the start command to `npm start`.
- Ensure the environment variables are configured in Railway:
  - `SMTP2GO_API_KEY`
  - `FROM_EMAIL`
  - `ADMIN_EMAILS`
- Railway automatically provides `PORT`.

## Language Additions
1) Add a new locale file to `locales/` (e.g. `locales/fr.json`).
2) Update the language list in `public/js/app.js` (`supportedLanguages`).
3) Update the supported languages array in `lib/locales.js`.
4) Add a new language toggle button in `public/index.html`.

## Image Replacement
All images live in `public/images/` and must use these exact filenames (16:9 ratio, dark aesthetic):
- `hero.png`
- `streaming.png`
- `photos.png`
- `books.png`
- `audio.png`
- `ownership.png`
- `BuiltForYou.png`
- `PuertoRicoHomeFocused.png`

## Admin Email Configuration
Set `ADMIN_EMAILS` as a comma-separated list. If left empty, only the customer confirmation email is sent.

## Order Endpoint
`POST /order` accepts JSON with:
```json
{
  "fullName": "",
  "email": "",
  "phone": "",
  "location": "",
  "services": ["jellyfin", "immich"],
  "notes": "",
  "language": "en"
}
```
