import pool from '../database/db.js';

const generateReturnNumber = () => {
  const timestamp = Date.now().toString().slice(-8);
  return `SR-${timestamp}`;
};

export const getAllReturns = async () => {
  const [rows] = await pool.query(
    'SELECT * FROM sales_returns ORDER BY return_date DESC'
  );
  return rows;
};

export const getReturnById = async (id) => {
  const [returnRows] = await pool.query(
    'SELECT * FROM sales_returns WHERE return_id = ?',
    [id]
  );
  if (returnRows.length === 0) return null;

  const [items] = await pool.query(
    `SELECT sri.*, soi.product_id, p.product_name
     FROM sales_return_items sri
     JOIN sales_order_items soi ON sri.order_item_id = soi.order_item_id
     JOIN products p ON soi.product_id = p.product_id
     WHERE sri.return_id = ?`,
    [id]
  );

  return { ...returnRows[0], items };
};

// Helper: sums how many units of a given order_item have already been
// returned across all PRIOR return requests (excluding rejected ones,
// since a rejected return never actually took stock/refund effect).
// This is what prevents returning more than was ordered across multiple
// separate return requests, not just within a single request.
const getAlreadyReturnedQuantities = async (connection, orderItemIds) => {
  const [rows] = await connection.query(
    `SELECT sri.order_item_id, COALESCE(SUM(sri.quantity), 0) AS total_returned
     FROM sales_return_items sri
     JOIN sales_returns sr ON sri.return_id = sr.return_id
     WHERE sri.order_item_id IN (?) AND sr.status != 'Rejected'
     GROUP BY sri.order_item_id`,
    [orderItemIds]
  );

  const map = new Map();
  rows.forEach((row) => map.set(row.order_item_id, Number(row.total_returned)));
  return map;
};

