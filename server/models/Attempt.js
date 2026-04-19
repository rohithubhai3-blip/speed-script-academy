import mongoose from 'mongoose';

const attemptSchema = new mongoose.Schema({
  userId:           { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  userName:         { type: String },
  courseId:         { type: String, required: true },
  levelId:          { type: String, required: true },
  lessonId:         { type: String, required: true },
  lessonTitle:      { type: String },
  wpm:              { type: Number, required: true },
  accuracy:         { type: Number, required: true },
  errorPercent:     { type: Number, default: 0 },
  mistakes:         { type: Number, default: 0 },   // total error units (backward compat)
  fullMistakes:     { type: Number, default: 0 },
  halfMistakes:     { type: Number, default: 0 },
  totalWords:       { type: Number, default: 0 },
  typedWords:       { type: Number, default: 0 },
  passed:           { type: Boolean, default: false },
  cheatingWarnings: { type: Number, default: 0 },
  visualHTML:       { type: Array, default: [] },  // Word-by-word analysis details
  rules:            { type: Object, default: {} },  // Evaluator rules applied
  timestamp:        { type: Date, default: Date.now }
});

const Attempt = mongoose.models.Attempt || mongoose.model('Attempt', attemptSchema);
export default Attempt;
