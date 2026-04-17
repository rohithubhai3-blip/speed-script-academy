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

import multer from 'multer';
import streamifier from 'streamifier';

// Multer Storage - Use Memory
const storage = multer.memoryStorage();
const upload = multer({ storage });

// @route   POST /api/media/upload
// @desc    Upload a file to Cloudinary via backend proxy
// @access  Private/Admin
router.post('/upload', protect, adminOnly, upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'No file uploaded' });
  }

  const uploadStream = cloudinary.uploader.upload_stream(
    {
      folder: 'ssa_media',
      resource_type: 'auto', // Detects audio vs video
    },
    (error, result) => {
      if (error) {
        console.error('[CLOUDINARY_UPLOAD_ERROR]', error);
        return res.status(500).json({ message: 'Upload failed', error: error.message });
      }
      res.json(result);
    }
  );

  // Send buffer to Cloudinary
  streamifier.createReadStream(req.file.buffer).pipe(uploadStream);
});

// @route   GET /api/media/signature
// @desc    Get a signature for secure direct client-side upload to Cloudinary (LEGACY - use /upload)
// @access  Private/Admin
router.get('/signature', protect, adminOnly, (req, res) => {
  const timestamp = Math.round(new Date().getTime() / 1000);
  
  const signature = cloudinary.utils.api_sign_request(
    {
      timestamp: timestamp,
      folder: 'ssa_media',
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
