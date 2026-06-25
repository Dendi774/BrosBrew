import { Router } from 'express';
import * as LeaveController from '../controllers/leaveRequestController.js';

const router = Router();

router.get('/', LeaveController.getLeaveRequests);
router.get('/employee/:employee_id', LeaveController.getEmployeeLeaves);
router.post('/', LeaveController.createLeaveRequest);
router.patch('/:id/status', LeaveController.updateLeaveStatus);
router.delete('/:id', LeaveController.deleteLeaveRequest);

export default router;