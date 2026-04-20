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
    title: "Crack All-India Stenographer Skill Tests!",
    subtitle: "Complete Skill Test Preparation platform designed for SSC, High Court, and JKSSB aspirants. Real exam practice with instant speed tracking to build your confidence."
  },
  features: [
    { icon: "Activity", title: "Real Exam Practice", desc: "Authentic dictations designed to match competitive stenography skill test standards." },
    { icon: "Zap", title: "Accuracy & Speed Tracking", desc: "Instant grading of Your WPM, error rates, and translation accuracy percentage." },
    { icon: "ShieldCheck", title: "Structured Learning System", desc: "Progressive learning path from basic to 120+ WPM. Built-in anti-cheat system." },
    { icon: "Server", title: "2026 Batch Open!", desc: "New batches now open! Limited seats available for dedicated shorthand focus." }
  ],
  stats: [
    { label: "Lessons", value: "50+" },
    { label: "Students Selected", value: "850+" },
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
    { q: "What exams do you target?", a: "Our platform prepares you for SSC Steno, State High Courts, Parliament Reporter, and JKSSB." },
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
  },
  seo: {
    title: "Speed Script Academy | Crack Stenographer Skill Tests",
    description: "The ultimate platform for learning and practicing shorthand for SSC, High Courts, Parliament, and JKSSB exams. Real practice, instant speed tracking.",
    keywords: "shorthand, stenography, SSC stenographer, shorthand typing speed, online shorthand course, JKSSB skill test, High court steno"
  },
  socials: {
    youtube: "https://youtube.com/@speedscript",
    telegram: "https://t.me/speedscript",
    whatsapp: "919876543210"
  },
  banner: {
    enabled: true,
    text: "🚀 2026 Batch Now Open! Special Enrollment Discount for First 100 Students!",
    link: "/register"
  },
  promoBadge: {
    enabled: true,
    text: "🎁 FREE COURSES AVAILABLE"
  },
  reviews: [
    { name: "Amit Kumar", role: "100 WPM, SSC Qualifier", text: "The accuracy tracking here is exactly what I needed to clear my SSC grade C exam. Unmatched quality!", stars: 5 },
    { name: "Priya Sharma", role: "80 WPM, Beginner", text: "Very structured courses. Moving from 60 to 80 WPM felt totally natural with these dictations.", stars: 5 },
    { name: "Rahul D.", role: "High Court Aspirant", text: "Legal dictations are spot on. Anti-cheat feature forces you to perform like the real exam day.", stars: 4 }
  ]
};

const seed = async () => {
  const uri = process.env.MONGO_URI || 'mongodb://localhost:27017/ssa';
  console.log(`[SEED] Attempting connection to ${uri.substring(0, 30)}...`);
  try {
    await mongoose.connect(uri);
    console.log(`[SEED] Successfully CONNECTED to Database: ${mongoose.connection.name}`);
    
    // Clear existing SITE CONTENT ONLY (Courses are PRESERVED)
    console.log('[SEED] Ensuring branding is updated (preserving courses)...');
    
    // UPSERT: Update if exists, create if not. This PRESERVES other data.
    const content = await SiteContent.findOneAndUpdate(
       { key: 'main' },
       INITIAL_SITE_CONTENT,
       { upsert: true, new: true }
    );
    
    console.log(`[SEED] SUCCESS: Site Content Updated with Title: "${content.hero.title}"`);
    console.log('[SEED] NOTE: Your created courses were NOT affected. 🛡️');
    console.log('[SEED] Database Seeded Successfully! 🎯');
    process.exit();
  } catch (err) {
    console.error('Seeding failed:', err);
    process.exit(1);
  }
};

seed();
