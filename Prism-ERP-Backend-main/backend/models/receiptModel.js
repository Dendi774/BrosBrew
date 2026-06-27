import pool from '../database/db.js';
import * as SalesOrderModel from './salesOrderModel.js';

const generateReceiptNumber = () => `OR-${Date.now().toString().slice(-8)}`;

// ── READ ───────────────────────────────────────────────────────────────────────

export const getAllReceipts = async () => {
  const [rows] = await pool.query(
    `SELECT r.*, u.username AS processed_by_name
     FROM receipts r
     LEFT JOIN users u ON r.processed_by = u.user_id
     ORDER BY r.receipt_date DESC`
  );
  return rows;
};

export const getReceiptById = async (id) => {
  const [rows] = await pool.query(
    `SELECT r.*, u.username AS processed_by_name
     FROM receipts r
     LEFT JOIN users u ON r.processed_by = u.user_id
     WHERE r.receipt_id = ?`,
    [id]
  );
  return rows[0] || null;
};

// ── CREATE ─────────────────────────────────────────────────────────────────────
//
// Flow:
//   1. Lock the invoice row
//   2. Reject if the linked order has been Cancelled
//   3. Validate amount won't exceed the outstanding balance
//   4. Insert receipt, update invoice paid/status
//   5. If invoice is now fully Paid AND the linked order is still Pending
//      → move order to Preparing (triggers ingredient deduction)
//
// NOTE: A Cancelled order can no longer receive payments. Once an order is
// cancelled there is nothing left to settle, so the invoice is effectively
// closed — trying to record a receipt against it is rejected outright.

export const createReceipt = async (data) => {
  const { invoice_id, amount, method, processed_by } = data;

  if (!invoice_id || !amount || !method) {
    throw new Error('invoice_id, amount, and method are required');
  }
  if (Number(amount) <= 0) {
    throw new Error('Payment amount must be greater than zero');
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [invoiceRows] = await connection.query(
      'SELECT * FROM invoices WHERE invoice_id = ? FOR UPDATE',
      [invoice_id]
    );
    if (invoiceRows.length === 0) throw new Error('Invoice not found');
    const invoice = invoiceRows[0];

    if (invoice.status === 'Paid') {
      throw new Error('This invoice is already fully paid');
    }

    const [orderRowsCheck] = await connection.query(
      'SELECT status FROM sales_orders WHERE invoice_id = ? FOR UPDATE',
      [invoice_id]
    );
    if (orderRowsCheck.length > 0 && orderRowsCheck[0].status === 'Cancelled') {
      throw new Error('Cannot record a payment for a cancelled order');
    }

    const balance = Number(invoice.amount) - Number(invoice.paid);
    const payment = Number(amount);
    if (payment > balance + 0.001) {
      throw new Error(
        `Payment of ₱${payment.toFixed(2)} exceeds remaining balance of ₱${balance.toFixed(2)}`
      );
    }

    const newPaid   = Number(invoice.paid) + payment;
    const newStatus = newPaid >= Number(invoice.amount) ? 'Paid'
                    : newPaid === 0                     ? 'Unpaid'
                    :                                     'Partial';

    const receiptNumber = generateReceiptNumber();

    await connection.query(
      `INSERT INTO receipts (receipt_number, invoice_id, amount, method, processed_by)
       VALUES (?, ?, ?, ?, ?)`,
      [receiptNumber, invoice_id, payment, method, processed_by || null]
    );

    await connection.query(
      `UPDATE invoices SET paid = ?, status = ? WHERE invoice_id = ?`,
      [newPaid, newStatus, invoice_id]
    );

    // Only auto-advance to Preparing when the order is still Pending.
    // (Cancelled orders are already rejected above, so we only ever see
    // Pending/Approved/Preparing/Completed orders reach this point.)
    if (newStatus === 'Paid') {
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
