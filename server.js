require('dotenv').config();

const express = require('express');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const PgSession = require('connect-pg-simple')(session);
const path = require('path');
const { parseOrder } = require('./lib/order');
const { sendOrderEmails, sendQuoteEmail } = require('./lib/email');
const { getLocale } = require('./lib/locales');
const { isDbEnabled, initDb, createOrder, listOrders, getOrderById, saveQuote, getPool } = require('./lib/db');
const { renderLogin, renderOrders, renderOrderDetail } = require('./lib/adminViews');

const app = express();
const rawAdminPath = process.env.ADMIN_PATH || 'admin';
const adminPath = rawAdminPath.replace(/^\/+|\/+$/g, '') || 'admin';
const adminUsername = process.env.ADMIN_USERNAME || 'obsydia';
const adminPassword = process.env.ADMIN_PASSWORD;
const adminPasswordHash = process.env.ADMIN_PASSWORD_HASH;
const sessionSecret = process.env.SESSION_SECRET || 'obsydia-session-secret';
const quoteCurrency = process.env.QUOTE_CURRENCY || 'USD';
const dbEnabled = isDbEnabled();

if (!process.env.SESSION_SECRET) {
  console.warn('SESSION_SECRET is not set. Using a fallback value.');
}

if (dbEnabled) {
  initDb().catch((error) => {
    console.error('Database initialization failed:', error);
  });
}

app.disable('x-powered-by');
app.set('trust proxy', 1);
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

const sessionConfig = {
  secret: sessionSecret,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  },
};

if (dbEnabled) {
  sessionConfig.store = new PgSession({
    pool: getPool(),
    createTableIfMissing: true,
  });
}

app.use(session(sessionConfig));

app.use(express.static(path.join(__dirname, 'public')));
app.use('/locales', express.static(path.join(__dirname, 'locales')));

app.get('/terms', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'terms.html'));
});

app.use(`/${adminPath}`, (req, res, next) => {
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');
  next();
});

function isAuthed(req) {
  return Boolean(req.session && req.session.isAdmin);
}

async function verifyAdminPassword(input) {
  if (adminPasswordHash) {
    return bcrypt.compare(input, adminPasswordHash);
  }
  if (adminPassword) {
    return input === adminPassword;
  }
  return false;
}

app.post('/order', async (req, res) => {
  const { order, errors } = parseOrder(req.body);
  const t = getLocale(order.language);
  const host = req.get('host');
  const baseUrl = host ? `${req.protocol}://${host}` : process.env.PUBLIC_BASE_URL;

  if (errors.length > 0) {
    const messageKey = errors[0];
    const message = t.errors[messageKey] || t.errors.required;
    return res.status(400).json({ ok: false, message });
  }

  console.log('New order received:', {
    id: order.id,
    fullName: order.fullName,
    email: order.email,
    phone: order.phone,
    address: order.address,
    location: order.location,
    services: order.services,
    language: order.language,
    createdAt: order.createdAt,
  });

  try {
    if (dbEnabled) {
      await createOrder(order);
    }
    await sendOrderEmails(order, { baseUrl });
    return res.json({
      ok: true,
      orderId: order.id,
      message: t.order.success || t.confirmation.message,
    });
  } catch (error) {
    console.error('Order processing failed:', error.details || error);
    return res.status(500).json({ ok: false, message: t.errors.server });
  }
});

app.get(`/${adminPath}`, async (req, res) => {
  if (!isAuthed(req)) {
    const message =
      adminPassword || adminPasswordHash
        ? undefined
        : 'Admin credentials are not configured.';
    return res.send(renderLogin({ adminPath, message }));
  }

  const orders = dbEnabled ? await listOrders() : [];
  return res.send(renderOrders({ orders, adminPath, dbEnabled }));
});

app.post(`/${adminPath}/login`, async (req, res) => {
  const username = String(req.body.username || '').trim();
  const password = String(req.body.password || '');

  if (!adminPassword && !adminPasswordHash) {
    return res.send(renderLogin({ adminPath, message: 'Admin credentials are not configured.' }));
  }

  if (!username || !password) {
    return res.send(renderLogin({ adminPath, message: 'Missing credentials.' }));
  }

  if (username !== adminUsername) {
    return res.send(renderLogin({ adminPath, message: 'Invalid credentials.' }));
  }

  const isValid = await verifyAdminPassword(password);
  if (!isValid) {
    return res.send(renderLogin({ adminPath, message: 'Invalid credentials.' }));
  }

  req.session.isAdmin = true;
  return res.redirect(`/${adminPath}`);
});

app.post(`/${adminPath}/logout`, (req, res) => {
  req.session.destroy(() => {
    res.redirect(`/${adminPath}`);
  });
});

app.get(`/${adminPath}/orders/:id`, async (req, res) => {
  if (!isAuthed(req)) {
    return res.redirect(`/${adminPath}`);
  }

  const order = await getOrderById(req.params.id);
  if (!order) {
    return res.send(renderOrderDetail({ order: null, adminPath, message: 'Order not found.' }));
  }

  const quoteDefaults = buildQuoteDefaults(order.quote);
  return res.send(renderOrderDetail({ order, adminPath, quoteDefaults }));
});

