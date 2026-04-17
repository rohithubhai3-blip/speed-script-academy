import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '.env') });

const verify = async () => {
  try {
    const uri = process.env.MONGO_URI;
    console.log(`Connecting to: ${uri.substring(0, 30)}...`);
    await mongoose.connect(uri);
    console.log(`CONNECTED. DB Name: ${mongoose.connection.name}`);

    const SiteContent = mongoose.connection.db.collection('sitecontents');
    const content = await SiteContent.findOne({ key: 'main' });

    if (content) {
      console.log('--- LIVE SITE CONTENT ---');
      console.log('Hero Title:', content.hero.title);
      console.log('Hero Subtitle:', content.hero.subtitle.substring(0, 100) + '...');
      console.log('--- BRAND CHECK ---');
      // Search for "Speed Script" word
      const text = JSON.stringify(content);
      const matches = text.match(/Speed Script(?! Academy)/g);
      console.log('Occurrences of "Speed Script" without "Academy":', matches ? matches.length : 0);
    } else {
      console.log('No SiteContent found!');
    }

    process.exit();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

verify();
