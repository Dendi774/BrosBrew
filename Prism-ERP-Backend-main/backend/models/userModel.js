import pool from '../database/db.js';

export const getAllUsers = async () => {
  const [rows] = await pool.query('SELECT * FROM users');
  return rows;
};

export const getUserById = async (id) => {
  const [rows] = await pool.query('SELECT * FROM users WHERE user_id = ?', [id]);
  return rows[0] || null;
};

// Used to resolve the session email → user_id when recording receipts
export const getUserByEmail = async (email) => {
  const [rows] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
  return rows[0] || null;
};

export const createUser = async (data) => {
  const { username, email, password, role, okta_id } = data;
  const [result] = await pool.query(
    'INSERT INTO users (username, email, password, role, okta_id) VALUES (?, ?, ?, ?, ?)',
    [username, email, password, role, okta_id]
  );
  return result;
};

export const updateUser = async (id, data) => {
  const { username, email, password, role } = data;

  // Only touch the password column if one was actually submitted —
  // otherwise editing a user from the UI would wipe their password.
  if (password) {
    const [result] = await pool.query(
      'UPDATE users SET username = ?, email = ?, password = ?, role = ? WHERE user_id = ?',
      [username, email, password, role, id]
    );
    return result;
  }

  const [result] = await pool.query(
    'UPDATE users SET username = ?, email = ?, role = ? WHERE user_id = ?',
    [username, email, role, id]
  );
  return result;
};

// Used by login: looks a user up by username OR email so the login form
// can accept either, then the controller checks the password match.
export const getUserByUsernameOrEmail = async (identifier) => {
  const [rows] = await pool.query(
    'SELECT * FROM users WHERE username = ? OR email = ?',
    [identifier, identifier]
  );
  return rows[0] || null;
};

export const deleteUser = async (id) => {
  const [result] = await pool.query('DELETE FROM users WHERE user_id = ?', [id]);
  return result;
};
