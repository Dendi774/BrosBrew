import pool from '../database/db.js';

// NOTE: products = catalog only. Stock levels / reorder thresholds live on
// `ingredients` (see ingredientModel.js), not here — products are made-to-order.

export const getAllProducts = async () => {
  const [rows] = await pool.query('SELECT * FROM products');
  return rows;
};

export const getProductById = async (id) => {
  const [rows] = await pool.query('SELECT * FROM products WHERE product_id = ?', [id]);
  return rows[0];
};

export const createProduct = async (data) => {
  const { product_name, category, price, cost, unit, description, image_url, status } = data;
  const [result] = await pool.query(
    `INSERT INTO products
      (product_name, category, price, cost, unit, description, image_url, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      product_name,
      category,
      price,
      cost,
      unit ?? 'N/A',
      description ?? null,
      image_url ?? null,
      status ?? 'ACTIVE',
    ]
  );
  // sku is auto-populated by the `generate_product_sku` AFTER INSERT trigger
  return result;
};

export const updateProduct = async (id, data) => {
  const { product_name, category, price, cost, unit, description, image_url, status } = data;
  const [result] = await pool.query(
    `UPDATE products
        SET product_name = ?, category = ?, price = ?, cost = ?,
            unit = ?, description = ?, image_url = ?, status = ?
      WHERE product_id = ?`,
    [product_name, category, price, cost, unit, description, image_url, status, id]
  );
  return result;
};

export const deleteProduct = async (id) => {
  const [result] = await pool.query('DELETE FROM products WHERE product_id = ?', [id]);
  return result;
};
