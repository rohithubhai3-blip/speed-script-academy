import mongoose from 'mongoose';

const purchaseRequestSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  courseId: { type: String, required: true }, // The string ID from Course model (e.g. 'course-1')
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  durationDays: { type: Number, default: 0 }, // 0 = lifetime
  expiresAt: { type: Date, default: null },   // calculated on approval
  createdAt: { type: Date, default: Date.now }
});

const PurchaseRequest = mongoose.models.PurchaseRequest || mongoose.model('PurchaseRequest', purchaseRequestSchema);
export default PurchaseRequest;
