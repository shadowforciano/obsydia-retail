const { getLocale } = require('./locales');
const { SERVICE_KEYS } = require('./order');
const { applyPaymentNumber } = require('./payments');

const API_URL = 'https://api.smtp2go.com/v3/email/send';

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function parseAdminEmails(value) {
  if (!value) {
    return [];
  }
  return value
    .split(',')
    .map((email) => email.trim())
    .filter(Boolean);
}

function formatServices(services, t) {
  return services
    .filter((service) => SERVICE_KEYS.includes(service))
    .map((service) => t.services.items[service]?.name || service);
}

function buildCustomerEmail(order, t) {
  const labels = t.email.labels;
  const servicesList = formatServices(order.services, t);
  const languageName = t.language.names[order.language] || order.language.toUpperCase();
  const notesValue = order.notes || t.email.noNotes;
  const paymentInstructions = applyPaymentNumber(t.email.paymentInstructions);

  const summaryItems = [
    { label: labels.name, value: order.fullName },
    { label: labels.email, value: order.email },
    { label: labels.phone, value: order.phone || t.email.notProvided },
    { label: labels.location, value: order.location },
    { label: labels.language, value: languageName },
  ];

  const text = [
    t.email.intro,
    '',
    t.email.summaryTitle,
    ...summaryItems.map((item) => `${item.label}: ${item.value}`),
    '',
    `${t.email.servicesTitle}: ${servicesList.join(', ') || t.email.noServices}`,
    `${labels.notes}: ${notesValue}`,
    '',
    t.email.paymentTitle,
    paymentInstructions,
    '',
    t.email.nextSteps,
  ].join('\n');

  const html = [
    `<p>${escapeHtml(t.email.intro)}</p>`,
    `<h3>${escapeHtml(t.email.summaryTitle)}</h3>`,
    '<ul>',
    ...summaryItems.map(
      (item) =>
        `<li><strong>${escapeHtml(item.label)}:</strong> ${escapeHtml(item.value)}</li>`
    ),
    '</ul>',
    `<h3>${escapeHtml(t.email.servicesTitle)}</h3>`,
    `<p>${escapeHtml(servicesList.join(', ') || t.email.noServices)}</p>`,
    `<p><strong>${escapeHtml(labels.notes)}:</strong> ${escapeHtml(notesValue)}</p>`,
    `<h3>${escapeHtml(t.email.paymentTitle)}</h3>`,
    `<p>${escapeHtml(paymentInstructions)}</p>`,
    `<p>${escapeHtml(t.email.nextSteps)}</p>`,
  ].join('');

  return {
    subject: t.email.customerSubject,
    text,
    html,
  };
}

function buildAdminEmail(order, t) {
  const labels = t.email.labels;
  const servicesList = formatServices(order.services, t);
  const languageName = t.language.names[order.language] || order.language.toUpperCase();
  const notesValue = order.notes || t.email.noNotes;

  const summaryItems = [
    { label: labels.name, value: order.fullName },
    { label: labels.email, value: order.email },
    { label: labels.phone, value: order.phone || t.email.notProvided },
    { label: labels.location, value: order.location },
    { label: labels.language, value: languageName },
    { label: labels.orderId, value: order.id },
    { label: labels.timestamp, value: order.createdAt },
  ];

  const text = [
    t.email.adminIntro,
    '',
    t.email.summaryTitle,
    ...summaryItems.map((item) => `${item.label}: ${item.value}`),
    '',
    `${t.email.servicesTitle}: ${servicesList.join(', ') || t.email.noServices}`,
    `${labels.notes}: ${notesValue}`,
  ].join('\n');

  const html = [
    `<p>${escapeHtml(t.email.adminIntro)}</p>`,
    `<h3>${escapeHtml(t.email.summaryTitle)}</h3>`,
    '<ul>',
    ...summaryItems.map(
      (item) =>
        `<li><strong>${escapeHtml(item.label)}:</strong> ${escapeHtml(item.value)}</li>`
    ),
    '</ul>',
    `<h3>${escapeHtml(t.email.servicesTitle)}</h3>`,
    `<p>${escapeHtml(servicesList.join(', ') || t.email.noServices)}</p>`,
    `<p><strong>${escapeHtml(labels.notes)}:</strong> ${escapeHtml(notesValue)}</p>`,
  ].join('');

  return {
    subject: t.email.adminSubject.replace('{{name}}', order.fullName),
    text,
    html,
  };
}

async function sendEmail({ to, subject, html, text }) {
  const apiKey = process.env.SMTP2GO_API_KEY;
  const sender = process.env.FROM_EMAIL;

  if (!apiKey) {
    throw new Error('SMTP2GO_API_KEY is not set');
  }

  if (!sender) {
    throw new Error('FROM_EMAIL is not set');
  }

  const payload = {
    api_key: apiKey,
    to,
    sender,
    subject,
    html_body: html,
    text_body: text,
  };

  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok || data.status !== 'success') {
    const error = new Error('SMTP2GO request failed');
    error.details = data;
    throw error;
  }
}

async function sendOrderEmails(order) {
  const t = getLocale(order.language);
  const customerEmail = buildCustomerEmail(order, t);
  const adminEmail = buildAdminEmail(order, t);
  const adminRecipients = parseAdminEmails(process.env.ADMIN_EMAILS);

  await sendEmail({
    to: [order.email],
    subject: customerEmail.subject,
    html: customerEmail.html,
    text: customerEmail.text,
  });

  if (adminRecipients.length > 0) {
    await sendEmail({
      to: adminRecipients,
      subject: adminEmail.subject,
      html: adminEmail.html,
      text: adminEmail.text,
    });
  }
}

module.exports = {
  sendOrderEmails,
};
