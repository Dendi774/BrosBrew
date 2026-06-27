import { Router } from 'express';
import * as InvoiceController from '../controllers/invoiceController.js';

const router = Router();

router.get('/',                       InvoiceController.getInvoices);       // supports ?search=
router.get('/unpaid',                 InvoiceController.getUnpaidInvoices); // for receipt modal
router.get('/:invoiceId',             InvoiceController.getInvoice);
// NOTE: No POST / — invoices are created automatically by the sales order flow.
router.patch('/:invoiceId',           InvoiceController.updateInvoice);
router.delete('/:invoiceId',          InvoiceController.deleteInvoice);

export default router;
