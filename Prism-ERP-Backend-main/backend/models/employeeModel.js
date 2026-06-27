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

// Creates a new employee AND a matching user account in one transaction —
// every employee needs a login, so the user row is generated here rather
// than picked from an existing list. username/email come from the form;
// role is hardcoded to 'employee' (admins/managers are created separately).
export const createEmployee = async (data) => {
  const { first_name, last_name, position, salary, status, hire_date, username, email, password } = data;

  if (!username || !email || !password) {
    throw new Error('username, email, and password are required to create the linked user account');
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [userResult] = await connection.query(
      "INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, 'employee')",
      [username, email, password]
    );
    const user_id = userResult.insertId;

    const [empResult] = await connection.query(
      'INSERT INTO employees (user_id, first_name, last_name, position, salary, status, hire_date) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [user_id, first_name, last_name, position, salary, status, hire_date]
    );

    await connection.commit();
    return { insertId: empResult.insertId, user_id };
  } catch (err) {
    await connection.rollback();
    // MySQL's duplicate-email error is cryptic by default — make it readable
    if (err.code === 'ER_DUP_ENTRY') {
      throw new Error('A user with that email already exists');
    }
    throw err;
  } finally {
    connection.release();
  }
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