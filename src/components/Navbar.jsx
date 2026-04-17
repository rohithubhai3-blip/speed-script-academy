import { Link, useNavigate, useLocation } from 'react-router-dom';
import { LogOut, LayoutDashboard, FileText, Settings, User, Sun, Moon } from 'lucide-react';
import useStore from '../store/useStore';

export default function Navbar() {
  const { user, logout, theme, toggleTheme } = useStore();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isActive = (path) => location.pathname.startsWith(path);

  return (
    <nav className="glass-panel" style={{ borderRadius: 0, borderTop: 0, borderLeft: 0, borderRight: 0, padding: '16px 40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, zIndex: 50 }}>
      <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div style={{ background: 'linear-gradient(135deg, var(--primary), var(--secondary))', padding: '8px', borderRadius: '8px', color: 'white', fontWeight: 'bold' }}>
          SSA
        </div>
        <span style={{ fontSize: '1.25rem', fontFamily: 'var(--font-heading)', fontWeight: 700, letterSpacing: '0.5px' }}>
          Speed Script
        </span>
      </Link>

      <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
        <Link to="/about" style={{ color: isActive('/about') ? 'var(--primary)' : 'var(--text-secondary)', transition: 'color 0.2s', fontWeight: 500 }}>About</Link>
        <Link to="/contact" style={{ color: isActive('/contact') ? 'var(--primary)' : 'var(--text-secondary)', transition: 'color 0.2s', fontWeight: 500 }}>Contact</Link>
        
        {user ? (
          <>
            <Link to={user.role === 'admin' ? '/admin' : '/dashboard'} style={{ display: 'flex', alignItems: 'center', gap: '6px', color: isActive('/dashboard') || isActive('/admin') ? 'var(--primary)' : 'var(--text-secondary)', transition: 'color 0.2s', fontWeight: 500 }}>
              <LayoutDashboard size={18} />
              Dashboard
            </Link>
            
            {!isActive('/test') && (
              <Link to="/courses" style={{ display: 'flex', alignItems: 'center', gap: '6px', color: isActive('/courses') ? 'var(--primary)' : 'var(--text-secondary)', transition: 'color 0.2s', fontWeight: 500 }}>
                <FileText size={18} />
                Courses
              </Link>
            )}

            <div style={{ width: '1px', height: '24px', background: 'var(--border-color)', margin: '0 8px' }}></div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--bg-base)', padding: '6px 12px', borderRadius: 'var(--radius-full)', border: '1px solid var(--border-color)' }}>
                <User size={16} className="text-secondary" />
                <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>{user.name}</span>
                {user.role === 'admin' && <span style={{ fontSize: '0.7rem', background: 'var(--warning)', color: '#fff', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold' }}>ADMIN</span>}
              </div>

              <button onClick={toggleTheme} className="btn btn-outline" style={{ padding: '8px 12px', color: 'var(--primary)' }} title={`Switch to ${theme === 'lite' ? 'Dark' : 'Lite'} Mode`}>
                {theme === 'lite' ? <Moon size={18} /> : <Sun size={18} />}
              </button>

              <button onClick={handleLogout} className="btn btn-outline" style={{ padding: '8px 12px' }} title="Logout">
                <LogOut size={16} />
              </button>
            </div>
          </>
        ) : (
          <>
            <button onClick={toggleTheme} className="btn btn-outline" style={{ padding: '8px 12px', border: 'none' }}>
              {theme === 'lite' ? <Moon size={18} /> : <Sun size={18} />}
            </button>
            <Link to="/login" className="btn btn-outline" style={{ padding: '8px 20px' }}>Login</Link>
            <Link to="/register" className="btn btn-primary" style={{ padding: '8px 20px' }}>Sign Up</Link>
          </>
        )}
      </div>
    </nav>
  );
}
