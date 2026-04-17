import express from 'express';
import { protect, adminOnly } from '../middleware/auth.js';
import CourseModel from '../models/Course.js';

const router = express.Router();

// @route   GET /api/courses
router.get('/', async (req, res) => {
  try {
    const courses = await CourseModel.find({});
    res.json(courses);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   GET /api/courses/lesson/:courseId/:levelId/:lessonId
router.get('/lesson/:courseId/:levelId/:lessonId', protect, async (req, res) => {
  const { courseId, levelId, lessonId } = req.params;
  
  try {
    const course = await CourseModel.findOne({ id: courseId });
    if (!course) return res.status(404).json({ message: 'Course not found' });

    // Check if user has purchased this course OR if it's a demo
    const isPurchased = req.user.purchasedCourses.includes(courseId);
    const isDemo = course.title.toLowerCase().includes('demo');

    if (!isPurchased && !isDemo && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Course not purchased' });
    }

    const level = course.levels.find(l => l.id === levelId);
    if (!level) return res.status(404).json({ message: 'Level not found' });

    const lesson = level.lessons.find(ls => ls.id === lessonId);
    if (!lesson) return res.status(404).json({ message: 'Lesson not found' });

    res.json(lesson);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   POST /api/courses (Admin Only)
router.post('/', protect, adminOnly, async (req, res) => {
  try {
    const course = await CourseModel.create(req.body);
    res.status(201).json(course);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   PUT /api/courses/:id (Admin Only)
router.put('/:id', protect, adminOnly, async (req, res) => {
  try {
    const course = await CourseModel.findOneAndUpdate({ id: req.params.id }, req.body, { new: true });
    res.json(course);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
