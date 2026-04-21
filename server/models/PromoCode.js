import mongoose from 'mongoose';

const promoCodeSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true },
  courseId: { type: String, required: true },
  isUsed: { type: Boolean, default: false },
  usedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  usedAt: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now }
});

const PromoCode = mongoose.models.PromoCode || mongoose.model('PromoCode', promoCodeSchema);
export default PromoCode;
