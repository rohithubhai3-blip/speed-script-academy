import express from 'express';
import { protect, adminOnly } from '../middleware/auth.js';
import CourseModel from '../models/Course.js';
import SiteContentModel from '../models/SiteContent.js';
import SettingsModel from '../models/Settings.js';

const router = express.Router();

// @route   GET /api/cms
router.get('/', async (req, res) => {
  try {
    const content = await SiteContentModel.findOne({ key: 'main' });
    res.json(content);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// DELETED: Destructive /seed route removed for data safety.

// @route   POST /api/cms (Admin Only)
router.post('/', protect, adminOnly, async (req, res) => {
  try {
    const content = await SiteContentModel.findOneAndUpdate(
      { key: 'main' },
      req.body,
      { upsert: true, new: true }
    );
    res.json(content);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
