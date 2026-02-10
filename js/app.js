document.documentElement.classList.add('js');

const supportedLanguages = ['en', 'es'];
const assetVersion = document.documentElement.dataset.assetVersion || '1';
const localeBase = document.documentElement.dataset.localeBase || 'locales/';
const state = {
  lang: 'en',
  translations: {},
  currentTranslations: null,
};

const elements = {
  langButtons: document.querySelectorAll('[data-lang]'),
};

function resolvePath(obj, path) {
  return path.split('.').reduce((acc, key) => (acc ? acc[key] : undefined), obj);
}

async function loadTranslations(lang) {
  if (state.translations[lang]) {
    return state.translations[lang];
  }

  const response = await fetch(`${localeBase}${lang}.json?v=${assetVersion}`);
  if (!response.ok) {
    throw new Error(`Unable to load locale ${lang}`);
  }

  const data = await response.json();
  state.translations[lang] = data;
  return data;
}

function applyTranslations(t) {
  document.querySelectorAll('[data-i18n]').forEach((el) => {
    const value = resolvePath(t, el.dataset.i18n);
    if (value) {
      el.textContent = value;
    }
  });

  document.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
    const value = resolvePath(t, el.dataset.i18nPlaceholder);
    if (value) {
      el.placeholder = value;
    }
  });

  document.querySelectorAll('[data-i18n-alt]').forEach((el) => {
    const value = resolvePath(t, el.dataset.i18nAlt);
    if (value) {
      el.alt = value;
    }
  });

  document.querySelectorAll('[data-i18n-aria-label]').forEach((el) => {
    const value = resolvePath(t, el.dataset.i18nAriaLabel);
    if (value) {
      el.setAttribute('aria-label', value);
    }
  });

  const title = resolvePath(t, 'app.title');
  if (title) {
    document.title = title;
  }

}

function updateLanguageButtons(lang) {
  elements.langButtons.forEach((button) => {
    const isActive = button.dataset.lang === lang;
    button.classList.toggle('is-active', isActive);
    button.setAttribute('aria-pressed', isActive);
  });
}

async function setLanguage(lang) {
  const normalized = supportedLanguages.includes(lang) ? lang : 'en';
  const translations = await loadTranslations(normalized);

  state.lang = normalized;
  state.currentTranslations = translations;
  localStorage.setItem('lang', normalized);
  document.documentElement.lang = normalized;

  applyTranslations(translations);
  updateLanguageButtons(normalized);

  return translations;
}

function initRevealAnimations() {
  const revealElements = document.querySelectorAll('.reveal');
  if (!('IntersectionObserver' in window) || revealElements.length === 0) {
    revealElements.forEach((el) => el.classList.add('is-visible'));
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.2 }
  );

  revealElements.forEach((el, index) => {
    el.style.setProperty('--delay', `${index * 80}ms`);
    observer.observe(el);
  });
}

function setupLanguageSelector() {
  elements.langButtons.forEach((button) => {
    button.addEventListener('click', async () => {
      await setLanguage(button.dataset.lang);
    });
  });
}

async function init() {
  const storedLanguage = localStorage.getItem('lang') || 'en';

  try {
    await setLanguage(storedLanguage);
  } catch (error) {
    await setLanguage('en');
  }

  setupLanguageSelector();
  initRevealAnimations();
}

window.addEventListener('load', () => {
  document.body.classList.add('loaded');
});

init();
