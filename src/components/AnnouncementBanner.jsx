import React, { useState, useEffect } from 'react';
import { X, Megaphone, Bell } from 'lucide-react';
import useStore from '../store/useStore';

const AnnouncementBanner = () => {
  const { user, announcement } = useStore();
  const [isVisible, setIsVisible] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const [progress, setProgress] = useState(100);

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
      return;
    }

    setIsVisible(true);
    setProgress(100);

    // Auto-hide timer
    const duration = (announcement.duration || 10) * 1000;
    const startTime = Date.now();
    
    const timer = setTimeout(() => {
      setIsVisible(false);
      setIsDismissed(true); // Don't show again this session
    }, duration);

    // Progress bar animation
    const progressInterval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, 100 - (elapsed / duration) * 100);
      setProgress(remaining);
      if (remaining === 0) clearInterval(progressInterval);
    }, 50);

    return () => {
      clearTimeout(timer);
      clearInterval(progressInterval);
    };
  }, [announcement, isDismissed, user]);

  if (!isVisible) return null;

  return (
    <div 
      className="announcement-popup-overlay"
      style={{
        position: 'fixed',
        top: '24px',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 10000,
        width: '90%',
        maxWidth: '500px',
        animation: 'popupEntrance 0.6s cubic-bezier(0.16, 1, 0.3, 1)'
      }}
    >
      <style>{`
        @keyframes popupEntrance {
          from { transform: translate(-50%, -100px) scale(0.9); opacity: 0; }
          to { transform: translate(-50%, 0) scale(1); opacity: 1; }
        }
        .announcement-card {
          background: rgba(15, 23, 42, 0.8);
          backdrop-filter: blur(16px) saturate(180%);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 16px;
          padding: 16px;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(14, 165, 233, 0.2);
          position: relative;
          overflow: hidden;
          color: white;
        }
        .progress-bar-container {
          position: absolute;
          bottom: 0;
          left: 0;
          width: 100%;
          height: 4px;
          background: rgba(255, 255, 255, 0.05);
        }
        .progress-bar-fill {
          height: 100%;
          background: linear-gradient(90deg, #0ea5e9, #6366f1);
          transition: width 0.05s linear;
        }
      `}</style>
      
      <div className="announcement-card">
        <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
          <div style={{ 
            background: 'linear-gradient(135deg, #0ea5e9, #6366f1)', 
            padding: '10px', 
            borderRadius: '12px',
            boxShadow: '0 4px 12px rgba(14, 165, 233, 0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Bell size={20} color="white" />
          </div>
          
          <div style={{ flex: 1 }}>
            <div style={{ 
              fontSize: '0.75rem', 
              textTransform: 'uppercase', 
              letterSpacing: '1px', 
              color: '#38bdf8',
              fontWeight: 700,
              marginBottom: '4px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <span>Annoucement</span>
              <span style={{ fontSize: '0.65rem', opacity: 0.6 }}>Auto-hiding...</span>
            </div>
            <div style={{ fontSize: '0.95rem', fontWeight: 500, lineHeight: 1.5, color: 'rgba(255, 255, 255, 0.9)' }}>
              {announcement.message}
            </div>
          </div>

          <button 
            onClick={() => setIsDismissed(true)}
            style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: 'none',
              color: 'white',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s'
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'}
          >
            <X size={18} />
          </button>
        </div>

        <div className="progress-bar-container">
          <div className="progress-bar-fill" style={{ width: `${progress}%` }} />
        </div>
      </div>
    </div>
  );
};

export default AnnouncementBanner;
