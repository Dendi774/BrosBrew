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

// Sums how many units of each order_item have already been returned
// across all PRIOR non-rejected returns, so we can enforce the real
// remaining returnable quantity across multiple separate requests.
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

// Looks up each ingredient + quantity that the recipe for a product calls
// for, scaled by how many units of that product are being returned.
// Used to log how much ingredient was wasted by the return.
const getIngredientUsageForProduct = async (connection, productId, productQty) => {
  const [recipe] = await connection.query(
    'SELECT ingredient_id, quantity_used FROM product_ingredients WHERE product_id = ?',
    [productId]
  );

  return recipe.map((r) => ({
    ingredient_id: r.ingredient_id,
    quantity: Number(r.quantity_used) * productQty,
  }));
};

// Creates a new return REQUEST only. No stock, ingredient, or invoice
// changes happen here — those only take effect once the return is
// actually approved (see updateReturnStatus).
export const createReturn = async (data) => {
  const { order_id, reason, items } = data;

  if (!order_id || !items || items.length === 0) {
    throw new Error('order_id and at least one item are required');
  }

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    // Only completed orders are eligible for returns — you can't return
    // something that was never finished/delivered yet
    const [orderRows] = await connection.query(
      'SELECT status FROM sales_orders WHERE order_id = ?',
      [order_id]
    );
    if (orderRows.length === 0) {
      throw new Error('Order not found');
    }
    if (orderRows[0].status !== 'Completed') {
      throw new Error('Only completed orders can be returned');
    }

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
          `Cannot return ${item.quantity} of item ${item.order_item_id} — only ${returnableQty} remaining returnable`
        );
      }

      const subtotal = Number(orderItem.unit_price) * item.quantity;
      refundAmount += subtotal;

      return { order_item_id: item.order_item_id, quantity: item.quantity, subtotal };
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

// Updates a return's status. The real work happens on specific transitions:
//
// -> 'Approved' (from a non-approved state):
//      - Always reduce the linked invoice's amount owed by refund_amount,
//        since the customer owes less regardless of order status
//      - Check the ORDER's status:
//          - 'Pending'   -> ingredients were never deducted yet, so no
//            stock/ingredient change and nothing to log
//          - 'Preparing' / 'Completed' -> ingredients were already
//            consumed making the drink and can't be reclaimed, so log
//            each affected ingredient as 'Waste' in inventory_transactions
//            (this does not change ingredients.quantity_in_stock — it's
//            already gone, this is just an audit record of the loss)
//
// -> 'Rejected' (from 'Approved'):
//      - Reverses the invoice adjustment made above
//      - Deletes any 'Waste' inventory_transactions rows logged for this return
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

    // ---- Transition INTO 'Approved' ----
    if (status === 'Approved' && currentReturn.status !== 'Approved') {
      const [order] = await connection.query(
        'SELECT invoice_id FROM sales_orders WHERE order_id = ?',
        [currentReturn.order_id]
      );
      const invoiceId = order[0].invoice_id;

      // Reduce the invoice amount owed by the refund
      const [invoiceRows] = await connection.query(
        'SELECT * FROM invoices WHERE invoice_id = ? FOR UPDATE',
        [invoiceId]
      );
      const invoice = invoiceRows[0];
      const newAmount = Math.max(0, Number(invoice.amount) - Number(currentReturn.refund_amount));
      const paid = Number(invoice.paid);

      let newInvoiceStatus = invoice.status;
      if (newAmount === 0 || paid >= newAmount) newInvoiceStatus = 'Paid';
      else if (paid === 0) newInvoiceStatus = 'Unpaid';
      else newInvoiceStatus = 'Partial';

      await connection.query(
        'UPDATE invoices SET amount = ?, status = ? WHERE invoice_id = ?',
        [newAmount, newInvoiceStatus, invoiceId]
      );

      // Order is always 'Completed' at this point (enforced in createReturn),
      // so ingredients were already consumed — always log as Waste
      const [returnItems] = await connection.query(
        `SELECT sri.quantity, soi.product_id
         FROM sales_return_items sri
         JOIN sales_order_items soi ON sri.order_item_id = soi.order_item_id
         WHERE sri.return_id = ?`,
        [id]
      );

      for (const item of returnItems) {
        const ingredientUsages = await getIngredientUsageForProduct(
          connection,
          item.product_id,
          item.quantity
        );

        for (const usage of ingredientUsages) {
          await connection.query(
            `INSERT INTO inventory_transactions
               (ingredient_id, order_id, transaction_type, quantity, notes, created_at)
             VALUES (?, ?, 'Waste', ?, ?, NOW())`,
            [
              usage.ingredient_id,
              currentReturn.order_id,
              usage.quantity,
              `Sales return ${currentReturn.return_number}`,
            ]
          );
        }
      }
    }

    // ---- Transition INTO 'Rejected' from 'Approved' (reverse everything) ----
    if (status === 'Rejected' && currentReturn.status === 'Approved') {
      const [order] = await connection.query(
        'SELECT invoice_id FROM sales_orders WHERE order_id = ?',
        [currentReturn.order_id]
      );
      const invoiceId = order[0]?.invoice_id;

      if (invoiceId) {
        const [invoiceRows] = await connection.query(
          'SELECT * FROM invoices WHERE invoice_id = ? FOR UPDATE',
          [invoiceId]
        );
        const invoice = invoiceRows[0];
        const restoredAmount = Number(invoice.amount) + Number(currentReturn.refund_amount);
        const paid = Number(invoice.paid);

        let newInvoiceStatus = invoice.status;
        if (paid >= restoredAmount) newInvoiceStatus = 'Paid';
        else if (paid === 0) newInvoiceStatus = 'Unpaid';
        else newInvoiceStatus = 'Partial';

        await connection.query(
          'UPDATE invoices SET amount = ?, status = ? WHERE invoice_id = ?',
          [restoredAmount, newInvoiceStatus, invoiceId]
        );
      }

      await connection.query(
        `DELETE FROM inventory_transactions WHERE order_id = ? AND notes = ?`,
        [currentReturn.order_id, `Sales return ${currentReturn.return_number}`]
      );
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