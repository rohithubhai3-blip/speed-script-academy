import mongoose from 'mongoose';

const siteContentSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true, default: 'main' }, // 'main' for the primary site content
  hero: {
    title: String,
    subtitle: String
  },
  features: [{
    icon: String,
    title: String,
    desc: String
  }],
  stats: [{
    label: String,
    value: String
  }],
  howItWorks: [{
    title: String,
    desc: String
  }],
  faq: [{
    q: String,
    a: String
  }],
  about: {
    title: String,
    content: String
  },
  contact: {
    email: String,
    phone: String,
    whatsapp: String,
    address: String
  },
  privacy: {
    title: String,
    content: String
  },
  refund: {
    title: String,
    content: String
  },
  seo: {
    title: { type: String, default: 'Speed Script Academy | Mastery in Shorthand' },
    description: { type: String, default: 'The ultimate platform for learning and practicing shorthand for SSC, High Courts, and all state exams.' },
    keywords: { type: String, default: 'shorthand, stenography, SSC stenographer, typing speed, online shorthand course' }
  },
  socials: {
    youtube: { type: String, default: '' },
    telegram: { type: String, default: '' },
    whatsapp: { type: String, default: '' }
  },
  reviews: [{
    name: String,
    role: String,
    text: String,
    stars: { type: Number, default: 5 }
  }],
  banner: {
    enabled: { type: Boolean, default: false },
    text: { type: String, default: '' },
    link: { type: String, default: '' }
  },
  promoBadge: {
    enabled: { type: Boolean, default: true },
    text: { type: String, default: '🎁 FREE COURSES AVAILABLE' }
  },
  inbox: [{
    name: String,
    email: String,
    message: String,
    id: String,
    timestamp: Date,
    read: { type: Boolean, default: false }
  }],
  updatedAt: { type: Date, default: Date.now }
});

const SiteContent = mongoose.models.SiteContent || mongoose.model('SiteContent', siteContentSchema);
export default SiteContent;
