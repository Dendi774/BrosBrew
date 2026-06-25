import pool from '../database/db.js';

export const getAllAttendance = async () => {
  const [rows] = await pool.query(`
    SELECT a.*, e.first_name, e.last_name
    FROM attendance a
    LEFT JOIN employees e ON a.employee_id = e.employee_id
  `);
  return rows;
};

export const getAttendanceByEmployee = async (employee_id) => {
  const [rows] = await pool.query(
    'SELECT * FROM attendance WHERE employee_id = ?',
    [employee_id]
  );
  return rows;
};

export const timeIn = async (employee_id) => {
  const [result] = await pool.query(
    'INSERT INTO attendance (employee_id, time_in) VALUES (?, NOW())',
    [employee_id]
  );
  return result;
};

export const timeOut = async (attendance_id, employee_id) => {
  const [result] = await pool.query(`
    UPDATE attendance
    SET
      time_out = NOW(),
      hours_worked = ROUND(TIMESTAMPDIFF(MINUTE, time_in, NOW()) / 60, 2)
    WHERE attendance_id = ? AND employee_id = ?
  `, [attendance_id, employee_id]);
  return result;
};

export const deleteAttendance = async (id) => {
  const [result] = await pool.query('DELETE FROM attendance WHERE attendance_id = ?', [id]);
  return result;
};