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
    visualHTML,
    rules,
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
      visualHTML:       visualHTML || [],
      rules:            rules || {},
      timestamp:        timestamp ? new Date(timestamp) : new Date(),
    });
    
    // 🔥 Update Course Analytics
    import('../models/Course.js').then(async ({ default: Course }) => {
      if (courseId) {
        try {
          const statsUpdate = {
             $inc: {
                "stats.attemptsCount": 1,
                "stats.totalWPM": Number(wpm) || 0,
                "stats.totalAccuracy": Number(accuracy) || 0
             },
             $set: { "stats.lastAttemptedAt": new Date() }
          };

          // Check if this is the first attempt for this user on this course to update unique student count
          const existingAttempt = await Attempt.findOne({ userId: req.user._id, courseId, _id: { $ne: attempt._id } });
          if (!existingAttempt) {
             statsUpdate.$inc["stats.uniqueStudentsCount"] = 1;
          }

          await Course.findOneAndUpdate({ id: courseId }, statsUpdate);
        } catch (err) {
          console.error('[STATS_UPDATE_ERROR]', err.message);
        }
      }
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

// @route   GET /api/results/leaderboard
router.get('/leaderboard', async (req, res) => {
  const { filter, lessonId } = req.query; // 'daily' | 'weekly' | 'all-time'
  
  let dateFilter = {};
  if (filter === 'daily') {
    const startOfDay = new Date();
    startOfDay.setHours(0,0,0,0);
    dateFilter = { timestamp: { $gte: startOfDay } };
  } else if (filter === 'weekly') {
    const startOfWeek = new Date();
    startOfWeek.setDate(startOfWeek.getDate() - 7);
    startOfWeek.setHours(0,0,0,0);
    dateFilter = { timestamp: { $gte: startOfWeek } };
  }

  let matchQuery = {
      ...dateFilter,
      wpm: { $gt: 0 }, 
      accuracy: { $gt: 0 } 
  };
  
  if (lessonId) {
      matchQuery.lessonId = lessonId;
  }

  try {
    const adminUsers = await import('../models/User.js').then(m => m.default.find({ role: 'admin' }).select('_id'));
    const adminIds = adminUsers.map(u => u._id.toString());

    // Group by user, getting their absolute best attempt within the timezone
    // Best = Highest Accuracy -> Highest WPM -> Lowest Errors
    const topAttempts = await Attempt.aggregate([
      { $match: matchQuery },
      { $addFields: { userIdStr: { $toString: "$userId" } } },
      { $match: { userIdStr: { $nin: adminIds } } },
      { $sort: { accuracy: -1, wpm: -1, fullMistakes: 1 } },
      { $group: {
          _id: "$userIdStr",
          userName: { $first: "$userName" },
          bestAccuracy: { $first: "$accuracy" },
          bestWpm: { $first: "$wpm" },
          bestMistakes: { $first: "$fullMistakes" },
          timestamp: { $first: "$timestamp" },
          lessonTitle: { $first: "$lessonTitle" }
      }},
      { $sort: { bestAccuracy: -1, bestWpm: -1, bestMistakes: 1 } },
      { $limit: 100 }
    ]);

    res.json(topAttempts);
  } catch (error) {
    console.error('[LEADERBOARD_ERROR]', error.message);
    res.status(500).json({ message: error.message });
  }
});

export default router;
