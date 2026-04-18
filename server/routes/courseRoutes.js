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

router.get('/lesson/:courseId/:levelId/:lessonId', protect, async (req, res) => {
  const { courseId, levelId, lessonId } = req.params;
  
  try {
    // We use .findOne({ id: courseId }) because we use custom slug IDs like 'course-demo'
    const course = await CourseModel.findOne({ id: courseId });
    if (!course) {
      console.warn(`[COURSE_NOT_FOUND] courseId: ${courseId}`);
      return res.status(404).json({ message: `Course "${courseId}" not found` });
    }

    // Check if user has active access to this course
    const isFree = course.price === 0;
    const isDemo = course.title.toLowerCase().includes('demo');
    const hasPaidAccess = req.user.hasCourseAccess ? req.user.hasCourseAccess(courseId) : (req.user.purchasedCourses?.includes(courseId));

    if (!hasPaidAccess && !isDemo && !isFree && req.user.role !== 'admin') {
      // Check specifically if the access EXPIRED
      const expiredAccess = req.user.courseAccess?.find(a => a.courseId === courseId && a.expiresAt && new Date(a.expiresAt) <= new Date());
      if (expiredAccess) {
        return res.status(403).json({ message: `Your access to this course expired on ${new Date(expiredAccess.expiresAt).toDateString()}. Please renew to continue.` });
      }
      return res.status(403).json({ message: 'Course not purchased. Please check out first.' });
    }

    const level = course.levels.find(l => l.id === levelId);
    if (!level) {
      console.warn(`[LEVEL_NOT_FOUND] course: ${courseId}, level: ${levelId}`);
      return res.status(404).json({ message: `Level "${levelId}" not found in this course` });
    }

    const lesson = level.lessons.find(ls => ls.id === lessonId);
    if (!lesson) {
      console.warn(`[LESSON_NOT_FOUND] course: ${courseId}, level: ${levelId}, lesson: ${lessonId}`);
      return res.status(404).json({ message: `Lesson "${lessonId}" not found in this level` });
    }

    res.json({ course, level, lesson });
  } catch (error) {
    console.error(`[GET_LESSON_ERROR]`, error);
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
// @route   DELETE /api/courses/:id (Admin Only)
router.delete('/:id', protect, adminOnly, async (req, res) => {
  try {
    await CourseModel.findOneAndDelete({ id: req.params.id });
    res.json({ message: 'Course deleted success' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   POST /api/courses/lesson/:courseId/:levelId (Admin Only)
router.post('/lesson/:courseId/:levelId', protect, adminOnly, async (req, res) => {
  const { courseId, levelId } = req.params;
  try {
    const course = await CourseModel.findOne({ id: courseId });
    if (!course) return res.status(404).json({ message: 'Course not found' });

    const level = course.levels.find(l => l.id === levelId);
    if (!level) return res.status(404).json({ message: 'Level not found' });

    level.lessons.push(req.body);
    await course.save();
    res.status(201).json(course);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   PUT /api/courses/lesson/:courseId/:levelId/:lessonId (Admin Only)
router.put('/lesson/:courseId/:levelId/:lessonId', protect, adminOnly, async (req, res) => {
  const { courseId, levelId, lessonId } = req.params;
  try {
    const course = await CourseModel.findOne({ id: courseId });
    if (!course) return res.status(404).json({ message: 'Course not found' });

    const level = course.levels.find(l => l.id === levelId);
    if (!level) return res.status(404).json({ message: 'Level not found' });

    const lessonIndex = level.lessons.findIndex(ls => ls.id === lessonId);
    if (lessonIndex === -1) return res.status(404).json({ message: 'Lesson not found' });

    level.lessons[lessonIndex] = { ...level.lessons[lessonIndex].toObject(), ...req.body };
    await course.save();
    res.status(200).json(course);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
