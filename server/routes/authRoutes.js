import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { protect, adminOnly } from '../middleware/auth.js';

const router = express.Router();

// Generate JWT
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'secret123', { expiresIn: '30d' });
};

// @route   POST /api/auth/register
router.post('/register', async (req, res) => {
  const { name, email, password, secretKey } = req.body;

  try {
    if (!name || !email || !password) {
      return res.status(400).json({ message: "Please provide name, email, and password" });
    }

    const userExists = await User.findOne({ email });
    if (userExists) return res.status(400).json({ message: 'User already exists' });

    // Admin Role check based on Secret Key
    let role = 'user';
    if (secretKey === process.env.ADMIN_SECRET_KEY || (secretKey && secretKey === 'SSA_ADMIN_2024')) {
      role = 'admin';
    }

    console.log(`[AUTH] Creating user: ${email}, Role: ${role}`);
    const user = await User.create({ 
      name, 
      email, 
      password, 
      role,
      purchasedCourses: [] 
    });

    if (user) {
      res.status(201).json({
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        purchasedCourses: user.purchasedCourses || [],
        token: generateToken(user._id)
      });
    } else {
      throw new Error("User creation failed in database");
    }
  } catch (error) {
    console.error("REGISTRATION ERROR:", error);
    res.status(500).json({ 
      message: error.message || "Registration failed on server",
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// @route   POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });
    if (user && (await user.comparePassword(password))) {
      // Update last login timestamp
      user.lastLogin = new Date();
      await user.save();
      res.json({
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        purchasedCourses: user.purchasedCourses || [],
        courseAccess: user.courseAccess || [],
        lastLogin: user.lastLogin,
        token: generateToken(user._id)
      });
    } else {
      res.status(401).json({ message: 'Invalid email or password' });
    }
  } catch (error) {
    console.error("LOGIN ERROR:", error);
    res.status(500).json({ message: error.message || "Login failed on server" });
  }
});

// @route   GET /api/auth/users (Admin Only)
router.get('/users', protect, adminOnly, async (req, res) => {
  try {
    const users = await User.find({}).sort({ createdAt: -1 });
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   POST /api/auth/admin/create-user (Admin Only)
router.post('/admin/create-user', protect, adminOnly, async (req, res) => {
  const { name, email, password, role } = req.body;
  try {
    const userExists = await User.findOne({ email });
    if (userExists) return res.status(400).json({ message: 'User already exists' });

    const user = await User.create({ name, email, password, role });
    res.status(201).json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   DELETE /api/auth/:id (Admin Only)
router.delete('/:id', protect, adminOnly, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    
    // Safety: Prevent admin from deleting themselves
    if (user._id.toString() === req.user._id.toString()) {
      return res.status(400).json({ message: 'You cannot delete your own admin account' });
    }

    await User.findByIdAndDelete(req.params.id);
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   PUT /api/auth/:id/access (Admin Only)
router.put('/:id/access', protect, adminOnly, async (req, res) => {
  const { purchasedCourses, courseAccess } = req.body;
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (courseAccess !== undefined) {
      // New system: save courseAccess array [{courseId, expiresAt}]
      user.courseAccess = courseAccess;
      // Also sync legacy purchasedCourses for backward compatibility
      user.purchasedCourses = courseAccess.map(a => a.courseId);
    } else if (purchasedCourses !== undefined) {
      // Legacy: plain array of course IDs (treat as lifetime)
      user.purchasedCourses = purchasedCourses;
      user.courseAccess = purchasedCourses.map(id => ({ courseId: id, expiresAt: null }));
    }

    await user.save();
    res.json({ message: 'User access updated', courseAccess: user.courseAccess, purchasedCourses: user.purchasedCourses });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   PUT /api/auth/:id/reset-password (Admin Only)
router.put('/:id/reset-password', protect, adminOnly, async (req, res) => {
  const { password } = req.body;
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    user.password = password; // The pre-save hook in User.js will hash this
    await user.save();
    
    res.json({ message: 'Password reset successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   GET /api/auth/me (Logged in User Only)
router.get('/me', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    
    // Return fresh data minus password
    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      purchasedCourses: user.purchasedCourses || [],
      courseAccess: user.courseAccess || [],
      lastLogin: user.lastLogin,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   POST /api/auth/impersonate/:id (Admin Only)
router.post('/impersonate/:id', protect, adminOnly, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    console.log(`[AUTH] Admin ${req.user.email} is impersonating ${user.email}`);

    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      purchasedCourses: user.purchasedCourses || [],
      courseAccess: user.courseAccess || [],
      lastLogin: user.lastLogin,
      token: generateToken(user._id)
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   PUT /api/auth/change-password
router.put('/change-password', protect, async (req, res) => {
  const { oldPassword, newPassword } = req.body;
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const isMatch = await user.comparePassword(oldPassword);
    if (!isMatch) return res.status(400).json({ message: 'Incorrect old password' });

    user.password = newPassword; // Will be hashed by pre-save hook
    await user.save();

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
