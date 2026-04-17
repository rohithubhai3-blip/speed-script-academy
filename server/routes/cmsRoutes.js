import express from 'express';
import { protect, adminOnly } from '../middleware/auth.js';
import CourseModel from '../models/Course.js';
import SiteContentModel from '../models/SiteContent.js';

const router = express.Router();

// @route   GET /api/cms/seed (Magic Seed Route)
router.get('/seed', async (req, res) => {
  try {
    // Basic security: require a simple query param or just warn that this is for one-time setup
    // For ease of use for the user, we will keep it simple.
    const { MOCK_COURSES, INITIAL_SITE_CONTENT } = await import('../seed_logic.js');
    
    await CourseModel.deleteMany({});
    await SiteContentModel.deleteMany({});
    await CourseModel.insertMany(MOCK_COURSES);
    await SiteContentModel.create(INITIAL_SITE_CONTENT);

    res.json({ message: 'Database Seeded Successfully! You can now delete this route for security.' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

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
