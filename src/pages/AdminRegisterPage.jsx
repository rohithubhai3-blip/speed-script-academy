import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ShieldCheck, Eye, EyeOff } from 'lucide-react';
import { db } from '../data/db';
import useStore from '../store/useStore';

// Secret admin registration page — URL is NOT linked anywhere in the site.
// Access: /ssa-admin-init
// This page is intentionally invisible to normal users.
export default function AdminRegisterPage() {
  const [name, setName]         = useState('');
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [secretKey, setSecretKey] = useState('');
  const [showKey, setShowKey]   = useState(false);
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);
  const [success, setSuccess]   = useState(false);

  const login    = useStore(state => state.login);
  const navigate = useNavigate();
  const [params] = useSearchParams();

  // Extra protection: this page requires `?access=SSA` query param
  // If missing, show a 404-style page so phishing is harder
  const accessParam = params.get('access');
  if (accessParam !== 'SSA') {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flex: 1, padding: '40px' }}>
        <div style={{ textAlign: 'center' }}>
          <h2 style={{ fontSize: '2rem', marginBottom: '12px' }}>404</h2>
          <p style={{ color: 'var(--text-secondary)' }}>Page not found.</p>
        </div>
      </div>
    );
  }

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const user = await db.register(email, password, name, secretKey);
      if (user.role !== 'admin') {
        setError('Wrong secret key — account created as a regular user. Please use the correct key.');
        setLoading(false);
        return;
      }
      login(user);
      setSuccess(true);
      setTimeout(() => navigate('/admin'), 1500);
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flex: 1, padding: '40px 10px' }}>
      <form
        onSubmit={handleRegister}
        className="glass-panel"
        style={{ width: '100%', maxWidth: '420px', padding: '40px' }}
      >
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div style={{
            width: '56px', height: '56px', borderRadius: '50%', margin: '0 auto 14px',
            background: 'linear-gradient(135deg, var(--warning), var(--danger))',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <ShieldCheck size={28} color="white" />
          </div>
          <h2 style={{ fontSize: '1.6rem', marginBottom: '6px' }}>Admin Registration</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Restricted Access — Authorised Personnel Only</p>
        </div>

        {error && (
          <div style={{ background: 'rgba(225,29,72,0.12)', border: '1px solid var(--danger)', color: 'var(--danger)', padding: '10px 14px', borderRadius: 'var(--radius-sm)', marginBottom: '20px', fontSize: '0.88rem' }}>
            {error}
          </div>
        )}

        {success && (
          <div style={{ background: 'rgba(5,150,105,0.12)', border: '1px solid var(--success)', color: 'var(--success)', padding: '10px 14px', borderRadius: 'var(--radius-sm)', marginBottom: '20px', fontSize: '0.88rem', textAlign: 'center' }}>
            ✅ Admin created! Redirecting...
          </div>
        )}

        <div className="input-group">
          <label className="input-label">Full Name</label>
          <input type="text" required className="input-field" value={name} onChange={e => setName(e.target.value)} placeholder="Admin Name" />
        </div>

        <div className="input-group">
          <label className="input-label">Email</label>
          <input type="email" required className="input-field" value={email} onChange={e => setEmail(e.target.value)} placeholder="admin@example.com" />
        </div>

        <div className="input-group">
          <label className="input-label">Password</label>
          <input type="password" required className="input-field" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" minLength={8} />
        </div>

        <div className="input-group">
          <label className="input-label">Admin Secret Key</label>
          <div style={{ position: 'relative' }}>
            <input
              type={showKey ? 'text' : 'password'}
              required
              className="input-field"
              value={secretKey}
              onChange={e => setSecretKey(e.target.value)}
              placeholder="Enter admin secret key"
              style={{ paddingRight: '44px' }}
            />
            <button
              type="button"
              onClick={() => setShowKey(v => !v)}
              style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}
            >
              {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        <button type="submit" disabled={loading || success} className="btn btn-primary" style={{ width: '100%', marginTop: '8px', background: 'linear-gradient(135deg, var(--warning), var(--danger))' }}>
          {loading ? 'Creating Admin...' : 'Create Admin Account'}
        </button>
      </form>
    </div>
  );
}
