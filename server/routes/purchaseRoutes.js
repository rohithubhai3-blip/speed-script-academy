import express from 'express';
import { protect, adminOnly } from '../middleware/auth.js';
import PurchaseRequest from '../models/PurchaseRequest.js';
import User from '../models/User.js';
import Settings from '../models/Settings.js';

const router = express.Router();

// @route   GET /api/purchase/settings
router.get('/settings', async (req, res) => {
  try {
    const settings = await Settings.findOne({ key: 'global' });
    res.json(settings || { upiId: '', whatsappNumber: '', qrCodeUrl: '' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   POST /api/purchase/settings (Admin Only)
router.post('/settings', protect, adminOnly, async (req, res) => {
  try {
    const settings = await Settings.findOneAndUpdate(
      { key: 'global' },
      req.body,
      { upsert: true, new: true }
    );
    res.json(settings);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   POST /api/purchase/submit
router.post('/submit', protect, async (req, res) => {
  try {
    const { courseId } = req.body;
    // Check if a pending request already exists
    const existing = await PurchaseRequest.findOne({ 
      userId: req.user._id, 
      courseId, 
      status: 'pending' 
    });
    if (existing) {
      return res.status(400).json({ message: 'You already have a pending request for this course.' });
    }
    const request = await PurchaseRequest.create({
      userId: req.user._id,
      courseId
    });
    res.status(201).json(request);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   GET /api/purchase/all (Admin Only) - Only PENDING requests
router.get('/all', protect, adminOnly, async (req, res) => {
  try {
    const requests = await PurchaseRequest.find({ status: 'pending' })
      .populate('userId', 'name email')
      .sort({ createdAt: -1 });
    res.json(requests);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   GET /api/purchase/my
router.get('/my', protect, async (req, res) => {
  try {
    const requests = await PurchaseRequest.find({ userId: req.user._id })
      .sort({ createdAt: -1 });
    res.json(requests);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   PUT /api/purchase/approve/:id (Admin Only)
router.put('/approve/:id', protect, adminOnly, async (req, res) => {
  try {
    const { durationDays } = req.body; // 0 = lifetime
    
    const request = await PurchaseRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ message: 'Request not found' });

    // Calculate expiry date
    let expiresAt = null;
    if (durationDays && durationDays > 0) {
      expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + parseInt(durationDays));
    }

    request.status = 'approved';
    request.durationDays = durationDays || 0;
    request.expiresAt = expiresAt;
    await request.save();

    // Add/Update course access in user's courseAccess array
    const user = await User.findById(request.userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    // Remove existing access for this course if any, then add new
    user.courseAccess = user.courseAccess || [];
    user.courseAccess = user.courseAccess.filter(a => a.courseId !== request.courseId);
    user.courseAccess.push({ courseId: request.courseId, expiresAt });
    
    // Also keep legacy purchasedCourses in sync
    if (!user.purchasedCourses.includes(request.courseId)) {
      user.purchasedCourses.push(request.courseId);
    }

    await user.save();

    res.json({ 
      message: `Course approved! Access granted ${expiresAt ? `until ${expiresAt.toDateString()}` : 'for lifetime'}.`,
      expiresAt 
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
