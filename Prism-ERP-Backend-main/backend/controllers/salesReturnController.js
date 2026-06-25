import * as SalesReturnModel from '../models/salesReturnModel.js';

export const getReturns = async (req, res) => {
  try {
    const returns = await SalesReturnModel.getAllReturns();
    res.json(returns);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getReturn = async (req, res) => {
  try {
    const ret = await SalesReturnModel.getReturnById(req.params.id);
    if (!ret) return res.status(404).json({ message: 'Return not found' });
    res.json(ret);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const createReturn = async (req, res) => {
  try {
    const returnId = await SalesReturnModel.createReturn(req.body);
    const fullReturn = await SalesReturnModel.getReturnById(returnId);
    res.status(201).json(fullReturn);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const updateReturnStatus = async (req, res) => {
  try {
    await SalesReturnModel.updateReturnStatus(req.params.id, req.body.status);
    res.json({ message: 'Return status updated' });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};