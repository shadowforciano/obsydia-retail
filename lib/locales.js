const fs = require('fs');
const path = require('path');

const SUPPORTED_LANGUAGES = ['en', 'es'];

const locales = SUPPORTED_LANGUAGES.reduce((acc, lang) => {
  const filePath = path.join(__dirname, '..', 'locales', `${lang}.json`);
  const raw = fs.readFileSync(filePath, 'utf8');
  acc[lang] = JSON.parse(raw);
  return acc;
}, {});

function normalizeLanguage(input) {
  return SUPPORTED_LANGUAGES.includes(input) ? input : 'en';
}

function getLocale(lang) {
  return locales[normalizeLanguage(lang)];
}

module.exports = {
  SUPPORTED_LANGUAGES,
  normalizeLanguage,
  getLocale,
};
