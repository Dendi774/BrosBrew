import * as PayrollModel from '../models/payrollModel.js';

export const getPayroll = async (req, res) => {
  try {
    const data = await PayrollModel.getAllPayroll();
    res.status(200).json(data);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const getEmployeePayroll = async (req, res) => {
  try {
    const data = await PayrollModel.getPayrollByEmployee(req.params.employee_id);
    res.status(200).json(data);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const createPayroll = async (req, res) => {
  try {
    const result = await PayrollModel.createPayroll(req.body);
    res.status(201).json({ message: 'Payroll created', id: result.insertId });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const updatePayroll = async (req, res) => {
  try {
    await PayrollModel.updatePayroll(req.params.id, req.body);
    res.status(200).json({ message: 'Payroll updated' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const deletePayroll = async (req, res) => {
  try {
    await PayrollModel.deletePayroll(req.params.id);
    res.status(200).json({ message: 'Payroll deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};