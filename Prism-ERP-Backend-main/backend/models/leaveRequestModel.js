import pool from '../database/db.js';

export const getAllLeaveRequests = async () => {
  const [rows] = await pool.query(`
    SELECT lr.*, e.first_name, e.last_name
    FROM leave_requests lr
    LEFT JOIN employees e ON lr.employee_id = e.employee_id
  `);
  return rows;
};

export const getLeaveByEmployee = async (employee_id) => {
  const [rows] = await pool.query(
    'SELECT * FROM leave_requests WHERE employee_id = ?',
    [employee_id]
  );
  return rows;
};

export const createLeaveRequest = async (data) => {
  const { employee_id, leave_type, reason, start_date, end_date } = data;
  const [result] = await pool.query(
    'INSERT INTO leave_requests (employee_id, leave_type, reason, start_date, end_date, status) VALUES (?, ?, ?, ?, ?, "pending")',
    [employee_id, leave_type, reason, start_date, end_date]
  );
  return result;
};

export const updateLeaveStatus = async (leave_id, status) => {
  const [result] = await pool.query(
    'UPDATE leave_requests SET status = ? WHERE leave_id = ?',
    [status, leave_id]
  );
  return result;
};

export const deleteLeaveRequest = async (id) => {
  const [result] = await pool.query('DELETE FROM leave_requests WHERE leave_id = ?', [id]);
  return result;
};