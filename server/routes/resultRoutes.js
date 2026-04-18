import express from 'express';
import { protect, adminOnly } from '../middleware/auth.js';
import Attempt from '../models/Attempt.js';

const router = express.Router();

// @route   POST /api/results/submit
// Accepts pre-computed result from frontend (client-side analysis is authoritative)
router.post('/submit', protect, async (req, res) => {
  const {
    courseId, levelId, lessonId, lessonTitle,
    wpm, accuracy, errorPercent,
    fullMistakes, halfMistakes, totalWords, typedWords,
    mistakes,   // backward compat: totalMistakes / errorUnits
    passed,
    cheatingWarnings,
    timestamp
  } = req.body;

  try {
    const attempt = await Attempt.create({
      userId:           req.user._id,
      userName:         req.user.name,
      courseId:         courseId || '',
      levelId:          levelId  || '',
      lessonId:         lessonId || '',
      lessonTitle:      lessonTitle || '',
      wpm:              Number(wpm)          || 0,
      accuracy:         Number(accuracy)     || 0,
      errorPercent:     Number(errorPercent) || 0,
      fullMistakes:     Number(fullMistakes) || 0,
      halfMistakes:     Number(halfMistakes) || 0,
      totalWords:       Number(totalWords)   || 0,
      typedWords:       Number(typedWords)   || 0,
      mistakes:         Number(mistakes)     || 0,
      passed:           Boolean(passed),
      cheatingWarnings: Number(cheatingWarnings) || 0,
      timestamp:        timestamp ? new Date(timestamp) : new Date(),
    });

    res.status(201).json({ success: true, attemptId: attempt._id });
  } catch (error) {
    console.error('[SUBMIT_ERROR]', error.message);
    res.status(500).json({ message: error.message });
  }
});

// @route   GET /api/results/my
router.get('/my', protect, async (req, res) => {
  try {
    const attempts = await Attempt
      .find({ userId: req.user._id })
      .sort({ timestamp: -1 })
      .limit(100); // last 100 attempts
    res.json(attempts);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   GET /api/results/all (Admin Only)
router.get('/all', protect, adminOnly, async (req, res) => {
  try {
    const attempts = await Attempt
      .find({})
      .sort({ timestamp: -1 })
      .limit(500);
    res.json(attempts);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
