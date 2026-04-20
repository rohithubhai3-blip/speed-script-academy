import React, { useState, useEffect } from 'react';
import { Mail, Phone, MapPin, MessageCircle, Send, CheckCircle, Loader2 } from 'lucide-react';
import { db } from '../data/db';
import useStore from '../store/useStore';

export default function ContactPage() {
  const [content, setContent] = useState(null);
  const [formData, setFormData] = useState({ name: '', email: '', message: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const addToast = useStore(state => state.addToast);

  useEffect(() => {
    db.getSiteContent().then(setContent);
    window.scrollTo(0, 0);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.message) {
      addToast('Please fill in all fields', 'warning');
      return;
    }

    try {
      setIsSubmitting(true);
      await db.submitInquiry(formData);
      addToast('Message sent successfully! We will get back to you soon.', 'success');
      setFormData({ name: '', email: '', message: '' });
    } catch (err) {
      addToast('Failed to send message. Please try again.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!content) return (
    <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Loader2 className="animate-spin" size={40} color="var(--primary)" />
    </div>
  );

  const whatsappMessage = encodeURIComponent("Hi Rohit, mujhe Speed Script Academy ke baare me kuch puchna hai...");
  const whatsappUrl = `https://wa.me/${content.contact?.whatsapp || ''}?text=${whatsappMessage}`;

  return (
    <div className="container" style={{ paddingTop: '140px', paddingBottom: '100px', position: 'relative' }}>
      {/* Decorative Background Elements */}
      <div style={{ position: 'absolute', top: '10%', left: '-5%', width: '300px', height: '300px', background: 'var(--primary)', filter: 'blur(150px)', opacity: 0.1, zIndex: -1 }}></div>
      <div style={{ position: 'absolute', bottom: '10%', right: '-5%', width: '300px', height: '300px', background: 'var(--secondary)', filter: 'blur(150px)', opacity: 0.1, zIndex: -1 }}></div>

      <div className="text-center" style={{ marginBottom: '80px' }}>
        <h1 style={{ 
          fontSize: '4rem', 
          fontFamily: 'var(--font-heading)', 
          fontWeight: 900,
          background: 'linear-gradient(135deg, var(--text-primary) 0%, var(--text-secondary) 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          marginBottom: '20px'
        }}>
          Let's Connect
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '1.25rem', maxWidth: '600px', margin: '0 auto' }}>
          Have a question or want to level up your shorthand? Our team is just a message away.
        </p>
      </div>

      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', 
        gap: '40px',
        alignItems: 'start'
      }}>
        {/* Contact Info Card */}
        <div className="glass-panel" style={{ 
          padding: '50px', 
          borderRadius: '32px',
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.08)',
          boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)'
        }}>
          <h2 style={{ fontSize: '1.8rem', fontWeight: 800, marginBottom: '40px' }}>Contact Details</h2>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
            {/* Email */}
            <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
              <div style={{ 
                width: '56px', height: '56px', 
                background: 'linear-gradient(135deg, rgba(14,165,233,0.1), rgba(14,165,233,0.05))', 
                borderRadius: '18px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                border: '1px solid rgba(14,165,233,0.2)'
              }}>
                <Mail color="var(--primary)" size={24} />
              </div>
              <div>
                <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>Email Address</h4>
                <p style={{ margin: '4px 0 0', color: 'var(--text-secondary)', fontSize: '0.95rem' }}>{content.contact?.email}</p>
              </div>
            </div>

            {/* Phone */}
            <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
              <div style={{ 
                width: '56px', height: '56px', 
                background: 'linear-gradient(135deg, rgba(45,212,191,0.1), rgba(45,212,191,0.05))', 
                borderRadius: '18px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                border: '1px solid rgba(45,212,191,0.2)'
              }}>
                <Phone color="var(--accent)" size={24} />
              </div>
              <div>
                <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>Call Us</h4>
                <p style={{ margin: '4px 0 0', color: 'var(--text-secondary)', fontSize: '0.95rem' }}>{content.contact?.phone}</p>
              </div>
            </div>

            {/* Address */}
            <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
              <div style={{ 
                width: '56px', height: '56px', 
                background: 'linear-gradient(135deg, rgba(139,92,246,0.1), rgba(139,92,246,0.05))', 
                borderRadius: '18px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                border: '1px solid rgba(139,92,246,0.2)'
              }}>
                <MapPin color="var(--secondary)" size={24} />
              </div>
              <div>
                <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>Our Office</h4>
                <p style={{ margin: '4px 0 0', color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: 1.5 }}>{content.contact?.address}</p>
              </div>
            </div>
          </div>

          <div style={{ marginTop: '50px', paddingTop: '40px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
             <a 
              href={whatsappUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              className="social-btn-3d whatsapp"
              style={{ 
                width: '100%', 
                padding: '16px', 
                borderRadius: '16px',
                display: 'flex', 
                alignItems: 'center',
                justifyContent: 'center', 
                gap: '12px',
                fontSize: '1rem',
                fontWeight: 700
              }}
             >
               <MessageCircle size={22} /> Chat on WhatsApp
               <div className="btn-glow"></div>
             </a>
             <p style={{ textAlign: 'center', fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '12px' }}>
               Typical reply time: Under 2 hours
             </p>
          </div>
        </div>

        {/* Contact Form Card */}
        <div className="glass-panel" style={{ 
          padding: '50px', 
          borderRadius: '32px',
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.1)',
          backdropFilter: 'blur(20px)'
        }}>
          <h2 style={{ fontSize: '1.8rem', fontWeight: 800, marginBottom: '32px' }}>Send Message</h2>
          
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div className="input-group">
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Your Name</label>
              <input 
                type="text" 
                placeholder="Rohit Sharma" 
                className="input-field"
                value={formData.name}
                onChange={e => setFormData({...formData, name: e.target.value})}
                style={{ width: '100%', padding: '14px 20px', borderRadius: '14px' }} 
              />
            </div>
            
            <div className="input-group">
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Email Address</label>
              <input 
                type="email" 
                placeholder="rohit@example.com" 
                className="input-field"
                value={formData.email}
                onChange={e => setFormData({...formData, email: e.target.value})}
                style={{ width: '100%', padding: '14px 20px', borderRadius: '14px' }} 
              />
            </div>

            <div className="input-group">
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Your Message</label>
              <textarea 
                placeholder="Tell us how we can help you today..." 
                className="input-field"
                value={formData.message}
                onChange={e => setFormData({...formData, message: e.target.value})}
                style={{ width: '100%', padding: '14px 20px', border: 'none', minHeight: '150px', borderRadius: '18px', resize: 'none' }}
              ></textarea>
            </div>

            <button 
              type="submit"
              disabled={isSubmitting}
              className="btn btn-primary" 
              style={{ 
                width: '100%', 
                padding: '16px', 
                borderRadius: '16px',
                fontSize: '1rem',
                fontWeight: 700,
                display: 'flex', 
                alignItems: 'center',
                justifyContent: 'center', 
                gap: '10px',
                marginTop: '10px',
                boxShadow: '0 10px 20px -5px rgba(var(--primary-rgb), 0.3)'
              }}
            >
              {isSubmitting ? (
                <><Loader2 className="animate-spin" size={20} /> Sending...</>
              ) : (
                <><Send size={20} /> Send Inquiry</>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
