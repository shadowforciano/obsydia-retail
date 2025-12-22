const { Pool } = require('pg');

const databaseUrl = process.env.DATABASE_URL;
const useSsl = process.env.DATABASE_SSL !== 'false';

const pool = databaseUrl
  ? new Pool({
      connectionString: databaseUrl,
      ssl: useSsl ? { rejectUnauthorized: false } : false,
    })
  : null;

function getPool() {
  return pool;
}

function isDbEnabled() {
  return Boolean(pool);
}

async function initDb() {
  if (!pool) {
    return;
  }

  await pool.query(`
    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      full_name TEXT NOT NULL,
      email TEXT NOT NULL,
      phone TEXT NOT NULL,
      address TEXT NOT NULL,
      location TEXT NOT NULL,
      services JSONB NOT NULL,
      notes TEXT,
      language TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'new',
      quote JSONB,
      quote_total NUMERIC(10, 2),
      quote_sent_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
}

function mapOrderRow(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    fullName: row.full_name,
    email: row.email,
    phone: row.phone,
    address: row.address,
    location: row.location,
    services: row.services || [],
    notes: row.notes,
    language: row.language,
    status: row.status,
    quote: row.quote,
    quoteTotal: row.quote_total,
    quoteSentAt: row.quote_sent_at,
    createdAt: row.created_at,
  };
}

async function createOrder(order) {
  if (!pool) {
    return null;
  }

  const query = `
    INSERT INTO orders
      (id, full_name, email, phone, address, location, services, notes, language, status, created_at)
    VALUES
      ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'new', $10)
  `;

  const values = [
    order.id,
    order.fullName,
    order.email,
    order.phone,
    order.address,
    order.location,
    JSON.stringify(order.services),
    order.notes || null,
    order.language,
    order.createdAt,
  ];

  await pool.query(query, values);
  return order.id;
}

async function listOrders() {
  if (!pool) {
    return [];
  }

  const { rows } = await pool.query(
    'SELECT * FROM orders ORDER BY created_at DESC'
  );
  return rows.map(mapOrderRow);
}

async function getOrderById(id) {
  if (!pool) {
    return null;
  }

  const { rows } = await pool.query('SELECT * FROM orders WHERE id = $1', [id]);
  return mapOrderRow(rows[0]);
}

async function saveQuote(id, quote) {
  if (!pool) {
    return null;
  }

  const { rows } = await pool.query(
    `
      UPDATE orders
      SET status = 'quoted',
          quote = $2,
          quote_total = $3,
          quote_sent_at = NOW()
      WHERE id = $1
      RETURNING *
    `,
    [id, quote, quote.total]
  );

  return mapOrderRow(rows[0]);
}

module.exports = {
  getPool,
  isDbEnabled,
  initDb,
  createOrder,
  listOrders,
  getOrderById,
  saveQuote,
};
