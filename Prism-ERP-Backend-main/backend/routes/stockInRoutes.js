


import { Router } from 'express';
import * as stockInController from '../controllers/stockInController.js';

const router = Router();

router.get('/', stockInController.getStockIn);
router.post('/', stockInController.addStockIn);

export default router;