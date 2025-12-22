const SERVICE_LABELS = {
  jellyfin: 'Jellyfin',
  immich: 'Immich',
  kavita: 'Kavita',
  audiobookshelf: 'Audiobookshelf',
  'extra-storage': 'Extra Storage (External Drive)',
};

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatDate(value) {
  if (!value) {
    return '';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  return date.toLocaleString('en-US', {
    timeZone: 'America/Puerto_Rico',
    timeZoneName: 'short',
  });
}

function formatCurrency(amount, currency) {
  if (typeof amount !== 'number') {
    return '';
  }
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency || 'USD',
  }).format(amount);
}

function renderLayout({ title, body, message, messageType }) {
  const statusClass =
    messageType === 'success' ? 'notice success' : messageType === 'error' ? 'notice error' : 'notice';
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(title)}</title>
    <style>
      :root {
        color-scheme: dark;
      }
      body {
        margin: 0;
        font-family: Arial, sans-serif;
        background: #0a0f14;
        color: #e8edf6;
      }
      .shell {
        max-width: 1100px;
        margin: 0 auto;
        padding: 32px 24px 60px;
      }
      .card {
        background: #141c2b;
        border: 1px solid #263049;
        border-radius: 16px;
        padding: 20px;
        margin-bottom: 20px;
      }
      h1, h2, h3 {
        margin: 0 0 16px;
      }
      h1 {
        font-size: 24px;
      }
      h2 {
        font-size: 18px;
      }
      p {
        color: #9aa6bf;
      }
      a {
        color: #5ff0c7;
        text-decoration: none;
      }
      .grid {
        display: grid;
        gap: 16px;
      }
      .grid.two {
        grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
      }
      .table {
        width: 100%;
        border-collapse: collapse;
      }
      .table th,
      .table td {
        text-align: left;
        padding: 12px;
        border-bottom: 1px solid #263049;
        font-size: 14px;
      }
      .badge {
        padding: 4px 10px;
        border-radius: 999px;
        font-size: 12px;
        text-transform: uppercase;
        letter-spacing: 1px;
        background: #1b2740;
        color: #9aa6bf;
      }
      .notice {
        background: #1b2740;
        border: 1px solid #263049;
        border-radius: 12px;
        padding: 12px 16px;
        margin-bottom: 16px;
      }
      .notice.success {
        border-color: #44d7b6;
        color: #5ff0c7;
      }
      .notice.error {
        border-color: #ff6b6b;
        color: #ff6b6b;
      }
      label {
        display: grid;
        gap: 6px;
        font-size: 14px;
      }
      input, textarea {
        padding: 10px 12px;
        border-radius: 10px;
        border: 1px solid #263049;
        background: #0f1524;
        color: #e8edf6;
      }
      .btn {
        background: linear-gradient(120deg, #44d7b6, #f2a85d);
        color: #0b0f14;
        border: none;
        padding: 10px 18px;
        border-radius: 999px;
        font-weight: 600;
        cursor: pointer;
      }
      .btn.secondary {
        background: transparent;
        border: 1px solid #263049;
        color: #e8edf6;
      }
      .btn.small {
        padding: 6px 12px;
        font-size: 12px;
      }
      .actions {
        display: flex;
        gap: 12px;
        flex-wrap: wrap;
      }
      .meta {
        color: #9aa6bf;
        font-size: 13px;
      }
      .other-item-row {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 12px;
        align-items: end;
      }
      .other-item-row .remove-item {
        justify-self: start;
      }
    </style>
  </head>
  <body>
    <div class="shell">
      ${message ? `<div class="${statusClass}">${escapeHtml(message)}</div>` : ''}
      ${body}
    </div>
  </body>
</html>`;
}

function renderLogin({ message, adminPath }) {
  const body = `
    <div class="card">
      <h1>Obsydia Admin</h1>
      <p>Sign in to manage orders.</p>
      <form method="post" action="/${adminPath}/login" class="grid">
        <label>
          Username
          <input type="text" name="username" required />
        </label>
        <label>
          Password
          <input type="password" name="password" required />
        </label>
        <button class="btn" type="submit">Sign in</button>
      </form>
    </div>
  `;

  return renderLayout({ title: 'Admin Login', body, message, messageType: 'error' });
}

function renderOrders({ orders, adminPath, message, dbEnabled }) {
  const body = `
    <div class="card">
      <div class="actions" style="justify-content: space-between; align-items: center;">
        <h1>Orders</h1>
        <form method="post" action="/${adminPath}/logout">
          <button class="btn secondary" type="submit">Log out</button>
        </form>
      </div>
      ${
        !dbEnabled
          ? '<div class="notice">Database is not configured. Orders will not be stored.</div>'
          : ''
      }
      <table class="table">
        <thead>
          <tr>
            <th>Order ID</th>
            <th>Customer</th>
            <th>Email</th>
            <th>Status</th>
            <th>Created</th>
          </tr>
        </thead>
        <tbody>
          ${orders
            .map(
              (order) => `
            <tr>
              <td><a href="/${adminPath}/orders/${escapeHtml(order.id)}">${escapeHtml(order.id)}</a></td>
              <td>${escapeHtml(order.fullName)}</td>
              <td>${escapeHtml(order.email)}</td>
              <td><span class="badge">${escapeHtml(order.status)}</span></td>
              <td>${escapeHtml(formatDate(order.createdAt))}</td>
            </tr>
          `
            )
            .join('')}
        </tbody>
      </table>
    </div>
  `;

  return renderLayout({ title: 'Orders', body, message, messageType: 'success' });
}

function renderOrderDetail({ order, adminPath, message, messageType, quoteDefaults }) {
  if (!order) {
    return renderLayout({
      title: 'Order not found',
      body: '<div class="card"><h1>Order not found.</h1></div>',
      message,
      messageType,
    });
  }

  const services = (order.services || []).map((service) => SERVICE_LABELS[service] || service);
  const quote = quoteDefaults || {};
  const otherItems = Array.isArray(quote.otherItems) ? quote.otherItems : [];
  const normalizedOtherItems = otherItems.length > 0 ? otherItems : [{ label: '', amount: '' }];
  const otherRows = normalizedOtherItems
    .map(
      (item) => `
            <div class="other-item-row">
              <label>
                Other item label
                <input type="text" name="otherLabel[]" value="${escapeHtml(item.label)}" />
              </label>
              <label>
                Other item amount
                <input type="number" name="otherAmount[]" step="0.01" min="0" value="${escapeHtml(item.amount)}" />
              </label>
              <button class="btn secondary small remove-item" type="button">Remove</button>
            </div>
          `
    )
    .join('');

  const body = `
    <div class="actions" style="margin-bottom: 16px;">
      <a class="btn secondary" href="/${adminPath}">Back to orders</a>
      <form method="post" action="/${adminPath}/logout">
        <button class="btn secondary" type="submit">Log out</button>
      </form>
    </div>

    <div class="card">
      <h1>Order ${escapeHtml(order.id)}</h1>
      <div class="grid two">
        <div>
          <h3>Customer</h3>
          <div class="meta">${escapeHtml(order.fullName)}</div>
          <div class="meta">${escapeHtml(order.email)}</div>
          <div class="meta">${escapeHtml(order.phone)}</div>
        </div>
        <div>
          <h3>Shipping</h3>
          <div class="meta">${escapeHtml(order.address)}</div>
          <div class="meta">${escapeHtml(order.location)}</div>
        </div>
        <div>
          <h3>Services</h3>
          <div class="meta">${escapeHtml(services.join(', ') || 'None')}</div>
        </div>
        <div>
          <h3>Status</h3>
          <div class="meta">${escapeHtml(order.status)}</div>
          <div class="meta">Created ${escapeHtml(formatDate(order.createdAt))}</div>
        </div>
      </div>
      ${order.notes ? `<div class="meta" style="margin-top: 12px;">Notes: ${escapeHtml(order.notes)}</div>` : ''}
    </div>

    <div class="card">
      <h2>Send Quote</h2>
      <form method="post" action="/${adminPath}/orders/${escapeHtml(order.id)}/quote" class="grid">
        <div class="grid two">
          <label>
            Base PC
            <input type="number" name="pc" step="0.01" min="0" required value="${escapeHtml(quote.pc)}" />
          </label>
          <label>
            Jellyfin
            <input type="number" name="jellyfin" step="0.01" min="0" value="${escapeHtml(quote.jellyfin)}" />
          </label>
          <label>
            Immich
            <input type="number" name="immich" step="0.01" min="0" value="${escapeHtml(quote.immich)}" />
          </label>
          <label>
            Kavita
            <input type="number" name="kavita" step="0.01" min="0" value="${escapeHtml(quote.kavita)}" />
          </label>
          <label>
            Audiobookshelf
            <input type="number" name="audiobookshelf" step="0.01" min="0" value="${escapeHtml(quote.audiobookshelf)}" />
          </label>
          <label>
            Extra Storage (External Drive)
            <input type="number" name="extra-storage" step="0.01" min="0" value="${escapeHtml(quote['extra-storage'])}" />
          </label>
        </div>
        <div class="grid">
          <h3>Other items</h3>
          <div id="other-items" class="grid">
            ${otherRows}
          </div>
          <button class="btn secondary small" type="button" id="add-other-item">Add another item</button>
          <template id="other-item-template">
            <div class="other-item-row">
              <label>
                Other item label
                <input type="text" name="otherLabel[]" />
              </label>
              <label>
                Other item amount
                <input type="number" name="otherAmount[]" step="0.01" min="0" />
              </label>
              <button class="btn secondary small remove-item" type="button">Remove</button>
            </div>
          </template>
        </div>
        <label>
          Notes to customer (optional)
          <textarea name="quoteNotes" rows="3">${escapeHtml(quote.notes)}</textarea>
        </label>
        <div class="actions">
          <button class="btn" type="submit">Send quote email</button>
        </div>
      </form>
    </div>
    <script>
      (() => {
        const container = document.getElementById('other-items');
        const template = document.getElementById('other-item-template');
        const addButton = document.getElementById('add-other-item');
        if (!container || !template || !addButton) {
          return;
        }

        const wireRow = (row) => {
          const removeButton = row.querySelector('.remove-item');
          if (removeButton) {
            removeButton.addEventListener('click', () => {
              row.remove();
            });
          }
        };

        container.querySelectorAll('.other-item-row').forEach(wireRow);

        const addRow = () => {
          const fragment = template.content.cloneNode(true);
          const row = fragment.querySelector('.other-item-row');
          wireRow(row);
          container.appendChild(fragment);
        };

        addButton.addEventListener('click', addRow);

        if (!container.querySelector('.other-item-row')) {
          addRow();
        }
      })();
    </script>
  `;

  return renderLayout({ title: `Order ${order.id}`, body, message, messageType });
}

module.exports = {
  renderLogin,
  renderOrders,
  renderOrderDetail,
  formatCurrency,
};
