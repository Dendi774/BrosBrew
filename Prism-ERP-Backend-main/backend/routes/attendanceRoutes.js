import { Router } from 'express';
import * as AttendanceController from '../controllers/attendanceController.js';
import { attachIdentity, requireAuth, requireRole, requireSelfOrRole } from '../middleware/auth.js';

const router = Router();

// Every attendance route requires the caller to be identified first.
router.use(attachIdentity, requireAuth);

// Manager/admin only — full attendance log across all employees.
router.get('/', requireRole('manager', 'admin'), AttendanceController.getAttendance);

// Employees may only fetch their own history; managers/admins may fetch anyone's.
router.get(
  '/employee/:employee_id',
  requireSelfOrRole('employee_id', 'manager', 'admin'),
  AttendanceController.getEmployeeAttendance
);

// Employee self-service: always acts on the caller's own employee_id.
router.get('/me/status', AttendanceController.getMyStatus);
router.post('/time-in', AttendanceController.timeIn);
router.put('/time-out', AttendanceController.timeOut);

// Manager/admin only — record correction/removal.
router.delete('/:id', requireRole('manager', 'admin'), AttendanceController.deleteAttendance);

export default router;
