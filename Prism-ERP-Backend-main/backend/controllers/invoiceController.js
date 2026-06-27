import * as InvoiceModel from '../models/invoiceModel.js';

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

// GET /api/v1/invoices/unpaid — for the receipt modal dropdown
export const getUnpaidInvoices = async (req, res) => {
  try {
    res.json(await InvoiceModel.getUnpaidInvoices());
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getInvoice = async (req, res) => {
  try {
    const invoice = await InvoiceModel.getInvoiceById(req.params.invoiceId);
    if (!invoice) return res.status(404).json({ message: 'Invoice not found' });
    res.json(invoice);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Invoices are system-generated from orders — no manual create endpoint exposed.

export const updateInvoice = async (req, res) => {
  try {
    await InvoiceModel.updateInvoice(req.params.invoiceId, req.body);
    res.json({ message: 'Invoice updated' });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const deleteInvoice = async (req, res) => {
  try {
    await InvoiceModel.deleteInvoice(req.params.invoiceId);
    res.json({ message: 'Invoice deleted' });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};
