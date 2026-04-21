import React, { useState, useEffect } from 'react';
import { Bell, X, Megaphone } from 'lucide-react';
import useStore from '../store/useStore';

const AnnouncementBanner = () => {
  const { user, announcement } = useStore();
  const [isVisible, setIsVisible] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    if (!announcement || !announcement.message || isDismissed || !user) {
      setIsVisible(false);
      return;
    }

    // Check expiry
    const now = new Date();
    const expiry = announcement.expiresAt ? new Date(announcement.expiresAt) : null;

    if (expiry && now > expiry) {
      setIsVisible(false);
    } else {
      setIsVisible(true);
    }
  }, [announcement, isDismissed, user]);

  if (!isVisible) return null;

  return (
    <div 
      className="announcement-banner"
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 1000,
        width: '100%',
        padding: '12px 24px',
        background: 'linear-gradient(135deg, rgba(14, 165, 233, 0.9), rgba(99, 102, 241, 0.9))',
        backdropFilter: 'blur(10px)',
        color: 'white',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: '0 4px 15px rgba(0, 0, 0, 0.1)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
        animation: 'slideDown 0.5s ease-out'
      }}
    >
      <style>{`
        @keyframes slideDown {
          from { transform: translateY(-100%); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
      
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', maxWidth: '1200px', width: '100%' }}>
        <div style={{ 
          background: 'rgba(255, 255, 255, 0.2)', 
          padding: '8px', 
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <Megaphone size={18} />
        </div>
        
        <div style={{ flex: 1, fontWeight: 600, fontSize: '0.95rem', lineHeight: 1.4 }}>
          {announcement.message}
        </div>

        <button 
          onClick={() => setIsDismissed(true)}
          style={{
            background: 'none',
            border: 'none',
            color: 'rgba(255, 255, 255, 0.8)',
            cursor: 'pointer',
            padding: '4px',
            borderRadius: '40px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s'
          }}
          onMouseEnter={e => e.currentTarget.style.color = 'white'}
          onMouseLeave={e => e.currentTarget.style.color = 'rgba(255, 255, 255, 0.8)'}
        >
          <X size={20} />
        </button>
      </div>
    </div>
  );
};

export default AnnouncementBanner;
