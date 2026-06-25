import { Router } from 'express';
import * as SalesReturnController from '../controllers/salesReturnController.js';

const router = Router();

router.get('/', SalesReturnController.getReturns);
router.get('/:id', SalesReturnController.getReturn);
router.post('/', SalesReturnController.createReturn);
router.patch('/:id/status', SalesReturnController.updateReturnStatus);

export default router;