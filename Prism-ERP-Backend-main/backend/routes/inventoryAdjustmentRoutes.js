import { Router } from 'express';
import * as inventoryAdjustmentController from '../controllers/inventoryAdjustmentController.js';

const router = Router();

router.get('/', inventoryAdjustmentController.getAdjustments);
router.post('/', inventoryAdjustmentController.addAdjustment);

export default router;
