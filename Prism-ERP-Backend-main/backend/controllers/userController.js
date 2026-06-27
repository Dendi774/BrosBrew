import * as UserModel from '../models/userModel.js';

export const getUsers = async (req, res) => {
  try {
    res.status(200).json(await UserModel.getAllUsers());
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

// GET /api/v1/users/by-email?email=manager@brosbrew.com
// Used by the frontend to resolve the logged-in session email → user_id
export const getUserByEmail = async (req, res) => {
  try {
    const { email } = req.query;
    if (!email) return res.status(400).json({ message: 'email query param is required' });
    const data = await UserModel.getUserByEmail(email);
    if (!data) return res.status(404).json({ message: 'User not found' });
    res.status(200).json(data);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/v1/users/login
// Checks the submitted username/email + password against the users table.
export const login = async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ message: 'Username and password are required' });
    }

    const user = await UserModel.getUserByUsernameOrEmail(username.trim());

    if (!user || user.password !== password) {
      return res.status(401).json({ message: 'Invalid username or password' });
    }

    // Never send the password back to the client
    const { password: _pw, ...safeUser } = user;
    res.status(200).json(safeUser);
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
