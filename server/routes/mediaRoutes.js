import express from 'express';
import { v2 as cloudinary } from 'cloudinary';
import { protect, adminOnly } from '../middleware/auth.js';
import dotenv from 'dotenv';

dotenv.config();

const router = express.Router();

// Configuration
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// @route   GET /api/media/signature
// @desc    Get a signature for secure direct client-side upload to Cloudinary
// @access  Private/Admin
router.get('/signature', protect, adminOnly, (req, res) => {
  const timestamp = Math.round(new Date().getTime() / 1000);
  
  // We specify what parameters we want to sign. 
  // For simplicity, we sign the timestamp and an optional upload_preset if needed.
  const signature = cloudinary.utils.api_sign_request(
    {
      timestamp: timestamp,
      folder: 'ssa_media', // Organize files into a folder
    },
    process.env.CLOUDINARY_API_SECRET
  );

  res.json({
    signature,
    timestamp,
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    apiKey: process.env.CLOUDINARY_API_KEY,
    folder: 'ssa_media'
  });
});

export default router;
