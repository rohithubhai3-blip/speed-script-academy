import React, { useEffect } from 'react';
import useStore from '../store/useStore';
import { X, AlertCircle } from 'lucide-react';

export default function GlobalModal() {
  const { modal, hideModal } = useStore();
  const [inputValue, setInputValue] = React.useState('');

  useEffect(() => {
    if (modal?.defaultValue !== undefined) {
      setInputValue(modal.defaultValue);
    } else {
      setInputValue('');
    }
  }, [modal]);

  // Close on ESC key
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') hideModal();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [hideModal]);

  if (!modal) return null;

  const { title, message, onConfirm, onCancel, confirmText = 'Confirm', cancelText = 'Cancel', type = 'info', showInput = false, placeholder = '' } = modal;

  const handleConfirm = () => {
    if (onConfirm) onConfirm(showInput ? inputValue : true);
    hideModal();
  };

  const handleCancel = () => {
    if (onCancel) onCancel();
    hideModal();
  };

  return (
    <div className="premium-modal-overlay" onClick={hideModal}>
      <div 
        className="premium-modal-box" 
        onClick={(e) => e.stopPropagation()}
      >
        <button 
          onClick={hideModal}
          style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--text-muted)',
            transition: 'color 0.2s'
          }}
          onMouseOver={(e) => e.currentTarget.style.color = 'var(--text-primary)'}
          onMouseOut={(e) => e.currentTarget.style.color = 'var(--text-muted)'}
        >
          <X size={24} />
        </button>

        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '20px',
            background: type === 'danger' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(59, 130, 246, 0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 24px auto',
            color: type === 'danger' ? 'var(--danger)' : 'var(--primary)',
            border: '1px solid rgba(255,255,255,0.05)'
          }}>
            <AlertCircle size={32} />
          </div>

          <h3 style={{ fontSize: '1.5rem', marginBottom: '12px', color: 'var(--text-primary)' }}>{title}</h3>
          <div style={{ color: 'var(--text-secondary)', lineHeight: '1.6', marginBottom: '32px', fontSize: '1rem' }}>
            {message}
          </div>

          {showInput && (
            <div className="input-group" style={{ marginBottom: '32px', textAlign: 'left' }}>
              <input 
                type="text" 
                className="input-field" 
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder={placeholder}
                autoFocus
                onKeyDown={(e) => e.key === 'Enter' && handleConfirm()}
              />
            </div>
          )}

          <div style={{ display: 'flex', gap: '12px' }}>
            {onCancel !== undefined || cancelText ? (
              <button 
                className="btn btn-outline" 
                onClick={handleCancel}
                style={{ flex: 1, padding: '14px', borderRadius: '14px' }}
              >
                {cancelText}
              </button>
            ) : null}
            <button 
              className="btn btn-primary" 
              onClick={handleConfirm}
              style={{ 
                flex: 1, 
                padding: '14px', 
                borderRadius: '14px',
                background: type === 'danger' ? 'var(--danger)' : undefined,
                boxShadow: type === 'danger' ? '0 8px 24px rgba(239, 68, 68, 0.2)' : undefined
              }}
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
