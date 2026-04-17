import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { db } from '../data/db';
import useStore from '../store/useStore';

export default function RegisterPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [secretKey, setSecretKey] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const login = useStore(state => state.login);
  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const user = await db.register(email, password, name, secretKey);
      login(user);
      navigate(user.role === 'admin' ? '/admin' : '/dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flex: 1, padding: '40px 10px' }}>
      <form onSubmit={handleRegister} className="glass-panel" style={{ width: '100%', maxWidth: '420px', padding: '40px' }}>
        <h2 style={{ fontSize: '2rem', marginBottom: '8px', textAlign: 'center' }}>Create Account</h2>
        <p style={{ color: 'var(--text-secondary)', textAlign: 'center', marginBottom: '24px' }}>Join Speed Script Academy today</p>
        
        {error && <div style={{ background: 'var(--danger)', color: 'white', padding: '10px', borderRadius: 'var(--radius-sm)', marginBottom: '20px', fontSize: '0.9rem', textAlign: 'center' }}>{error}</div>}

        <div className="input-group">
          <label className="input-label">Full Name</label>
          <input type="text" required className="input-field" value={name} onChange={(e) => setName(e.target.value)} placeholder="John Doe" />
        </div>

        <div className="input-group">
          <label className="input-label">Email</label>
          <input type="email" required className="input-field" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@example.com" />
        </div>

        <div className="input-group">
          <label className="input-label">Password</label>
          <input type="password" required className="input-field" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" minLength={6} />
        </div>

        {/* Optional Admin Key */}
        <div className="input-group">
          <label className="input-label">Admin Secret Key (Optional)</label>
          <input type="password" className="input-field" value={secretKey} onChange={(e) => setSecretKey(e.target.value)} placeholder="Only for administrators" />
        </div>

        <button type="submit" disabled={loading} className="btn btn-primary" style={{ width: '100%' }}>
          {loading ? 'Creating...' : 'Sign Up'}
        </button>

        <p style={{ textAlign: 'center', marginTop: '24px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
          Already have an account? <Link to="/login" style={{ color: 'var(--primary)', fontWeight: 500 }}>Log in</Link>
        </p>
      </form>
    </div>
  );
}
