import pool from '../database/db.js';

// ── READ ───────────────────────────────────────────────────────────────────────

export const getAllInvoices = async () => {
  const [rows] = await pool.query(
    `SELECT i.*,
            so.order_id,
            so.status AS order_status
     FROM invoices i
     LEFT JOIN sales_orders so ON so.invoice_id = i.invoice_id
     ORDER BY i.issue_date DESC`
  );
  return rows;
};

// Returns invoices that still have an outstanding balance — used to populate
// the "Select Invoice" dropdown in the New Receipt modal. Invoices linked to
// a Cancelled order are excluded since payments can no longer be recorded
// against them.
export const getUnpaidInvoices = async () => {
  const [rows] = await pool.query(
    `SELECT i.invoice_id, i.amount, i.paid,
            (i.amount - i.paid) AS balance,
            so.order_id
     FROM invoices i
     LEFT JOIN sales_orders so ON so.invoice_id = i.invoice_id
     WHERE i.status IN ('Unpaid','Partial','Overdue')
       AND (so.status IS NULL OR so.status != 'Cancelled')
     ORDER BY i.issue_date DESC`
  );
  return rows;
};

export const getInvoiceById = async (invoiceId) => {
  const [rows] = await pool.query(
    `SELECT i.*,
            so.order_id,
            so.status AS order_status
     FROM invoices i
     LEFT JOIN sales_orders so ON so.invoice_id = i.invoice_id
     WHERE i.invoice_id = ?`,
    [invoiceId]
  );
  return rows[0] || null;
};

export const searchInvoices = async (term) => {
  const [rows] = await pool.query(
    `SELECT i.*,
            so.order_id,
            so.status AS order_status
     FROM invoices i
     LEFT JOIN sales_orders so ON so.invoice_id = i.invoice_id
     WHERE i.invoice_id LIKE ?
     ORDER BY i.issue_date DESC`,
    [`%${term}%`]
  );
  return rows;
};

// ── WRITE ──────────────────────────────────────────────────────────────────────
// Invoices are always created automatically when a Sales Order is placed.
// The only manual edit allowed here is adjusting the due date or payment mode.

export const updateInvoice = async (invoiceId, data) => {
  const { due_date, mode_of_payment } = data;
  const [result] = await pool.query(
    `UPDATE invoices SET due_date = ?, mode_of_payment = ? WHERE invoice_id = ?`,
    [due_date, mode_of_payment, invoiceId]
  );
  return result;
};

// Only standalone invoices (no linked order) can be deleted.
export const deleteInvoice = async (invoiceId) => {
  const [orders] = await pool.query(
    'SELECT order_id FROM sales_orders WHERE invoice_id = ?', [invoiceId]
  );
  if (orders.length > 0) {
    throw new Error('Cannot delete invoice: it is linked to an existing sales order');
  }
  const [result] = await pool.query(
    'DELETE FROM invoices WHERE invoice_id = ?', [invoiceId]
  );
  return result;
};
