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
    const request = await PurchaseRequest.create({
      userId: req.user._id,
      courseId
    });
    res.status(201).json(request);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   GET /api/purchase/all (Admin Only)
router.get('/all', protect, adminOnly, async (req, res) => {
  try {
    const requests = await PurchaseRequest.find({}).populate('userId', 'name email');
    res.json(requests);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   GET /api/purchase/my
router.get('/my', protect, async (req, res) => {
  try {
    const requests = await PurchaseRequest.find({ userId: req.user._id });
    res.json(requests);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   PUT /api/purchase/approve/:id (Admin Only)
router.put('/approve/:id', protect, adminOnly, async (req, res) => {
  try {
    const request = await PurchaseRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ message: 'Request not found' });

    request.status = 'approved';
    await request.save();

    // Add course to user's purchased list
    const user = await User.findById(request.userId);
    if (!user.purchasedCourses.includes(request.courseId)) {
      user.purchasedCourses.push(request.courseId);
      await user.save();
    }

    res.json({ message: 'Course approved and unlocked!' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
