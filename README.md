# Obsydia Retail

Production-ready ordering site for custom-built mini personal servers (Jellyfin, Immich, Kavita, Audiobookshelf). The frontend is a minimal dark UI with bilingual support, and the backend sends language-aware emails via SMTP2GO API.

## Features
- English and Spanish (Puerto Rico friendly) UI with persistent language selector
- Service selection, order capture, and quote-first flow
- Email confirmations to customer + admin notifications (SMTP2GO API)
- Admin portal for order review and sending quotes
- Postgres-backed order storage (Railway compatible)

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
- `ATH_MOBILE_NUMBER` (required for quote emails, digits only recommended)
- `DATABASE_URL` (Railway Postgres connection string)
- `DATABASE_SSL` (optional, set to `false` to disable SSL locally)
- `SESSION_SECRET`
- `ADMIN_USERNAME`
- `ADMIN_PASSWORD` (or `ADMIN_PASSWORD_HASH`)
- `ADMIN_PATH` (optional, defaults to `admin`, do not include leading `/`)
- `QUOTE_CURRENCY` (optional, defaults to `USD`)

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
  - `ATH_MOBILE_NUMBER`
  - `DATABASE_URL`
  - `DATABASE_SSL` (optional)
  - `SESSION_SECRET`
  - `ADMIN_USERNAME`
  - `ADMIN_PASSWORD` or `ADMIN_PASSWORD_HASH`
  - `ADMIN_PATH` (optional, no leading `/`)
  - `QUOTE_CURRENCY` (optional)
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

## Admin Portal
The admin portal is available at `/{ADMIN_PATH}` (default `/admin`). It is not linked in the public site.

Recommended setup:
- Set `ADMIN_USERNAME` and either `ADMIN_PASSWORD` or `ADMIN_PASSWORD_HASH`.
- Generate a hash with:
  `node -e "require('bcryptjs').hash('your-password', 10).then(console.log)"`
- Set `SESSION_SECRET` to a long random string.

## Database
Orders are stored in Postgres if `DATABASE_URL` is configured. The table is created automatically on startup. If the database is not configured, admin features will not show stored orders.

## Order Endpoint
`POST /order` accepts JSON with:
```json
{
  "fullName": "",
  "email": "",
  "phone": "",
  "address": "",
  "location": "",
  "services": ["jellyfin", "immich"],
  "notes": "",
  "language": "en"
}
```
