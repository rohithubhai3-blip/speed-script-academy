import express from 'express';
import { protect, adminOnly } from '../middleware/auth.js';
import Attempt from '../models/Attempt.js';
import Course from '../models/Course.js';
import { analyzeTestResult } from '../utils/engine.js';

const router = express.Router();

// @route   POST /api/results/submit
router.post('/submit', protect, async (req, res) => {
  const { courseId, levelId, lessonId, typedText, timeTakenMinutes, warnings } = req.body;

  try {
    const course = await Course.findOne({ id: courseId });
    if (!course) return res.status(404).json({ message: 'Course not found' });

    const level = course.levels.find(l => l.id === levelId);
    const lesson = level.lessons.find(ls => ls.id === lessonId);

    const rules = {
      capRule: lesson.capRule || "Ignore",
      punctRule: lesson.punctRule || "Ignore",
      similarWordRule: lesson.similarWordRule || "Strict"
    };

    // Server-side validation (Anti-Cheat)
    const analysis = analyzeTestResult(lesson.passage, typedText, timeTakenMinutes, rules);

    const attempt = await Attempt.create({
      userId: req.user._id,
      userName: req.user.name,
      courseId,
      levelId,
      lessonId,
      wpm: analysis.wpm,
      accuracy: analysis.accuracy,
      mistakes: analysis.totalMistakes,
      cheatingWarnings: warnings,
      timestamp: Date.now()
    });

    res.status(201).json({ analysis, attemptId: attempt._id });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   GET /api/results/my
router.get('/my', protect, async (req, res) => {
  try {
    const attempts = await Attempt.find({ userId: req.user._id }).sort({ timestamp: -1 });
    res.json(attempts);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   GET /api/results/all (Admin Only)
router.get('/all', protect, adminOnly, async (req, res) => {
  try {
    const attempts = await Attempt.find({}).sort({ timestamp: -1 });
    res.json(attempts);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
