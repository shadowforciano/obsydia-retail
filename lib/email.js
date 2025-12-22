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

function buildEmailShell(title, content) {
  return `<!doctype html>
<html>
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(title)}</title>
  </head>
  <body style="margin:0;background-color:#0a0f14;font-family:Arial,sans-serif;color:#e8edf6;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#0a0f14;padding:24px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;background-color:#141c2b;border-radius:16px;border:1px solid #263049;overflow:hidden;">
            <tr>
              <td style="padding:20px 24px;border-bottom:1px solid #263049;">
                <div style="font-size:12px;letter-spacing:4px;text-transform:uppercase;color:#9aa6bf;">Obsydia</div>
                <div style="font-size:20px;font-weight:600;color:#ffffff;margin-top:8px;">${escapeHtml(title)}</div>
              </td>
            </tr>
            <tr>
              <td style="padding:20px 24px;">
                ${content}
              </td>
            </tr>
            <tr>
              <td style="padding:16px 24px;border-top:1px solid #263049;color:#9aa6bf;font-size:12px;">
                Obsydia Retail
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function buildCustomerEmail(order, t) {
  const labels = t.email.labels;
  const servicesList = formatServices(order.services, t);
  const languageName = t.language.names[order.language] || order.language.toUpperCase();
  const notesValue = order.notes || t.email.noNotes;
  const paymentInstructions = applyPaymentNumber(t.email.paymentInstructions).replace(
    /\{\{\s*orderId\s*\}\}/g,
    order.id
  );

  const summaryItems = [
    { label: labels.name, value: order.fullName },
    { label: labels.email, value: order.email },
    { label: labels.phone, value: order.phone || t.email.notProvided },
    { label: labels.address, value: order.address || t.email.notProvided },
    { label: labels.location, value: order.location },
    { label: labels.language, value: languageName },
    { label: labels.orderId, value: order.id },
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

  const htmlContent = [
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
    html: buildEmailShell(t.email.customerSubject, htmlContent),
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
    { label: labels.address, value: order.address || t.email.notProvided },
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

  const htmlContent = [
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
    html: buildEmailShell(t.email.adminSubject.replace('{{name}}', order.fullName), htmlContent),
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

  const succeeded = data?.data?.succeeded ?? data?.succeeded;
  const failed = data?.data?.failed ?? data?.failed;
  const isSuccess =
    data?.status === 'success' ||
    (typeof succeeded === 'number' && typeof failed === 'number' && succeeded > 0 && failed === 0);

  if (!response.ok || !isSuccess) {
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
