# Obsydia Retail

Static marketing page for custom-built mini personal servers (streaming, photo storage, ebooks/comics, audiobooks/podcasts). The UI is a minimal dark theme with bilingual support.

## Features
- English and Spanish UI with persistent language selector
- Service overview and product positioning
- Terms of Service page

## Usage
- Open `index.html` locally, or host the repository on GitHub Pages.
- All assets are static and live in the repository root:
  - `index.html`
  - `terms.html`
  - `css/`, `js/`, `images/`, `locales/`

## Language Additions
1) Add a new locale file to `locales/` (e.g. `locales/fr.json`).
2) Update the language list in `js/app.js` (`supportedLanguages`).
3) Add a new language toggle button in `index.html` and `terms.html`.

## Image Replacement
All images live in `images/` and must use these exact filenames (16:9 ratio, dark aesthetic):
- `hero.png`
- `streaming.png`
- `photos.png`
- `books.png`
- `audio.png`
- `ownership.png`
- `BuiltForYou.png`
- `PuertoRicoHomeFocused.png`

## Terms of Service
The Terms of Service page is available at `terms.html` and is linked in the site footer.
