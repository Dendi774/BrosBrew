import * as SalesOrderModel from '../models/salesOrderModel.js';

export const getOrders = async (req, res) => {
  try {
    res.json(await SalesOrderModel.getAllOrders());
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getOrder = async (req, res) => {
  try {
    const order = await SalesOrderModel.getOrderById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found' });
    res.json(order);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const createOrder = async (req, res) => {
  try {
    const orderId  = await SalesOrderModel.createOrder(req.body);
    const fullOrder = await SalesOrderModel.getOrderById(orderId);
    res.status(201).json(fullOrder);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// PATCH /api/v1/orders/:id/status  — generic status change (used internally + for Cancelled)
export const updateOrderStatus = async (req, res) => {
  try {
    const result = await SalesOrderModel.updateOrderStatus(req.params.id, req.body.status);
    res.json({ message: 'Order status updated', ...result });
  } catch (error) {
    const code = error.message.includes('Cannot move') ? 400 : 500;
    res.status(code).json({ message: error.message });
  }
};

// PATCH /api/v1/orders/:id/complete  — barista marks a Preparing order as done
export const completeOrder = async (req, res) => {
  try {
    const result = await SalesOrderModel.completeOrder(req.params.id);
    res.json({ message: 'Order marked as Completed', ...result });
  } catch (error) {
    const code = error.message.includes('Cannot move') || error.message.includes('not found') ? 400 : 500;
    res.status(code).json({ message: error.message });
  }
};

export const deleteOrder = async (req, res) => {
  try {
    await SalesOrderModel.deleteOrder(req.params.id);
    res.json({ message: 'Order deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
