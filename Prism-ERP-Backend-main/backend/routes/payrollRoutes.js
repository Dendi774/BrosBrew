import { Router } from 'express';
import * as PayrollController from '../controllers/payrollController.js';

const router = Router();

router.get('/', PayrollController.getPayroll);
router.get('/employee/:employee_id', PayrollController.getEmployeePayroll);
router.post('/', PayrollController.createPayroll);
router.put('/:id', PayrollController.updatePayroll);
router.delete('/:id', PayrollController.deletePayroll);

export default router;