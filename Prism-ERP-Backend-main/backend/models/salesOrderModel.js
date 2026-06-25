import pool from '../database/db.js';

// Generates a short, unique-ish invoice ID using a timestamp
const generateInvoiceId = () => {
  const timestamp = Date.now().toString().slice(-8);
  return `INV-${timestamp}`;
};

const generateSalesOrderId = () => {
  const timestamp = Date.now().toString().slice(-8);
  return `SO-${timestamp}`;
};

// Fetch all orders (headers only, no line items) — used for list views
export const getAllOrders = async () => {
  const [rows] = await pool.query(
    'SELECT * FROM sales_orders ORDER BY order_date DESC'
  );
  return rows;
};

// Fetch one order with its full detail: line items + linked invoice
// Used for receipt/invoice views where you need everything about the order
export const getOrderById = async (id) => {
  const [orderRows] = await pool.query(
    'SELECT * FROM sales_orders WHERE order_id = ?',
    [id]
  );
  if (orderRows.length === 0) return null;

  const order = orderRows[0];

  // Join order items with products so we get product_name/sku, not just IDs
  const [items] = await pool.query(
    `SELECT soi.order_item_id, soi.product_id, soi.quantity, soi.unit_price, soi.subtotal,
            p.product_name, p.sku
     FROM sales_order_items soi
     JOIN products p ON soi.product_id = p.product_id
     WHERE soi.order_id = ?`,
    [id]
  );

  const [invoiceRows] = await pool.query(
    'SELECT * FROM invoices WHERE invoice_id = ?',
    [order.invoice_id]
  );

  return {
    ...order,
    items,
    invoice: invoiceRows[0] || null,
  };
};

// Creates a new order: validates stock, computes totals, creates the invoice,
// the order, and all order items as a single all-or-nothing transaction.
export const createOrder = async (data) => {
  const { items, mode_of_payment, status = 'Pending' } = data;
  // items = [{ product_id, quantity }, ...]

  if (!items || items.length === 0) {
    throw new Error('Order must include at least one item');
  }
  if (!mode_of_payment) {
    throw new Error('mode_of_payment is required');
  }

  // Use a dedicated connection so we can run a transaction
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    // Look up current price + stock for every product being ordered
    const productIds = items.map((i) => i.product_id);
    const [products] = await connection.query(
      'SELECT product_id, price, stock_quantity FROM products WHERE product_id IN (?)',
      [productIds]
    );

    if (products.length !== productIds.length) {
      throw new Error('One or more products do not exist');
    }

    const productMap = new Map(products.map((p) => [p.product_id, p]));

    // Validate quantities/stock and build line items + running total
    let totalAmount = 0;
    const lineItems = items.map((item) => {
      const product = productMap.get(item.product_id);

      if (!item.quantity || item.quantity <= 0) {
        throw new Error(`Invalid quantity for product ${item.product_id}`);
      }
      if (product.stock_quantity < item.quantity) {
        throw new Error(
          `Insufficient stock for product ${item.product_id} (have ${product.stock_quantity}, need ${item.quantity})`
        );
      }

      const subtotal = Number(product.price) * item.quantity;
      totalAmount += subtotal;

      return {
        product_id: item.product_id,
        quantity: item.quantity,
        unit_price: product.price,
        subtotal,
      };
    });

    // Invoice must exist first since sales_orders.invoice_id is a FK
    const invoiceId = generateInvoiceId();
    const issueDate = new Date();
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 30); // 30-day payment terms

    await connection.query(
      `INSERT INTO invoices (invoice_id, issue_date, due_date, amount, paid, mode_of_payment, status)
       VALUES (?, ?, ?, ?, 0.00, ?, 'Unpaid')`,
      [invoiceId, issueDate, dueDate, totalAmount, mode_of_payment]
    );

    // Create the order header, linked to the invoice we just made
    const [orderResult] = await connection.query(
      `INSERT INTO sales_orders (order_date, total_amount, status, mode_of_payment, invoice_id)
       VALUES (NOW(), ?, ?, ?, ?)`,
      [totalAmount, status, mode_of_payment, invoiceId]
    );
    const orderId = orderResult.insertId;

    // Insert each line item and deduct stock accordingly
    for (const line of lineItems) {
      await connection.query(
        `INSERT INTO sales_order_items (order_id, product_id, quantity, unit_price, subtotal)
         VALUES (?, ?, ?, ?, ?)`,
        [orderId, line.product_id, line.quantity, line.unit_price, line.subtotal]
      );

      await connection.query(
        `UPDATE products SET stock_quantity = stock_quantity - ? WHERE product_id = ?`,
        [line.quantity, line.product_id]
      );
    }

    // Everything succeeded — commit all inserts/updates together
    await connection.commit();
    return orderId;
  } catch (error) {
    // Something failed — undo all changes made in this transaction
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

// Updates just the status field of an existing order (e.g. Pending -> Completed)
export const updateOrderStatus = async (id, status) => {
  const [result] = await pool.query(
    'UPDATE sales_orders SET status = ? WHERE order_id = ?',
    [status, id]
  );
  return result;
};

// Deletes an order by ID
export const deleteOrder = async (id) => {
  const [result] = await pool.query(
    'DELETE FROM sales_orders WHERE order_id = ?',
    [id]
  );
  return result;
};