import * as LeaveModel from '../models/leaveRequestModel.js';

export const getLeaveRequests = async (req, res) => {
  try {
    const data = await LeaveModel.getAllLeaveRequests();
    res.status(200).json(data);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const getEmployeeLeaves = async (req, res) => {
  try {
    const data = await LeaveModel.getLeaveByEmployee(req.params.employee_id);
    res.status(200).json(data);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const createLeaveRequest = async (req, res) => {
  try {
    const result = await LeaveModel.createLeaveRequest(req.body);
    res.status(201).json({ message: 'Leave request submitted', id: result.insertId });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const updateLeaveStatus = async (req, res) => {
  try {
    await LeaveModel.updateLeaveStatus(req.params.id, req.body.status);
    res.status(200).json({ message: 'Leave status updated' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const deleteLeaveRequest = async (req, res) => {
  try {
    await LeaveModel.deleteLeaveRequest(req.params.id);
    res.status(200).json({ message: 'Leave request deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};