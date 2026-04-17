import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '.env') });

const verifySafety = async () => {
  try {
    const uri = process.env.MONGO_URI;
    await mongoose.connect(uri);
    console.log(`Connected to: ${mongoose.connection.name}`);

    // 1. Create a dummy course
    const Course = mongoose.connection.db.collection('courses');
    await Course.insertOne({ id: 'safety-test-id', title: 'I should not be deleted' });
    console.log('--- STEP 1: Dummy course created.');

    // 2. Run the seed script (I'll simulate it by calling its logic if possible, or just run the file)
    console.log('--- STEP 2: Running Seed Script...');
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

verifySafety();
