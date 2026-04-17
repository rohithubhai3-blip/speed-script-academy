import mongoose from 'mongoose';

const attemptSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  userName: { type: String },
  courseId: { type: String, required: true },
  levelId: { type: String, required: true },
  lessonId: { type: String, required: true },
  wpm: { type: Number, required: true },
  accuracy: { type: Number, required: true },
  mistakes: { type: Number, default: 0 },
  cheatingWarnings: { type: Number, default: 0 },
  timestamp: { type: Date, default: Date.now }
});

const Attempt = mongoose.models.Attempt || mongoose.model('Attempt', attemptSchema);
export default Attempt;
