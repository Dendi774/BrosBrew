import * as ProductModel from '../models/productModel.js';

export const getProducts = async (req, res) => {
  try {
    const data = await ProductModel.getAllProducts();
    res.status(200).json(data);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const getProduct = async (req, res) => {
  try {
    const data = await ProductModel.getProductById(req.params.id);
    if (!data) return res.status(404).json({ message: 'Product not found' });
    res.status(200).json(data);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const createProduct = async (req, res) => {
  try {
    const result = await ProductModel.createProduct(req.body);
    res.status(201).json({ message: 'Product created', id: result.insertId });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const updateProduct = async (req, res) => {
  try {
    await ProductModel.updateProduct(req.params.id, req.body);
    res.status(200).json({ message: 'Product updated' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const updateStock = async (req, res) => {
  try {
    await ProductModel.updateStock(req.params.id, req.body.quantity);
    res.status(200).json({ message: 'Stock updated' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const deleteProduct = async (req, res) => {
  try {
    await ProductModel.deleteProduct(req.params.id);
    res.status(200).json({ message: 'Product deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};