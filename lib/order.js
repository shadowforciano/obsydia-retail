const { normalizeLanguage } = require('./locales');

const SERVICE_KEYS = ['jellyfin', 'kavita', 'immich', 'audiobookshelf'];
const MAX_NAME_LENGTH = 120;
const MAX_EMAIL_LENGTH = 160;
const MAX_PHONE_LENGTH = 40;
const MAX_ADDRESS_LENGTH = 200;
const MAX_LOCATION_LENGTH = 160;
const MAX_NOTES_LENGTH = 1000;

function cleanString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function cleanServices(value) {
  if (!Array.isArray(value)) {
    return [];
  }
  const filtered = value.filter((service) => SERVICE_KEYS.includes(service));
  return Array.from(new Set(filtered));
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function parseOrder(payload) {
  const errors = new Set();

  const fullName = cleanString(payload.fullName);
  const email = cleanString(payload.email);
  const phone = cleanString(payload.phone);
  const address = cleanString(payload.address);
  const location = cleanString(payload.location);
  const notes = cleanString(payload.notes);
  const services = cleanServices(payload.services);

  if (!fullName || !location) {
    errors.add('required');
  }

  if (!phone) {
    errors.add('phone');
  }

  if (!address) {
    errors.add('address');
  }

  if (!email || !isValidEmail(email)) {
    errors.add('email');
  }

  if (services.length === 0) {
    errors.add('services');
  }

  if (notes.length > MAX_NOTES_LENGTH) {
    errors.add('notes');
  }

  if (
    fullName.length > MAX_NAME_LENGTH ||
    email.length > MAX_EMAIL_LENGTH ||
    phone.length > MAX_PHONE_LENGTH ||
    address.length > MAX_ADDRESS_LENGTH ||
    location.length > MAX_LOCATION_LENGTH
  ) {
    errors.add('length');
  }

  const order = {
    id: `ORD-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    fullName: fullName.slice(0, MAX_NAME_LENGTH),
    email: email.slice(0, MAX_EMAIL_LENGTH),
    phone: phone.slice(0, MAX_PHONE_LENGTH),
    address: address.slice(0, MAX_ADDRESS_LENGTH),
    location: location.slice(0, MAX_LOCATION_LENGTH),
    notes: notes.slice(0, MAX_NOTES_LENGTH),
    services,
    language: normalizeLanguage(cleanString(payload.language)),
    createdAt: new Date().toISOString(),
  };

  return {
    order,
    errors: Array.from(errors),
  };
}

module.exports = {
  SERVICE_KEYS,
  parseOrder,
};
