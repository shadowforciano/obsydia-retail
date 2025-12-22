require('dotenv').config();

const express = require('express');
const path = require('path');
const { parseOrder } = require('./lib/order');
const { sendOrderEmails } = require('./lib/email');
const { getLocale } = require('./lib/locales');
const { applyPaymentNumber } = require('./lib/payments');

const app = express();

app.disable('x-powered-by');
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

app.use(express.static(path.join(__dirname, 'public')));
app.use('/locales', express.static(path.join(__dirname, 'locales')));

app.post('/order', async (req, res) => {
  const { order, errors } = parseOrder(req.body);
  const t = getLocale(order.language);

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
    location: order.location,
    services: order.services,
    language: order.language,
    createdAt: order.createdAt,
  });

  try {
    const confirmationMessage = applyPaymentNumber(
      t.confirmation.paymentMessage || t.confirmation.message
    );
    await sendOrderEmails(order);
    return res.json({
      ok: true,
      orderId: order.id,
      message: confirmationMessage,
    });
  } catch (error) {
    console.error('Order processing failed:', error);
    return res.status(500).json({ ok: false, message: t.errors.server });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Obsydia Retail listening on port ${PORT}`);
});
