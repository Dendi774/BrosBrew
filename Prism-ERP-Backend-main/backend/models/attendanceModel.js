import pool from '../database/db.js';

// All records, newest first — manager/admin view across every employee.
export const getAllAttendance = async () => {
  const [rows] = await pool.query(`
    SELECT
      a.*,
      e.first_name,
      e.last_name,
      e.position,
      CASE
        WHEN a.time_out IS NULL THEN 'Time In'
        ELSE 'Completed'
      END AS status
    FROM attendance a
    LEFT JOIN employees e ON a.employee_id = e.employee_id
    ORDER BY a.time_in DESC
  `);
  return rows;
};

// Single employee's own history — used by the employee self-service views.
export const getAttendanceByEmployee = async (employee_id) => {
  const [rows] = await pool.query(`
    SELECT
      a.*,
      e.first_name,
      e.last_name,
      CASE
        WHEN a.time_out IS NULL THEN 'Time In'
        ELSE 'Completed'
      END AS status
    FROM attendance a
    LEFT JOIN employees e ON a.employee_id = e.employee_id
    WHERE a.employee_id = ?
    ORDER BY a.time_in DESC
  `, [employee_id]);
  return rows;
};

// The currently open (not yet timed-out) record for an employee, if any.
// Used both to block duplicate Time-Ins and to resolve Time-Out automatically.
export const getOpenAttendance = async (employee_id) => {
  const [rows] = await pool.query(
    `SELECT * FROM attendance
     WHERE employee_id = ? AND time_out IS NULL
     ORDER BY time_in DESC
     LIMIT 1`,
    [employee_id]
  );
  return rows[0] || null;
};

export const timeIn = async (employee_id) => {
  const [result] = await pool.query(
    'INSERT INTO attendance (employee_id, time_in) VALUES (?, NOW())',
    [employee_id]
  );
  return result;
};

// Closes the employee's own open record. Scoped by employee_id so an
// employee can never close someone else's attendance entry.
export const timeOut = async (attendance_id, employee_id) => {
  const [result] = await pool.query(`
    UPDATE attendance
    SET
      time_out = NOW(),
      hours_worked = ROUND(TIMESTAMPDIFF(MINUTE, time_in, NOW()) / 60, 2)
    WHERE attendance_id = ? AND employee_id = ? AND time_out IS NULL
  `, [attendance_id, employee_id]);
  return result;
};

export const deleteAttendance = async (id) => {
  const [result] = await pool.query('DELETE FROM attendance WHERE attendance_id = ?', [id]);
  return result;
};
