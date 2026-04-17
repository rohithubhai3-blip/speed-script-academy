import React, { useState, useEffect } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import { db } from '../data/db';
import { Shield, FileText, Info, Loader2 } from 'lucide-react';

export default function InfoPage() {
  const { type } = useParams(); // 'about', 'privacy', 'refund'
  const location = useLocation();
  const [content, setContent] = useState(null);
  const [loading, setLoading] = useState(true);

  // Determine which content to show based on URL path if 'type' is not available
  // Paths: /about, /privacy, /refund
  const pathParts = location.pathname.split('/');
  const pathType = type || pathParts[pathParts.length - 1];

  useEffect(() => {
    const fetchContent = async () => {
      setLoading(true);
      const siteData = await db.getSiteContent();
      
      let pageData = null;
      if (pathType === 'about') pageData = { ...siteData.about, icon: <Info size={48} className="text-primary" /> };
      if (pathType === 'privacy') pageData = { ...siteData.privacy, icon: <Shield size={48} className="text-secondary" /> };
      if (pathType === 'refund') pageData = { ...siteData.refund, icon: <FileText size={48} className="text-primary" /> };

      setContent(pageData);
      setLoading(false);
      window.scrollTo(0, 0);
    };
    fetchContent();
  }, [pathType]);

  if (loading) {
    return (
      <div className="flex-center" style={{ minHeight: '80vh' }}>
        <Loader2 className="animate-spin text-primary" size={48} />
      </div>
    );
  }

  if (!content) {
    return (
      <div className="flex-center" style={{ minHeight: '80vh' }}>
        <div className="glass-panel text-center" style={{ padding: '40px' }}>
          <h2 style={{ marginBottom: '16px' }}>Page Not Found</h2>
          <p style={{ color: 'var(--text-muted)' }}>The page you are looking for does not exist.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container" style={{ paddingTop: '120px', paddingBottom: '80px', maxWidth: '800px' }}>
      <div className="glass-panel" style={{ padding: '60px 40px', marginBottom: '40px' }}>
        <div className="text-center" style={{ marginBottom: '40px' }}>
          <div style={{ marginBottom: '24px', display: 'inline-flex', padding: '20px', background: 'rgba(var(--primary-rgb), 0.1)', borderRadius: '50%' }}>
            {content.icon}
          </div>
          <h1 style={{ fontSize: '3rem', marginBottom: '16px', fontFamily: 'var(--font-heading)' }}>{content.title}</h1>
          <div className="divider" style={{ margin: '0 auto' }}></div>
        </div>
        
        <div style={{ 
          textAlign: 'left', 
          lineHeight: 1.8, 
          fontSize: '1.1rem', 
          color: 'var(--text-secondary)',
          whiteSpace: 'pre-line' 
        }}>
          {content.content}
        </div>
      </div>

      <div className="text-center">
        <p style={{ color: 'var(--text-muted)' }}>
          Last updated: {new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
      </div>
    </div>
  );
}
