import React from 'react';
import { Mail, Phone, MapPin, MessageSquare, Send } from 'lucide-react';
import { db } from '../data/db';

export default function ContactPage() {
  const [content, setContent] = React.useState(null);

  React.useEffect(() => {
    db.getSiteContent().then(setContent);
    window.scrollTo(0, 0);
  }, []);

  if (!content) return null;

  return (
    <div className="container" style={{ paddingTop: '120px', paddingBottom: '80px' }}>
      <div className="text-center" style={{ marginBottom: '60px' }}>
        <h1 style={{ fontSize: '3.5rem', fontFamily: 'var(--font-heading)' }}>Get in Touch</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '1.2rem' }}>We are here to help you on your shorthand journey.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '40px' }}>
        {/* Contact Info */}
        <div className="glass-panel" style={{ padding: '40px' }}>
          <h3 style={{ marginBottom: '30px' }}>Contact Information</h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
            <div style={{ display: 'flex', gap: '20px' }}>
              <div style={{ padding: '12px', background: 'rgba(var(--primary-rgb), 0.1)', borderRadius: '12px' }}>
                <Mail className="text-primary" />
              </div>
              <div>
                <h5 style={{ margin: 0 }}>Email Us</h5>
                <p style={{ margin: '5px 0 0', color: 'var(--text-secondary)' }}>{content.contact.email}</p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '20px' }}>
              <div style={{ padding: '12px', background: 'rgba(var(--secondary-rgb), 0.1)', borderRadius: '12px' }}>
                <Phone className="text-secondary" />
              </div>
              <div>
                <h5 style={{ margin: 0 }}>Call Us</h5>
                <p style={{ margin: '5px 0 0', color: 'var(--text-secondary)' }}>{content.contact.phone}</p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '20px' }}>
              <div style={{ padding: '12px', background: 'rgba(var(--primary-rgb), 0.1)', borderRadius: '12px' }}>
                <MapPin className="text-primary" />
              </div>
              <div>
                <h5 style={{ margin: 0 }}>Visit Us</h5>
                <p style={{ margin: '5px 0 0', color: 'var(--text-secondary)' }}>{content.contact.address}</p>
              </div>
            </div>
          </div>

          <div style={{ marginTop: '40px' }}>
             <a 
              href={`https://wa.me/${content.contact.whatsapp}`} 
              target="_blank" 
              className="btn btn-primary w-full"
              style={{ display: 'flex', justifyContent: 'center', gap: '10px' }}
             >
               <MessageSquare size={20} /> Chat on WhatsApp
             </a>
          </div>
        </div>

        {/* Contact Form */}
        <div className="glass-panel" style={{ padding: '40px' }}>
          <h3 style={{ marginBottom: '30px' }}>Send a Message</h3>
          <form onSubmit={(e) => e.preventDefault()} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div className="input-group">
              <label>Full Name</label>
              <input type="text" placeholder="Enter your name" className="form-control" />
            </div>
            <div className="input-group">
              <label>Email Address</label>
              <input type="email" placeholder="email@example.com" className="form-control" />
            </div>
            <div className="input-group">
              <label>Message</label>
              <textarea placeholder="How can we help you?" className="form-control" style={{ minHeight: '120px' }}></textarea>
            </div>
            <button className="btn btn-secondary w-full" style={{ display: 'flex', justifyContent: 'center', gap: '10px' }}>
              <Send size={20} /> Send Message
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
