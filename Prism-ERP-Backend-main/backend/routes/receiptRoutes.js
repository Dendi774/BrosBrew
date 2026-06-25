import { Router } from 'express';
import * as ReceiptController from '../controllers/receiptController.js';

const router = Router();

router.get('/', ReceiptController.getReceipts);
router.get('/:id', ReceiptController.getReceipt);
router.post('/', ReceiptController.createReceipt);

export default router;