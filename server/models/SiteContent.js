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
  updatedAt: { type: Date, default: Date.now }
});

const SiteContent = mongoose.model('SiteContent', siteContentSchema);
export default SiteContent;
