import * as AttendanceModel from '../models/attendanceModel.js';

// Manager/admin only — every employee's attendance.
export const getAttendance = async (req, res) => {
  try {
    const data = await AttendanceModel.getAllAttendance();
    res.status(200).json(data);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Self (or manager/admin) — one employee's attendance history.
// Access already checked by the requireSelfOrRole route middleware.
export const getEmployeeAttendance = async (req, res) => {
  try {
    const data = await AttendanceModel.getAttendanceByEmployee(req.params.employee_id);
    res.status(200).json(data);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Time In — always uses the authenticated caller's own employee_id,
// never a client-supplied one, and rejects a second open Time In.
export const timeIn = async (req, res) => {
  try {
    const { employeeId } = req.identity;

    if (!employeeId) {
      return res.status(403).json({ message: 'Only employee accounts can time in' });
    }

    const open = await AttendanceModel.getOpenAttendance(employeeId);
    if (open) {
      return res.status(409).json({
        message: 'You already have an active Time In. Please Time Out first.',
        attendance_id: open.attendance_id,
      });
    }

    const result = await AttendanceModel.timeIn(employeeId);
    res.status(201).json({ message: 'Time in recorded', id: result.insertId });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Time Out — closes the caller's own currently-open record. The client
// does not need to (and cannot) supply someone else's attendance_id.
export const timeOut = async (req, res) => {
  try {
    const { employeeId } = req.identity;

    if (!employeeId) {
      return res.status(403).json({ message: 'Only employee accounts can time out' });
    }

    const open = await AttendanceModel.getOpenAttendance(employeeId);
    if (!open) {
      return res.status(409).json({ message: 'No active Time In found. Please Time In first.' });
    }

    await AttendanceModel.timeOut(open.attendance_id, employeeId);
    res.status(200).json({ message: 'Time out recorded' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Convenience endpoint for the UI to know whether the caller is
// currently timed in, timed out, or has no record yet today.
export const getMyStatus = async (req, res) => {
  try {
    const { employeeId } = req.identity;
    if (!employeeId) {
      return res.status(403).json({ message: 'Only employee accounts have attendance status' });
    }
    const open = await AttendanceModel.getOpenAttendance(employeeId);
    res.status(200).json({ open });
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
