import { Router } from 'express';
import * as AttendanceController from '../controllers/attendanceController.js';

const router = Router();

router.get('/', AttendanceController.getAttendance);
router.get('/employee/:employee_id', AttendanceController.getEmployeeAttendance);
router.post('/time-in', AttendanceController.timeIn);
router.put('/time-out', AttendanceController.timeOut);
router.delete('/:id', AttendanceController.deleteAttendance);

export default router;