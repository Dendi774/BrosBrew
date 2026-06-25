import * as EmployeeModel from '../models/employeeModel.js';

export const getEmployees = async (req, res) => {
  try {
    const data = await EmployeeModel.getAllEmployees();
    res.status(200).json(data);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const getEmployee = async (req, res) => {
  try {
    const data = await EmployeeModel.getEmployeeById(req.params.id);
    if (!data) return res.status(404).json({ message: 'Employee not found' });
    res.status(200).json(data);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const createEmployee = async (req, res) => {
  try {
    const result = await EmployeeModel.createEmployee(req.body);
    res.status(201).json({ message: 'Employee created', id: result.insertId });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const updateEmployee = async (req, res) => {
  try {
    await EmployeeModel.updateEmployee(req.params.id, req.body);
    res.status(200).json({ message: 'Employee updated' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const deleteEmployee = async (req, res) => {
  try {
    await EmployeeModel.deleteEmployee(req.params.id);
    res.status(200).json({ message: 'Employee deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};