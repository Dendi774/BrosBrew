import * as inventoryAdjustmentModel from '../models/inventoryAdjustmentModel.js';

export const getAdjustments = async (req, res) => {
  try {
    const data = await inventoryAdjustmentModel.getAllAdjustments();
    res.status(200).json(data);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const addAdjustment = async (req, res) => {
  try {
    const transactionId = await inventoryAdjustmentModel.addAdjustment(req.body);
    res.status(201).json({
      message: 'Inventory adjustment recorded',
      transaction_id: transactionId,
    });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};
