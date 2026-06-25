import * as InvoiceModel from '../models/invoiceModel.js';

// GET /api/invoices — list all, or search if a ?search= query param is given
export const getInvoices = async (req, res) => {
  try {
    const { search } = req.query;
    const invoices = search
      ? await InvoiceModel.searchInvoices(search)
      : await InvoiceModel.getAllInvoices();
    res.json(invoices);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET /api/invoices/:invoiceId — get one invoice
export const getInvoice = async (req, res) => {
  try {
    const invoice = await InvoiceModel.getInvoiceById(req.params.invoiceId);
    if (!invoice) return res.status(404).json({ message: 'Invoice not found' });
    res.json(invoice);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// POST /api/invoices — create a standalone invoice
export const createInvoice = async (req, res) => {
  try {
    const invoiceId = await InvoiceModel.createInvoice(req.body);
    const invoice = await InvoiceModel.getInvoiceById(invoiceId);
    res.status(201).json(invoice);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// PATCH /api/invoices/:invoiceId — update editable invoice fields
export const updateInvoice = async (req, res) => {
  try {
    await InvoiceModel.updateInvoice(req.params.invoiceId, req.body);
    res.json({ message: 'Invoice updated' });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// DELETE /api/invoices/:invoiceId — delete an invoice
export const deleteInvoice = async (req, res) => {
  try {
    await InvoiceModel.deleteInvoice(req.params.invoiceId);
    res.json({ message: 'Invoice deleted' });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};