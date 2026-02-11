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

function initLightbox() {
  const triggers = document.querySelectorAll('[data-lightbox]');
  if (triggers.length === 0) {
    return;
  }

  let overlay = document.querySelector('.lightbox-overlay');
  let imageEl = overlay?.querySelector('.lightbox-image');
  let closeBtn = overlay?.querySelector('.lightbox-close');

  if (!overlay) {
    overlay = document.createElement('div');
    overlay.className = 'lightbox-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-hidden', 'true');

    const content = document.createElement('div');
    content.className = 'lightbox-content';

    closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.className = 'lightbox-close';
    closeBtn.setAttribute('aria-label', 'Close image');
    closeBtn.textContent = '×';

    imageEl = document.createElement('img');
    imageEl.className = 'lightbox-image';
    imageEl.alt = '';

    content.appendChild(closeBtn);
    content.appendChild(imageEl);
    overlay.appendChild(content);
    document.body.appendChild(overlay);
  }

  const closeOverlay = () => {
    overlay.classList.remove('is-open');
    overlay.setAttribute('aria-hidden', 'true');
    imageEl.src = '';
  };

  const openOverlay = (src, altText) => {
    imageEl.src = src;
    imageEl.alt = altText || '';
    overlay.classList.add('is-open');
    overlay.setAttribute('aria-hidden', 'false');
  };

  triggers.forEach((trigger) => {
    trigger.addEventListener('click', (event) => {
      event.preventDefault();
      const img = trigger.querySelector('img');
      const src = trigger.getAttribute('href') || img?.getAttribute('src');
      if (!src) {
        return;
      }
      openOverlay(src, img?.alt || '');
    });
  });

  overlay.addEventListener('click', (event) => {
    if (event.target === overlay) {
      closeOverlay();
    }
  });

  closeBtn?.addEventListener('click', closeOverlay);

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && overlay.classList.contains('is-open')) {
      closeOverlay();
    }
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
  initLightbox();
}

window.addEventListener('load', () => {
  document.body.classList.add('loaded');
});

init();
