import pool from '../database/db.js';

// Generates a short, unique-ish invoice ID
const generateInvoiceId = () => {
  const timestamp = Date.now().toString().slice(-8);
  return `INV-${timestamp}`;
};

// List all invoices
export const getAllInvoices = async () => {
  const [rows] = await pool.query(
    'SELECT * FROM invoices ORDER BY issue_date DESC'
  );
  return rows;
};

// Get one invoice by its invoice_id (e.g. "INV-12345678")
export const getInvoiceById = async (invoiceId) => {
  const [rows] = await pool.query(
    'SELECT * FROM invoices WHERE invoice_id = ?',
    [invoiceId]
  );
  return rows[0] || null;
};

// Search invoices by invoice_id (used by the search bar in the UI)
// Uses LIKE so partial matches work, e.g. searching "0088" finds "INV-2406-0088"
export const searchInvoices = async (term) => {
  const [rows] = await pool.query(
    'SELECT * FROM invoices WHERE invoice_id LIKE ? ORDER BY issue_date DESC',
    [`%${term}%`]
  );
  return rows;
};

// Creates a standalone invoice (not tied to a sales order),
// e.g. for the "+ New Invoice" button in the UI
export const createInvoice = async (data) => {
  const { issue_date, due_date, amount, mode_of_payment } = data;

  if (!issue_date || !due_date || !amount) {
    throw new Error('issue_date, due_date, and amount are required');
  }

  const invoiceId = generateInvoiceId();

  await pool.query(
    `INSERT INTO invoices (invoice_id, issue_date, due_date, amount, paid, mode_of_payment, status)
     VALUES (?, ?, ?, ?, 0.00, ?, 'Unpaid')`,
    [invoiceId, issue_date, due_date, amount, mode_of_payment || null]
  );

  return invoiceId;
};

// Updates editable fields of an invoice (e.g. due date, mode of payment)
// Note: 'paid' and 'status' should normally only change via the receipts flow,
// not through this generic update
export const updateInvoice = async (invoiceId, data) => {
  const { due_date, mode_of_payment } = data;

  const [result] = await pool.query(
    `UPDATE invoices SET due_date = ?, mode_of_payment = ? WHERE invoice_id = ?`,
    [due_date, mode_of_payment, invoiceId]
  );
  return result;
};

// Deletes an invoice — only allowed if no sales_order references it
export const deleteInvoice = async (invoiceId) => {
  const [orders] = await pool.query(
    'SELECT order_id FROM sales_orders WHERE invoice_id = ?',
    [invoiceId]
  );
  if (orders.length > 0) {
    throw new Error('Cannot delete invoice: it is linked to an existing sales order');
  }

  const [result] = await pool.query(
    'DELETE FROM invoices WHERE invoice_id = ?',
    [invoiceId]
  );
  return result;
};