import pool from '../database/db.js';
import * as SalesOrderModel from './salesOrderModel.js';

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
export const createReceipt = async (data) => {
  const { invoice_id, amount, method, processed_by } = data;

  if (!invoice_id || !amount || !method) {
    throw new Error('invoice_id, amount, and method are required');
  }

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

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

    // If this payment just fully settled the invoice, move the linked
    // order from 'Pending' into 'Preparing' — but only if it's still
    // 'Pending'. If it's already Preparing/Completed/Cancelled, leave it
    // alone (e.g. don't un-cancel a cancelled order just because a late
    // payment came in).
    if (newStatus === 'Paid') {
    // Look up the order linked to this invoice, then route the status
    // change through updateOrderStatus so inventory deduction happens too
    const [orderRows] = await connection.query(
        'SELECT order_id, status FROM sales_orders WHERE invoice_id = ?',
        [invoice_id]
    );

    if (orderRows.length > 0 && orderRows[0].status === 'Pending') {
        await SalesOrderModel.updateOrderStatus(orderRows[0].order_id, 'Preparing', connection);
    }
    }

    await connection.commit();
    return receiptNumber;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};