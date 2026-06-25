import { Router } from 'express';
import * as InvoiceController from '../controllers/invoiceController.js';

const router = Router();

router.get('/', InvoiceController.getInvoices);          // supports ?search=
router.get('/:invoiceId', InvoiceController.getInvoice);
router.post('/', InvoiceController.createInvoice);
router.patch('/:invoiceId', InvoiceController.updateInvoice);
router.delete('/:invoiceId', InvoiceController.deleteInvoice);

export default router;