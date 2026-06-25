import * as UserModel from '../models/userModel.js';

export const getUsers = async (req, res) => {
  try {
    const data = await UserModel.getAllUsers();
    res.status(200).json(data);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const getUser = async (req, res) => {
  try {
    const data = await UserModel.getUserById(req.params.id);
    if (!data) return res.status(404).json({ message: 'User not found' });
    res.status(200).json(data);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const createUser = async (req, res) => {
  try {
    const result = await UserModel.createUser(req.body);
    res.status(201).json({ message: 'User created', id: result.insertId });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const updateUser = async (req, res) => {
  try {
    await UserModel.updateUser(req.params.id, req.body);
    res.status(200).json({ message: 'User updated' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const deleteUser = async (req, res) => {
  try {
    await UserModel.deleteUser(req.params.id);
    res.status(200).json({ message: 'User deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};