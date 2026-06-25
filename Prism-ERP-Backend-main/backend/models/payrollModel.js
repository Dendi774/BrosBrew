import pool from '../database/db.js';

export const getAllPayroll = async () => {
  const [rows] = await pool.query(`
    SELECT p.*, e.first_name, e.last_name, e.position
    FROM payroll p
    LEFT JOIN employees e ON p.employee_id = e.employee_id
  `);
  return rows;
};

export const getPayrollByEmployee = async (employee_id) => {
  const [rows] = await pool.query(
    'SELECT * FROM payroll WHERE employee_id = ?',
    [employee_id]
  );
  return rows;
};

export const createPayroll = async (data) => {
  const { employee_id, pay_period_start, pay_period_end, basic_salary, overtime_pay, deductions, benefits } = data;
  const net_pay = basic_salary + overtime_pay + benefits - deductions;
  const [result] = await pool.query(
    'INSERT INTO payroll (employee_id, pay_period_start, pay_period_end, basic_salary, overtime_pay, deductions, benefits, net_pay) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [employee_id, pay_period_start, pay_period_end, basic_salary, overtime_pay, deductions, benefits, net_pay]
  );
  return result;
};

export const updatePayroll = async (id, data) => {
  const { basic_salary, overtime_pay, deductions, benefits } = data;
  const net_pay = basic_salary + overtime_pay + benefits - deductions;
  const [result] = await pool.query(
    'UPDATE payroll SET basic_salary = ?, overtime_pay = ?, deductions = ?, benefits = ?, net_pay = ? WHERE payroll_id = ?',
    [basic_salary, overtime_pay, deductions, benefits, net_pay, id]
  );
  return result;
};

export const deletePayroll = async (id) => {
  const [result] = await pool.query('DELETE FROM payroll WHERE payroll_id = ?', [id]);
  return result;
};