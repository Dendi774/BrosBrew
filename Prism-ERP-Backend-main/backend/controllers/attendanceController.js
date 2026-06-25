import * as AttendanceModel from '../models/attendanceModel.js';

export const getAttendance = async (req, res) => {
  try {
    const data = await AttendanceModel.getAllAttendance();
    res.status(200).json(data);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const getEmployeeAttendance = async (req, res) => {
  try {
    const data = await AttendanceModel.getAttendanceByEmployee(req.params.employee_id);
    res.status(200).json(data);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const timeIn = async (req, res) => {
  try {
    const result = await AttendanceModel.timeIn(req.body.employee_id);
    res.status(201).json({ message: 'Time in recorded', id: result.insertId });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const timeOut = async (req, res) => {
  try {
    const { attendance_id, employee_id } = req.body;
    await AttendanceModel.timeOut(attendance_id, employee_id);
    res.status(200).json({ message: 'Time out recorded' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const deleteAttendance = async (req, res) => {
  try {
    await AttendanceModel.deleteAttendance(req.params.id);
    res.status(200).json({ message: 'Attendance record deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};