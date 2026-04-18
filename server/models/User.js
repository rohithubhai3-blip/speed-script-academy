import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const courseAccessSchema = new mongoose.Schema({
  courseId: { type: String, required: true },
  expiresAt: { type: Date, default: null } // null = lifetime access
}, { _id: false });

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['user', 'admin'], default: 'user' },
  purchasedCourses: [{ type: String }], // Legacy field - kept for backward compatibility
  courseAccess: [courseAccessSchema],   // New field: with expiry support
  lastLogin: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now }
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Helper: Check if user has active access to a course
userSchema.methods.hasCourseAccess = function(courseId) {
  // Check new courseAccess array first
  const access = this.courseAccess?.find(a => a.courseId === courseId);
  if (access) {
    if (!access.expiresAt) return true; // Lifetime access
    return new Date(access.expiresAt) > new Date(); // Check expiry
  }
  // Fallback: check legacy purchasedCourses (treated as lifetime)
  return this.purchasedCourses?.includes(courseId) || false;
};

const User = mongoose.models.User || mongoose.model('User', userSchema);
export default User;
