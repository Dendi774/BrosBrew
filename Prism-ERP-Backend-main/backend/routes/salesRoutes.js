import { Router } from 'express';
import * as SalesController from '../controllers/salesOrderController.js';

const router = Router();

router.get('/', SalesController.getOrders);
router.get('/:id', SalesController.getOrder);
router.post('/', SalesController.createOrder);
router.patch('/:id/status', SalesController.updateOrderStatus);
router.delete('/:id', SalesController.deleteOrder);

export default router;