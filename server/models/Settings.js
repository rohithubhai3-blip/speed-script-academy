import mongoose from 'mongoose';

const settingsSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true, default: 'global' },
  upiId: { type: String, default: '' },
  whatsappNumber: { type: String, default: '' },
  qrCodeUrl: { type: String, default: '' },
  // Global Notification Fields
  announcementMessage: { type: String, default: '' },
  announcementExpiresAt: { type: Date, default: null },
  announcementDuration: { type: Number, default: 10 }, // Default 10 seconds
  updatedAt: { type: Date, default: Date.now }
});

const Settings = mongoose.models.Settings || mongoose.model('Settings', settingsSchema);
export default Settings;
