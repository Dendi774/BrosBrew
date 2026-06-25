import * as ReceiptModel from '../models/receiptModel.js';

export const getReceipts = async (req, res) => {
  try {
    const receipts = await ReceiptModel.getAllReceipts();
    res.json(receipts);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getReceipt = async (req, res) => {
  try {
    const receipt = await ReceiptModel.getReceiptById(req.params.id);
    if (!receipt) return res.status(404).json({ message: 'Receipt not found' });
    res.json(receipt);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const createReceipt = async (req, res) => {
  try {
    const receiptNumber = await ReceiptModel.createReceipt(req.body);
    res.status(201).json({ message: 'Receipt created', receipt_number: receiptNumber });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};