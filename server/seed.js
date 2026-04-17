import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Course from './models/Course.js';
import SiteContent from './models/SiteContent.js';

import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

const MOCK_COURSES = [
  {
    id: "course-demo",
    title: "Demo: Shorthand Basics",
    description: "Start your journey with free shorthand dictations at 60 WPM.",
    price: 0,
    levels: [
      {
        id: "level-normal",
        title: "Normal (60-80 WPM)",
        lessons: [
          {
            id: "lesson-1",
            title: "Legal Dictation #1",
            passage: "In the High Court of India, the petitioner seeks justice under the constitutional provisions of Article 226. The matter pertains to the unlawful termination of service without due process of law.",
            audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
            baseWpm: 60,
            timeLimit: "05:00"
          }
        ]
      }
    ]
  }
];

const INITIAL_SITE_CONTENT = {
  key: 'main',
  hero: {
    title: "Master Shorthand from basic to advance.",
    subtitle: "Speed Script Academy is a professional training platform focused on developing shorthand proficiency with speed, accuracy and consistency. We deliver structured, exam-oriented courses with practical dictation and performance-based learning. Our mission is to equip learners with the skills and confidence required to excel in stenography careers and competitive exams."
  },
  features: [
    { icon: "Activity", title: "Real Dictation", desc: "real exam level dictations designed to match competitive stenography skill test standards." },
    { icon: "Zap", title: "Smart Evaluation", desc: "Instant grading of Your WPM, error rates, and accuracy percentage." },
    { icon: "ShieldCheck", title: "Cheat-Proof", desc: "Built-in anti-cheat prevents copy-pasting and monitors tab switching." },
    { icon: "Server", title: "Progressive Learning", desc: "Structured lessons from 60 WPM to 120 WPM to build your confidence." }
  ],
  stats: [
    { label: "Lessons", value: "50+" },
    { label: "Students", value: "1,200+" },
    { label: "Success Rate", value: "94%" },
    { label: "Expert Audio", value: "100h+" }
  ],
  howItWorks: [
    { title: "Register", desc: "Create your account and choose your preferred shorthand style." },
    { title: "Pick a Course", desc: "Select from our range of legal, medical, or general dictation courses." },
    { title: "Practice", desc: "Listen to the dictation and type as accurately as you can." },
    { title: "Get Results", desc: "Receive an instant, detailed report of your errors and speed." }
  ],
  faq: [
    { q: "Is this suitable for beginners?", a: "Yes! We have dedicated courses starting from 60 WPM for beginners." },
    { q: "Can I use it on mobile?", a: "While the site is responsive, we recommend a keyboard for the best typing experience." },
    { q: "How do I get my results?", a: "Results are generated instantly after you finish or submit your test." },
    { q: "Is there a refund policy?", a: "Yes, we offer refunds on manual payments within 24 hours if access hasn't been used." }
  ],
  about: {
    title: "About Speed Script Academy",
    content: "Speed Script Academy is India's leading digital platform for shorthand aspirants. Founded by professional stenographers, our mission is to provide high-quality, exam-oriented dictation practice to every student. We specialize in preparing candidates for High Court, Supreme Court, and various SSC shorthand examinations."
  },
  contact: {
    email: "support@speedscript.com",
    phone: "+91 98765 43210",
    whatsapp: "919876543210",
    address: "Skill Tower, 4th Floor, Janakpuri, New Delhi, India"
  },
  privacy: {
    title: "Privacy Policy",
    content: "Your privacy is important to us. Speed Script Academy collects minimal data required for your learning experience. We never share your personal information or test results with third parties. All payment information is handled through secure encrypted channels."
  },
  refund: {
    title: "Refund Policy",
    content: "Course fees are generally non-refundable once content is accessed. For manual payments, if you encounter technical issues prevent course access, a full refund can be requested within 24 hours of payment. Please contact our support team via WhatsApp for refund queries."
  }
};

const seed = async () => {
  const uri = process.env.MONGO_URI || 'mongodb://localhost:27017/ssa';
  console.log(`[SEED] Attempting connection to ${uri.substring(0, 30)}...`);
  try {
    await mongoose.connect(uri);
    console.log(`[SEED] Successfully CONNECTED to Database: ${mongoose.connection.name}`);
    
    // Clear existing
    await Course.deleteMany({});
    await SiteContent.deleteMany({});

    // Add new
    await Course.insertMany(MOCK_COURSES);
    await SiteContent.create(INITIAL_SITE_CONTENT);

    console.log('Database Seeded Successfully!');
    process.exit();
  } catch (err) {
    console.error('Seeding failed:', err);
    process.exit(1);
  }
};

seed();
