import mongoose from 'mongoose';

const lessonSchema = new mongoose.Schema({
  id: { type: String, required: true },
  title: { type: String, required: true },
  passage: { type: String, required: true },
  audioUrl: { type: String },
  mediaUrl: { type: String },
  mediaType: { type: String, enum: ['audio', 'video'], default: 'audio' },
  baseWpm: { type: Number, default: 80 },
  timeLimit: { type: String },
  allowedErrorPercent: { type: Number, default: 5 },
  capRule: { type: String, default: 'Ignore' },
  punctRule: { type: String, default: 'Ignore' },
  similarWordRule: { type: String, default: 'Strict' },
  isBackspaceAllowed: { type: Boolean, default: false },
  halfMistakeAllowed: { type: Boolean, default: true },
  fullMistakeAllowed: { type: Boolean, default: true }
});

const levelSchema = new mongoose.Schema({
  id: { type: String, required: true },
  title: { type: String, required: true },
  lessons: [lessonSchema]
});

const courseSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  title: { type: String, required: true },
  description: { type: String },
  thumbnail: { type: String },      // legacy field
  thumbnailUrl: { type: String },   // new field used by admin panel
  price: { type: Number, default: 0 },
  levels: [levelSchema],
  createdAt: { type: Date, default: Date.now }
});

const Course = mongoose.models.Course || mongoose.model('Course', courseSchema);
export default Course;
