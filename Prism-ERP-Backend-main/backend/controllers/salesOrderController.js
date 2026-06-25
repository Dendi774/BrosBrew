import * as SalesOrderModel from '../models/salesOrderModel.js';

// GET /api/sales-orders — list all orders
export const getOrders = async (req, res) => {
  try {
    const orders = await SalesOrderModel.getAllOrders();
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET /api/sales-orders/:id — get one order with full detail (items + invoice)
export const getOrder = async (req, res) => {
  try {
    const order = await SalesOrderModel.getOrderById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found' });
    res.json(order);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// POST /api/sales-orders — create a new order (and its invoice/items)
export const createOrder = async (req, res) => {
  try {
    const orderId = await SalesOrderModel.createOrder(req.body);
    // Fetch the full order back so the response can be used directly as a receipt
    const fullOrder = await SalesOrderModel.getOrderById(orderId);
    res.status(201).json(fullOrder);
  } catch (error) {
    // 400, since failures here are almost always bad input (stock, missing fields, etc.)
    res.status(400).json({ message: error.message });
  }
};

// PATCH /api/sales-orders/:id/status — update an order's status only
export const updateOrderStatus = async (req, res) => {
  try {
    await SalesOrderModel.updateOrderStatus(req.params.id, req.body.status);
    res.json({ message: 'Order status updated' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// DELETE /api/sales-orders/:id — remove an order
export const deleteOrder = async (req, res) => {
  try {
    await SalesOrderModel.deleteOrder(req.params.id);
    res.json({ message: 'Order deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};