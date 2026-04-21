import express from 'express';
import { protect, adminOnly } from '../middleware/auth.js';
import PurchaseRequest from '../models/PurchaseRequest.js';
import User from '../models/User.js';
import Settings from '../models/Settings.js';
import PromoCode from '../models/PromoCode.js';
import Course from '../models/Course.js';

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

// --- PROMO CODE ROUTES ---

// @route   GET /api/purchase/promos (Admin Only)
router.get('/promos', protect, adminOnly, async (req, res) => {
  try {
    const promos = await PromoCode.find({}).sort({ createdAt: -1 });
    res.json(promos);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   POST /api/purchase/promos/generate (Admin Only)
router.post('/promos/generate', protect, adminOnly, async (req, res) => {
  const { courseId } = req.body;
  try {
    if (!courseId) return res.status(400).json({ message: 'Course ID is required' });
    
    // Generate a unique code
    const rawCode = "FREE-" + Math.random().toString(36).substring(2, 8).toUpperCase();
    
    const promo = await PromoCode.create({
      code: rawCode,
      courseId
    });
    
    res.status(201).json(promo);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   POST /api/purchase/redeem (Protected)
router.post('/redeem', protect, async (req, res) => {
  const { promoCode: code } = req.body;
  try {
    const promo = await PromoCode.findOne({ code });
    if (!promo) return res.status(404).json({ message: 'Invalid or Expired Promo Code' });
    if (promo.isUsed) return res.status(400).json({ message: 'This code has already been used.' });

    // Mark as used
    promo.isUsed = true;
    promo.usedBy = req.user._id;
    promo.usedAt = new Date();
    await promo.save();

    // Grant access to user
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    user.courseAccess = user.courseAccess || [];
    // Only add if not already present
    if (!user.courseAccess.some(a => a.courseId === promo.courseId)) {
      user.courseAccess.push({ courseId: promo.courseId, expiresAt: null }); // Lifetime access for promo
    }
    
    if (!user.purchasedCourses.includes(promo.courseId)) {
      user.purchasedCourses.push(promo.courseId);
    }

    await user.save();

    // Update course stats
    const course = await Course.findOne({ id: promo.courseId });
    if (course) {
       course.stats = course.stats || {};
       // Only add to enrollments if not already there
       if (!course.enrollments?.some(e => e.userId.toString() === user._id.toString())) {
         course.enrollments.push({
           userId: user._id,
           name: user.name,
           email: user.email
         });
         course.stats.uniqueStudentsCount = course.enrollments.length;
         await course.save();
       }
    }

    res.json({ 
      message: `Success! Code redeemed. Access granted to ${course?.title || promo.courseId}.`,
      user 
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
