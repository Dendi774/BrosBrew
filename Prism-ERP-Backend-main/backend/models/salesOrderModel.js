import pool from '../database/db.js';

const generateInvoiceId = () => `INV-${Date.now().toString().slice(-8)}`;

// ── READ ───────────────────────────────────────────────────────────────────────

export const getAllOrders = async () => {
  const [rows] = await pool.query(
    `SELECT so.*,
            COALESCE(i.amount, 0)  AS invoice_amount,
            COALESCE(i.paid,   0)  AS invoice_paid,
            i.status               AS invoice_status
     FROM sales_orders so
     LEFT JOIN invoices i ON so.invoice_id = i.invoice_id
     ORDER BY so.order_date DESC`
  );
  return rows;
};

export const getOrderById = async (id) => {
  const [orderRows] = await pool.query(
    'SELECT * FROM sales_orders WHERE order_id = ?', [id]
  );
  if (orderRows.length === 0) return null;

  const order = orderRows[0];

  const [items] = await pool.query(
    `SELECT soi.order_item_id, soi.product_id, soi.quantity,
            soi.unit_price, soi.subtotal, p.product_name
     FROM sales_order_items soi
     JOIN products p ON soi.product_id = p.product_id
     WHERE soi.order_id = ?`,
    [id]
  );

  const [invoiceRows] = await pool.query(
    'SELECT * FROM invoices WHERE invoice_id = ?', [order.invoice_id]
  );

  return { ...order, items, invoice: invoiceRows[0] || null };
};

// ── CREATE ─────────────────────────────────────────────────────────────────────

export const createOrder = async (data) => {
  const { items, mode_of_payment, status = 'Pending' } = data;

  if (!items || items.length === 0) throw new Error('Order must include at least one item');
  if (!mode_of_payment)            throw new Error('mode_of_payment is required');

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const productIds = items.map((i) => i.product_id);
    const [products] = await connection.query(
      'SELECT product_id, price FROM products WHERE product_id IN (?)', [productIds]
    );
    if (products.length !== productIds.length) throw new Error('One or more products do not exist');

    const productMap = new Map(products.map((p) => [p.product_id, p]));

    let totalAmount = 0;
    const lineItems = items.map((item) => {
      const product = productMap.get(item.product_id);
      if (!item.quantity || item.quantity <= 0) throw new Error(`Invalid quantity for product ${item.product_id}`);
      const subtotal = Number(product.price) * item.quantity;
      totalAmount += subtotal;
      return { product_id: item.product_id, quantity: item.quantity, unit_price: product.price, subtotal };
    });

    const invoiceId = generateInvoiceId();
    const issueDate = new Date();
    const dueDate   = new Date();
    dueDate.setDate(dueDate.getDate() + 30);

    await connection.query(
      `INSERT INTO invoices (invoice_id, issue_date, due_date, amount, paid, mode_of_payment, status)
       VALUES (?, ?, ?, ?, 0.00, ?, 'Unpaid')`,
      [invoiceId, issueDate, dueDate, totalAmount, mode_of_payment]
    );

    const [orderResult] = await connection.query(
      `INSERT INTO sales_orders (order_date, total_amount, status, mode_of_payment, invoice_id)
       VALUES (NOW(), ?, ?, ?, ?)`,
      [totalAmount, status, mode_of_payment, invoiceId]
    );
    const orderId = orderResult.insertId;

    for (const line of lineItems) {
      await connection.query(
        `INSERT INTO sales_order_items (order_id, product_id, quantity, unit_price, subtotal)
         VALUES (?, ?, ?, ?, ?)`,
        [orderId, line.product_id, line.quantity, line.unit_price, line.subtotal]
      );
    }

    await connection.commit();
    return orderId;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

// ── INVENTORY DEDUCTION ────────────────────────────────────────────────────────
// Called exactly once per order when it moves into 'Preparing'.
// Deducts ingredient stock according to each product's recipe.

export const deductInventoryForPreparingOrder = async (orderId, connection = pool) => {
  const [orderItems] = await connection.query(
    'SELECT product_id, quantity FROM sales_order_items WHERE order_id = ?', [orderId]
  );

  for (const item of orderItems) {
    const [recipe] = await connection.query(
      'SELECT ingredient_id, quantity_used FROM product_ingredients WHERE product_id = ?',
      [item.product_id]
    );

    for (const ingredient of recipe) {
      const totalUsed = Number(ingredient.quantity_used) * item.quantity;

      await connection.query(
        `UPDATE ingredients SET quantity_in_stock = quantity_in_stock - ? WHERE ingredient_id = ?`,
        [totalUsed, ingredient.ingredient_id]
      );

      await connection.query(
        `INSERT INTO inventory_transactions
           (ingredient_id, order_id, transaction_type, quantity, notes, created_at)
         VALUES (?, ?, 'Sale', ?, ?, NOW())`,
        [ingredient.ingredient_id, orderId, totalUsed, `Order #${orderId} prepared`]
      );
    }
  }
};

// ── STATUS TRANSITIONS ─────────────────────────────────────────────────────────
//
// Allowed transitions:
//   Pending    → Preparing   (triggered automatically by receiptModel when invoice is fully paid)
//   Pending    → Cancelled   (manual cancel before payment)
//   Preparing  → Completed   (barista marks order done — exposed as PATCH /:id/complete)
//   Preparing  → Cancelled   (admin cancel after payment; inventory already deducted — no reversal here)
//   Completed  → (terminal — no further changes)
//   Cancelled  → (terminal — no further changes)

const ALLOWED_TRANSITIONS = {
  Pending:   ['Preparing', 'Cancelled'],
  Preparing: ['Completed', 'Cancelled'],
  Completed: [],
  Cancelled: [],
};

export const updateOrderStatus = async (id, newStatus, connection = pool) => {
  // Fetch current status
  const [rows] = await connection.query(
    'SELECT status, inventory_deducted FROM sales_orders WHERE order_id = ?', [id]
  );
  if (rows.length === 0) throw new Error('Order not found');

  const { status: currentStatus, inventory_deducted } = rows[0];
  const allowed = ALLOWED_TRANSITIONS[currentStatus] || [];

  if (!allowed.includes(newStatus)) {
    throw new Error(
      `Cannot move order from '${currentStatus}' to '${newStatus}'. ` +
      `Allowed transitions: ${allowed.length ? allowed.join(', ') : 'none (terminal state)'}`
    );
  }

  await connection.query(
    'UPDATE sales_orders SET status = ? WHERE order_id = ?', [newStatus, id]
  );

  // Deduct inventory exactly once when entering Preparing
  if (newStatus === 'Preparing' && !inventory_deducted) {
    await deductInventoryForPreparingOrder(id, connection);
    await connection.query(
      'UPDATE sales_orders SET inventory_deducted = TRUE WHERE order_id = ?', [id]
    );
  }

  return { previousStatus: currentStatus, newStatus };
};

// Convenience wrapper — marks a Preparing order as Completed.
// Called from PATCH /api/v1/orders/:id/complete
export const completeOrder = async (id) => {
  return updateOrderStatus(id, 'Completed');
};

// ── DELETE ─────────────────────────────────────────────────────────────────────

export const deleteOrder = async (id) => {
  const [result] = await pool.query('DELETE FROM sales_orders WHERE order_id = ?', [id]);
  return result;
};
