import pool from '../database/db.js';

export const getAllUsers = async () => {
  const [rows] = await pool.query('SELECT * FROM users');
  return rows;
};

export const getUserById = async (id) => {
  const [rows] = await pool.query('SELECT * FROM users WHERE user_id = ?', [id]);
  return rows[0];
};

export const createUser = async (data) => {
  const { username, email, role, okta_id } = data;
  const [result] = await pool.query(
    'INSERT INTO users (username, email, role, okta_id) VALUES (?, ?, ?, ?)',
    [username, email, role, okta_id]
  );
  return result;
};

export const updateUser = async (id, data) => {
  const { username, email, role } = data;
  const [result] = await pool.query(
    'UPDATE users SET username = ?, email = ?, role = ? WHERE user_id = ?',
    [username, email, role, id]
  );
  return result;
};

export const deleteUser = async (id) => {
  const [result] = await pool.query('DELETE FROM users WHERE user_id = ?', [id]);
  return result;
};