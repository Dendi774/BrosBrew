import pool from '../database/db.js';

// Generates a short, unique-ish receipt number
const generateReceiptNumber = () => {
  const timestamp = Date.now().toString().slice(-8);
  return `OR-${timestamp}`;
};

// List all receipts
export const getAllReceipts = async () => {
  const [rows] = await pool.query(
    'SELECT * FROM receipts ORDER BY receipt_date DESC'
  );
  return rows;
};

// Get one receipt by ID
export const getReceiptById = async (id) => {
  const [rows] = await pool.query(
    'SELECT * FROM receipts WHERE receipt_id = ?',
    [id]
  );
  return rows[0] || null;
};

// Records a payment against an invoice: creates the receipt row,
// then updates the invoice's paid amount + status accordingly.
export const createReceipt = async (data) => {
  const { invoice_id, amount, method, processed_by } = data;

  if (!invoice_id || !amount || !method) {
    throw new Error('invoice_id, amount, and method are required');
  }

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    // Lock the invoice row while we read/update it, to avoid race conditions
    // if two payments come in at the same time
    const [invoiceRows] = await connection.query(
      'SELECT * FROM invoices WHERE invoice_id = ? FOR UPDATE',
      [invoice_id]
    );
    if (invoiceRows.length === 0) {
      throw new Error('Invoice not found');
    }
    const invoice = invoiceRows[0];

    const newPaid = Number(invoice.paid) + Number(amount);
    if (newPaid > Number(invoice.amount)) {
      throw new Error('Payment exceeds remaining invoice balance');
    }

    // Determine new invoice status based on how much has now been paid
    let newStatus = 'Partial';
    if (newPaid >= Number(invoice.amount)) newStatus = 'Paid';
    else if (newPaid === 0) newStatus = 'Unpaid';

    const receiptNumber = generateReceiptNumber();

    await connection.query(
      `INSERT INTO receipts (receipt_number, invoice_id, amount, method, processed_by)
       VALUES (?, ?, ?, ?, ?)`,
      [receiptNumber, invoice_id, amount, method, processed_by || null]
    );

    await connection.query(
      `UPDATE invoices SET paid = ?, status = ? WHERE invoice_id = ?`,
      [newPaid, newStatus, invoice_id]
    );

    await connection.commit();
    return receiptNumber;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};