app.post(`/${adminPath}/orders/:id/quote`, async (req, res) => {
  if (!isAuthed(req)) {
    return res.redirect(`/${adminPath}`);
  }

  const order = await getOrderById(req.params.id);
  if (!order) {
    return res.send(renderOrderDetail({ order: null, adminPath, message: 'Order not found.' }));
  }

  const { quote, error } = parseQuotePayload(req.body);
  if (error) {
    const quoteDefaults = buildQuoteDefaults(quote);
    return res.send(
      renderOrderDetail({ order, adminPath, quoteDefaults, message: error, messageType: 'error' })
    );
  }

  try {
    const host = req.get('host');
    const baseUrl = host ? `${req.protocol}://${host}` : process.env.PUBLIC_BASE_URL;
    await sendQuoteEmail(order, quote, { baseUrl });
    await saveQuote(order.id, quote);
    const quoteDefaults = buildQuoteDefaults(quote);
    return res.send(
      renderOrderDetail({
        order,
        adminPath,
        quoteDefaults,
        message: 'Quote sent successfully.',
        messageType: 'success',
      })
    );
  } catch (error) {
    console.error('Quote email failed:', error.details || error);
    const quoteDefaults = buildQuoteDefaults(quote);
    const errorMessage = getQuoteErrorMessage(error);
    return res.send(
      renderOrderDetail({
        order,
        adminPath,
        quoteDefaults,
        message: errorMessage,
        messageType: 'error',
      })
    );
  }
});

function parseAmount(value) {
  if (value === undefined || value === null || value === '') {
    return 0;
  }
  const parsed = Number(value);
  if (Number.isNaN(parsed) || parsed < 0) {
    return null;
  }
  return Math.round(parsed * 100) / 100;
}

function parseQuotePayload(body) {
  const normalizeArray = (value) => {
    if (Array.isArray(value)) {
      return value;
    }
    if (value === undefined || value === null || value === '') {
      return [];
    }
    return [value];
  };

  const isProvided = (value) => value !== undefined && value !== null && String(value).trim() !== '';

  const pc = parseAmount(body.pc);
  if (pc === null || pc <= 0) {
    return { error: 'Base PC price is required.', quote: {} };
  }

  const jellyfin = parseAmount(body.jellyfin);
  if (jellyfin === null) {
    return { error: 'Invalid Movie & Music Streaming price.', quote: {} };
  }
  const immich = parseAmount(body.immich);
  if (immich === null) {
    return { error: 'Invalid Photo Storage & Backup price.', quote: {} };
  }
  const kavita = parseAmount(body.kavita);
  if (kavita === null) {
    return { error: 'Invalid Ebooks & Comics Library price.', quote: {} };
  }
  const audiobookshelf = parseAmount(body.audiobookshelf);
  if (audiobookshelf === null) {
    return { error: 'Invalid Audiobook & Podcast Streaming price.', quote: {} };
  }
  const extraStorage = parseAmount(body['extra-storage']);
  if (extraStorage === null) {
    return { error: 'Invalid extra storage price.', quote: {} };
  }

  const items = [
    { key: 'pc', amount: pc },
    { key: 'jellyfin', amount: jellyfin || 0 },
    { key: 'immich', amount: immich || 0 },
    { key: 'kavita', amount: kavita || 0 },
    { key: 'audiobookshelf', amount: audiobookshelf || 0 },
    { key: 'extra-storage', amount: extraStorage || 0 },
  ];

  const otherLabels = normalizeArray(body['otherLabel[]'] ?? body.otherLabel);
  const otherAmounts = normalizeArray(body['otherAmount[]'] ?? body.otherAmount);
  const maxOther = Math.max(otherLabels.length, otherAmounts.length);

  for (let index = 0; index < maxOther; index += 1) {
    const rawLabel = otherLabels[index];
    const rawAmount = otherAmounts[index];
    const otherLabel = String(rawLabel || '').trim();
    const otherAmount = parseAmount(rawAmount);

    if (otherAmount === null) {
      return { error: 'Invalid other item amount.', quote: {} };
    }

    const labelProvided = isProvided(rawLabel);
    const amountProvided = isProvided(rawAmount);

    if (labelProvided && (!amountProvided || otherAmount <= 0)) {
      return { error: 'Other item amount is required.', quote: {} };
    }

    if (amountProvided && otherAmount > 0 && !labelProvided) {
      return { error: 'Other item label is required.', quote: {} };
    }

    if (labelProvided && amountProvided && otherAmount > 0) {
      items.push({ key: 'other', amount: otherAmount, label: otherLabel });
    }
  }

  const total = items.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  const notes = String(body.quoteNotes || '').trim();

  return {
    quote: {
      currency: quoteCurrency,
      items,
      total: Math.round(total * 100) / 100,
      notes,
    },
  };
}

function buildQuoteDefaults(quote) {
  const defaults = {
    pc: '',
    jellyfin: '',
    immich: '',
    kavita: '',
    audiobookshelf: '',
    'extra-storage': '',
    otherItems: [],
    notes: '',
  };

  if (!quote || !Array.isArray(quote.items)) {
    return defaults;
  }

  quote.items.forEach((item) => {
    if (item.key === 'other') {
      defaults.otherItems.push({ label: item.label || '', amount: item.amount ?? '' });
      return;
    }
    defaults[item.key] = item.amount ?? '';
  });


  defaults.notes = quote.notes || '';
  return defaults;
}

function getQuoteErrorMessage(error) {
  const message = error?.message || '';
  if (message.includes('SMTP2GO_API_KEY')) {
    return 'SMTP2GO_API_KEY is not set.';
  }
  if (message.includes('FROM_EMAIL')) {
    return 'FROM_EMAIL is not set or not verified.';
  }
  if (message.includes('ATH_MOBILE_NUMBER')) {
    return 'ATH_MOBILE_NUMBER is not set.';
  }
  return 'Unable to send quote. Check your email settings.';
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Obsydia Retail listening on port ${PORT}`);
});
