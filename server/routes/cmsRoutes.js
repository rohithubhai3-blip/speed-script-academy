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

// @route   POST /api/cms/inquiry (Public)
// Allows anonymous users to send messages to the admin inbox stored in CMS
router.post('/inquiry', async (req, res) => {
  try {
    const { name, email, message } = req.body;
    if (!name || !email || !message) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const current = await SiteContentModel.findOne({ key: 'main' });
    if (!current) {
      return res.status(404).json({ message: "Site content config not found" });
    }

    const inbox = current.inbox || [];
    const newInbox = [{ 
      name, 
      email, 
      message, 
      id: Date.now().toString(), 
      timestamp: new Date().toISOString() 
    }, ...inbox];

    await SiteContentModel.findOneAndUpdate(
      { key: 'main' },
      { inbox: newInbox }
    );

    res.json({ success: true, message: "Inquiry received" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
