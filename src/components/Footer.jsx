import { Link } from 'react-router-dom';
import { Mail, Phone, MapPin, ExternalLink, Globe, MessageCircle } from 'lucide-react';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="glass-panel" style={{ 
      marginTop: 'auto', 
      borderRadius: '24px 24px 0 0', 
      borderBottom: 0, 
      borderLeft: 0, 
      borderRight: 0,
      padding: '60px 40px 20px',
      background: 'var(--bg-surface)'
    }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '40px', maxWidth: '1200px', margin: '0 auto', textAlign: 'left' }}>
        
        {/* Brand Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ background: 'linear-gradient(135deg, var(--primary), var(--secondary))', padding: '6px', borderRadius: '6px', color: 'white', fontWeight: 'bold', fontSize: '1rem' }}>
              SSA
            </div>
            <span style={{ fontSize: '1.2rem', fontFamily: 'var(--font-heading)', fontWeight: 700 }}>
              Speed Script Academy
            </span>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.6 }}>
            Empowering stenographers and shorthand students with medical and legal dictations since 2024. Your path to professional speed starts here.
          </p>
          <div style={{ display: 'flex', gap: '12px' }}>
            <a href="#" className="btn btn-outline" style={{ padding: '8px', border: 'none' }}><Globe size={20} /></a>
            <a href="#" className="btn btn-outline" style={{ padding: '8px', border: 'none' }}><MessageCircle size={20} /></a>
          </div>
        </div>

        {/* Quick Links */}
        <div>
          <h4 style={{ marginBottom: '20px', fontWeight: 600 }}>Quick Links</h4>
          <ul style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <li><Link to="/" style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', textDecoration: 'none' }}>Home</Link></li>
            <li><Link to="/courses" style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', textDecoration: 'none' }}>All Courses</Link></li>
            <li><Link to="/about" style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', textDecoration: 'none' }}>About Us</Link></li>
            <li><Link to="/contact" style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', textDecoration: 'none' }}>Contact Support</Link></li>
          </ul>
        </div>

        {/* Legal */}
        <div>
          <h4 style={{ marginBottom: '20px', fontWeight: 600 }}>Legal & Rules</h4>
          <ul style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <li><Link to="/privacy" style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', textDecoration: 'none' }}>Privacy Policy</Link></li>
            <li><Link to="/refund" style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', textDecoration: 'none' }}>Refund Policy</Link></li>
            <li><a href="#" style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}>Terms of Service <ExternalLink size={12} /></a></li>
          </ul>
        </div>

        {/* Contact info */}
        <div>
          <h4 style={{ marginBottom: '20px', fontWeight: 600 }}>Get In Touch</h4>
          <ul style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <li style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
              <Mail size={16} className="text-primary" /> support@speedscript.com
            </li>
            <li style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
              <Phone size={16} className="text-secondary" /> +91 98765 43210
            </li>
            <li style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
              <MapPin size={16} className="text-primary" /> New Delhi, India
            </li>
          </ul>
        </div>

      </div>

      {/* Copyright */}
      <div style={{ marginTop: '60px', paddingTop: '20px', borderTop: '1px solid var(--border-color)', textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
        &copy; {currentYear} Speed Script Academy. All rights reserved. Made with ❤️ for Shorthand Students.
      </div>
    </footer>
  );
}
