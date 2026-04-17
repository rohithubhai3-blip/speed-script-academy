import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/authRoutes.js';
import courseRoutes from './routes/courseRoutes.js';
import cmsRoutes from './routes/cmsRoutes.js';
import resultRoutes from './routes/resultRoutes.js';
import mediaRoutes from './routes/mediaRoutes.js';
import purchaseRoutes from './routes/purchaseRoutes.js';

dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Database Connection Logic (Optimized for Serverless)
let cachedDb = null;

const connectDB = async () => {
  if (cachedDb) return cachedDb;
  
  const MONGO_URI = process.env.MONGO_URI;
  if (!MONGO_URI) {
    throw new Error('Please define the MONGO_URI environment variable');
  }

  // Mongoose 6+ connects with standard defaults (no need for deprecated options)
  const conn = await mongoose.connect(MONGO_URI, {
    family: 4, // Force IPv4 to avoid ENOTFOUND issues on Vercel
  });
  
  cachedDb = conn;
  return conn;
};

// Middleware to ensure DB connection (except for health check)
app.use(async (req, res, next) => {
  if (req.path === '/api/health') return next();
  try {
    await connectDB();
    next();
  } catch (err) {
    res.status(500).json({ message: 'Database connection failed', error: err.message });
  }
});

// Diagnostic Routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'UP', timestamp: new Date(), env: process.env.NODE_ENV });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/cms', cmsRoutes);
app.use('/api/results', resultRoutes);
app.use('/api/media', mediaRoutes);
app.use('/api/purchase', purchaseRoutes);

// Export for Vercel
export default app;

// Only listen if running locally
if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}
