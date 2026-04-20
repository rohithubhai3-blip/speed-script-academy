import React from 'react';
import useStore from '../store/useStore';
import { CheckCircle, XCircle, AlertCircle, Info, X } from 'lucide-react';

export default function ToastContainer() {
  const { toasts, removeToast } = useStore();

  if (toasts.length === 0) return null;

  return (
    <div className="premium-toast-container">
      {toasts.map((toast) => (
        <div key={toast.id} className={`premium-toast-item ${toast.type}`}>
          <div className="toast-icon">
            {toast.type === 'success' && <CheckCircle size={20} color="var(--success)" />}
            {toast.type === 'error' && <XCircle size={20} color="var(--danger)" />}
            {toast.type === 'warning' && <AlertCircle size={20} color="var(--warning)" />}
            {toast.type === 'info' && <Info size={20} color="var(--primary)" />}
          </div>
          <div className="toast-content">
            <p style={{ margin: 0, fontSize: '0.88rem', fontWeight: 500, color: 'var(--text-primary)' }}>
              {toast.message}
            </p>
          </div>
          <button 
            onClick={() => removeToast(toast.id)}
            style={{
              background: 'none',
              border: 'none',
              padding: '4px',
              cursor: 'pointer',
              color: 'var(--text-muted)',
              display: 'flex',
              marginLeft: 'auto'
            }}
          >
            <X size={16} />
          </button>
        </div>
      ))}
    </div>
  );
}
