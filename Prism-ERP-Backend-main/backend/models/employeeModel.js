import pool from '../database/db.js';

export const getAllEmployees = async () => {
  const [rows] = await pool.query(`
    SELECT e.*, u.username, u.email, u.role
    FROM employees e
    LEFT JOIN users u ON e.user_id = u.user_id
  `);
  return rows;
};

export const getEmployeeById = async (id) => {
  const [rows] = await pool.query(`
    SELECT e.*, u.username, u.email, u.role
    FROM employees e
    LEFT JOIN users u ON e.user_id = u.user_id
    WHERE e.employee_id = ?
  `, [id]);
  return rows[0];
};

export const createEmployee = async (data) => {
  const { user_id, first_name, last_name, position, salary, status, hire_date } = data;
  const [result] = await pool.query(
    'INSERT INTO employees (user_id, first_name, last_name, position, salary, status, hire_date) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [user_id, first_name, last_name, position, salary, status, hire_date]
  );
  return result;
};

export const updateEmployee = async (id, data) => {
  const { first_name, last_name, position, salary, status } = data;
  const [result] = await pool.query(
    'UPDATE employees SET first_name = ?, last_name = ?, position = ?, salary = ?, status = ? WHERE employee_id = ?',
    [first_name, last_name, position, salary, status, id]
  );
  return result;
};

export const deleteEmployee = async (id) => {
  const [result] = await pool.query('DELETE FROM employees WHERE employee_id = ?', [id]);
  return result;
};