// Creates a new return request for items belonging to an existing order.
// Validates quantities against what's actually still returnable (ordered
// minus everything already returned in prior requests), then immediately
// restocks the products and reduces the linked invoice's amount owed.
export const createReturn = async (data) => {
  const { order_id, reason, items } = data;
  // items = [{ order_item_id, quantity }, ...]

  if (!order_id || !items || items.length === 0) {
    throw new Error('order_id and at least one item are required');
  }

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const orderItemIds = items.map((i) => i.order_item_id);
    const [orderItems] = await connection.query(
      `SELECT * FROM sales_order_items WHERE order_item_id IN (?) AND order_id = ?`,
      [orderItemIds, order_id]
    );

    if (orderItems.length !== orderItemIds.length) {
      throw new Error('One or more items do not belong to this order');
    }

    const itemMap = new Map(orderItems.map((i) => [i.order_item_id, i]));
    const alreadyReturnedMap = await getAlreadyReturnedQuantities(connection, orderItemIds);

    let refundAmount = 0;
    const lineItems = items.map((item) => {
      const orderItem = itemMap.get(item.order_item_id);
      const alreadyReturned = alreadyReturnedMap.get(item.order_item_id) || 0;
      const returnableQty = orderItem.quantity - alreadyReturned;

      if (!item.quantity || item.quantity <= 0) {
        throw new Error(`Invalid return quantity for item ${item.order_item_id}`);
      }
      if (item.quantity > returnableQty) {
        throw new Error(
          `Cannot return ${item.quantity} of item ${item.order_item_id} — only ${returnableQty} remaining returnable (already returned ${alreadyReturned} of ${orderItem.quantity})`
        );
      }

      const subtotal = Number(orderItem.unit_price) * item.quantity;
      refundAmount += subtotal;

      return {
        order_item_id: item.order_item_id,
        product_id: orderItem.product_id,
        quantity: item.quantity,
        subtotal,
      };
    });

    const returnNumber = generateReturnNumber();

    const [returnResult] = await connection.query(
      `INSERT INTO sales_returns (return_number, order_id, reason, refund_amount, status)
       VALUES (?, ?, ?, ?, 'Pending')`,
      [returnNumber, order_id, reason || null, refundAmount]
    );
    const returnId = returnResult.insertId;

    for (const line of lineItems) {
      await connection.query(
        `INSERT INTO sales_return_items (return_id, order_item_id, quantity, subtotal)
         VALUES (?, ?, ?, ?)`,
        [returnId, line.order_item_id, line.quantity, line.subtotal]
      );

      // Restock immediately — returned units go back into available inventory
      // as soon as the return is logged, rather than waiting on a status change
      await connection.query(
        'UPDATE products SET stock_quantity = stock_quantity + ? WHERE product_id = ?',
        [line.quantity, line.product_id]
      );
    }

    // The order's invoice now covers fewer goods, so reduce what's owed.
    // Lock the invoice row first since receipts could be modifying it concurrently.
    const [orderRows] = await connection.query(
      'SELECT invoice_id FROM sales_orders WHERE order_id = ?',
      [order_id]
    );
    const invoiceId = orderRows[0]?.invoice_id;

    if (invoiceId) {
      const [invoiceRows] = await connection.query(
        'SELECT * FROM invoices WHERE invoice_id = ? FOR UPDATE',
        [invoiceId]
      );
      const invoice = invoiceRows[0];

      const newAmount = Math.max(0, Number(invoice.amount) - refundAmount);
      const paid = Number(invoice.paid);

      // Recalculate status against the new, smaller amount owed
      let newStatus = invoice.status;
      if (paid >= newAmount && newAmount > 0) newStatus = 'Paid';
      else if (paid === 0) newStatus = 'Unpaid';
      else if (paid > 0 && paid < newAmount) newStatus = 'Partial';
      else if (newAmount === 0) newStatus = 'Paid';

      await connection.query(
        'UPDATE invoices SET amount = ?, status = ? WHERE invoice_id = ?',
        [newAmount, newStatus, invoiceId]
      );
    }

    await connection.commit();
    return returnId;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

// Updates a return's status only. Stock and invoice adjustments now happen
// at creation time (see createReturn), so this function's job is narrower:
// - Moving to 'Rejected' REVERSES the stock/invoice changes, since the
//   return turned out not to be valid after all.
// - Any other status change (Processing, Approved, Refunded) is just a
//   label update and does not touch stock or the invoice again.
export const updateReturnStatus = async (id, status) => {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [returnRows] = await connection.query(
      'SELECT * FROM sales_returns WHERE return_id = ?',
      [id]
    );
    if (returnRows.length === 0) throw new Error('Return not found');

    const currentReturn = returnRows[0];

    // Only act if we're newly transitioning INTO 'Rejected' from a non-rejected state
    if (status === 'Rejected' && currentReturn.status !== 'Rejected') {
      const [items] = await connection.query(
        `SELECT sri.quantity, soi.product_id
         FROM sales_return_items sri
         JOIN sales_order_items soi ON sri.order_item_id = soi.order_item_id
         WHERE sri.return_id = ?`,
        [id]
      );

      // Take the restocked units back out, since the return is being denied
      for (const item of items) {
        await connection.query(
          'UPDATE products SET stock_quantity = stock_quantity - ? WHERE product_id = ?',
          [item.quantity, item.product_id]
        );
      }

      // Restore the invoice amount that was previously reduced by this return
      const [orderRows] = await connection.query(
        'SELECT invoice_id FROM sales_orders WHERE order_id = ?',
        [currentReturn.order_id]
      );
      const invoiceId = orderRows[0]?.invoice_id;

      if (invoiceId) {
        const [invoiceRows] = await connection.query(
          'SELECT * FROM invoices WHERE invoice_id = ? FOR UPDATE',
          [invoiceId]
        );
        const invoice = invoiceRows[0];

        const restoredAmount = Number(invoice.amount) + Number(currentReturn.refund_amount);
        const paid = Number(invoice.paid);

        let newStatus = invoice.status;
        if (paid >= restoredAmount) newStatus = 'Paid';
        else if (paid === 0) newStatus = 'Unpaid';
        else newStatus = 'Partial';

        await connection.query(
          'UPDATE invoices SET amount = ?, status = ? WHERE invoice_id = ?',
          [restoredAmount, newStatus, invoiceId]
        );
      }
    }

    await connection.query(
      'UPDATE sales_returns SET status = ? WHERE return_id = ?',
      [status, id]
    );

    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};