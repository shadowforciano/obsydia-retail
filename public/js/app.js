document.documentElement.classList.add('js');

const supportedLanguages = ['en', 'es'];
const assetVersion = document.documentElement.dataset.assetVersion || '1';
const state = {
  lang: 'en',
  translations: {},
  currentTranslations: null,
};

const elements = {
  langButtons: document.querySelectorAll('[data-lang]'),
  languageField: document.getElementById('language-field'),
  orderForm: document.getElementById('order-form'),
  orderSection: document.getElementById('order'),
  status: document.getElementById('form-status'),
  submitButton: document.querySelector('#order-form button[type="submit"]'),
};

function resolvePath(obj, path) {
  return path.split('.').reduce((acc, key) => (acc ? acc[key] : undefined), obj);
}

async function loadTranslations(lang) {
  if (state.translations[lang]) {
    return state.translations[lang];
  }

  const response = await fetch(`/locales/${lang}.json?v=${assetVersion}`);
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

  if (elements.submitButton) {
    elements.submitButton.dataset.defaultLabel = elements.submitButton.textContent;
  }
}

function updateLanguageButtons(lang) {
  elements.langButtons.forEach((button) => {
    const isActive = button.dataset.lang === lang;
    button.classList.toggle('is-active', isActive);
    button.setAttribute('aria-pressed', isActive);
  });
}

function setSubmitting(isSubmitting, t) {
  if (!elements.submitButton) {
    return;
  }

  if (!elements.submitButton.dataset.defaultLabel) {
    elements.submitButton.dataset.defaultLabel = elements.submitButton.textContent;
  }

  elements.submitButton.textContent = isSubmitting
    ? resolvePath(t, 'order.submitting') || elements.submitButton.dataset.defaultLabel
    : elements.submitButton.dataset.defaultLabel;
  elements.submitButton.disabled = isSubmitting;
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

  if (elements.languageField) {
    elements.languageField.value = normalized;
  }

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

function setupOrderForm() {
  if (!elements.orderForm) {
    return;
  }

  elements.orderForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const translations = state.currentTranslations;
    if (!translations) {
      return;
    }

    elements.status.textContent = '';
    elements.status.classList.remove('is-success');
    setSubmitting(true, translations);

    const formData = new FormData(elements.orderForm);
    const services = Array.from(
      elements.orderForm.querySelectorAll('input[name="services"]:checked')
    ).map((input) => input.value);

    const payload = {
      fullName: formData.get('fullName')?.trim(),
      email: formData.get('email')?.trim(),
      phone: formData.get('phone')?.trim(),
      address: formData.get('address')?.trim(),
      location: formData.get('location')?.trim(),
      notes: formData.get('notes')?.trim(),
      services,
      language: state.lang,
    };

    try {
      const response = await fetch('/order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();
      if (!response.ok) {
        elements.status.textContent = result.message || translations.errors.server;
        elements.status.classList.remove('is-success');
        setSubmitting(false, translations);
        return;
      }

      elements.orderForm.reset();
      if (elements.languageField) {
        elements.languageField.value = state.lang;
      }

      elements.status.textContent =
        result.message || resolvePath(translations, 'order.success') || '';
      elements.status.classList.add('is-success');
      elements.orderSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (error) {
      elements.status.textContent = translations.errors.network;
      elements.status.classList.remove('is-success');
    } finally {
      setSubmitting(false, translations);
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
  setupOrderForm();
  initRevealAnimations();
}

window.addEventListener('load', () => {
  document.body.classList.add('loaded');
});

init();
