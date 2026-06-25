import pool from '../database/db.js';

export const getAllProducts = async () => {
  const [rows] = await pool.query('SELECT * FROM products');
  return rows;
};

export const getProductById = async (id) => {
  const [rows] = await pool.query('SELECT * FROM products WHERE product_id = ?', [id]);
  return rows[0];
};

export const createProduct = async (data) => {
  const { product_name, sku, category, price, stock_quantity, reorder_level } = data;
  const [result] = await pool.query(
    'INSERT INTO products (product_name, sku, category, price, stock_quantity, reorder_level) VALUES (?, ?, ?, ?, ?, ?)',
    [product_name, sku, category, price, stock_quantity, reorder_level]
  );
  return result;
};

export const updateProduct = async (id, data) => {
  const { product_name, sku, category, price, stock_quantity, reorder_level } = data;
  const [result] = await pool.query(
    'UPDATE products SET product_name = ?, sku = ?, category = ?, price = ?, stock_quantity = ?, reorder_level = ? WHERE product_id = ?',
    [product_name, sku, category, price, stock_quantity, reorder_level, id]
  );
  return result;
};

export const updateStock = async (id, quantity) => {
  const [result] = await pool.query(
    'UPDATE products SET stock_quantity = stock_quantity + ? WHERE product_id = ?',
    [quantity, id]
  );
  return result;
};

export const deleteProduct = async (id) => {
  const [result] = await pool.query('DELETE FROM products WHERE product_id = ?', [id]);
  return result;
};