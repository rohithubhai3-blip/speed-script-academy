import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  LogOut, LayoutDashboard, FileText, Sun, Moon,
  BookOpen, Menu, X, User, Zap, Trophy
} from 'lucide-react';
import useStore from '../store/useStore';

export default function Navbar() {
  const { user, logout, theme, toggleTheme } = useStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
    setMenuOpen(false);
  };

  const isActive = (path) => location.pathname.startsWith(path);
  const closeMenu = () => setMenuOpen(false);

  return (
    <>
      <style>{`
        .navbar-wrapper {
          position: sticky;
          top: 16px;
          z-index: 50;
          padding: 0 20px;
          display: flex;
          justify-content: center;
        }
        .navbar {
          background: var(--glass-bg);
          backdrop-filter: blur(24px);
          -webkit-backdrop-filter: blur(24px);
          border: 1px solid var(--glass-border);
          border-radius: var(--radius-full);
          box-shadow: var(--shadow-drop);
          width: 100%;
          max-width: 1400px;
          transition: all 0.3s ease;
        }
        .navbar-inner {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0 24px;
          height: 64px;
          width: 100%;
        }
        .nav-logo {
          display: flex;
          align-items: center;
          gap: 10px;
          text-decoration: none;
          flex-shrink: 0;
        }
        .nav-logo-badge {
          background: linear-gradient(135deg, var(--primary), var(--secondary));
          padding: 7px 10px;
          border-radius: 8px;
          color: white;
          font-weight: 800;
          font-family: var(--font-heading);
          font-size: 0.85rem;
          letter-spacing: 0.5px;
        }
        .nav-logo-text {
          font-size: 1.15rem;
          font-family: var(--font-heading);
          font-weight: 700;
          letter-spacing: 0.3px;
          color: var(--text-primary);
        }
        @media (max-width: 540px) {
          .nav-logo-text { display: none; }
        }
        .desktop-nav-links {
          display: flex;
          align-items: center;
          gap: 6px;
        }
        @media (max-width: 768px) {
          .desktop-nav-links { display: none !important; }
          .navbar-inner { padding: 0 16px; }
        }
        .nav-link {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 7px 12px;
          border-radius: var(--radius-md);
          color: var(--text-secondary);
          font-weight: 500;
          font-size: 0.9rem;
          transition: all 0.18s ease;
          text-decoration: none;
        }
        .nav-link:hover { background: rgba(14,165,233,0.08); color: var(--primary); }
        .nav-link.active { background: rgba(14,165,233,0.1); color: var(--primary); }
        .nav-divider {
          width: 1px; height: 22px;
          background: var(--border-color);
          margin: 0 4px;
        }
        .user-chip {
          display: flex; align-items: center; gap: 7px;
          background: var(--bg-surface-elevated);
          padding: 5px 12px 5px 7px;
          border-radius: var(--radius-full);
          border: 1px solid var(--border-color);
          font-size: 0.82rem;
          font-weight: 600;
        }
        .user-avatar {
          width: 26px; height: 26px;
          border-radius: 50%;
          background: linear-gradient(135deg, var(--primary), var(--secondary));
          display: flex; align-items: center; justify-content: center;
          color: white; font-size: 0.7rem; font-weight: 700;
        }
        .icon-btn {
          width: 36px; height: 36px;
          border-radius: var(--radius-sm);
          border: 1px solid var(--border-color);
          background: transparent;
          display: flex; align-items: center; justify-content: center;
          cursor: pointer;
          color: var(--text-secondary);
          transition: all 0.18s;
        }
        .icon-btn:hover { background: rgba(14,165,233,0.08); color: var(--primary); border-color: var(--primary); }

        /* Mobile slide-down menu */
        .mobile-menu {
          position: fixed;
          top: 64px; left: 0; right: 0;
          background: var(--bg-surface);
          border-bottom: 1px solid var(--border-color);
          box-shadow: 0 8px 32px rgba(0,0,0,0.12);
          z-index: 49;
          animation: slideDown 0.22s ease;
          display: none;
        }
        .mobile-menu.open { display: block; }
        @media (min-width: 769px) { .mobile-menu { display: none !important; } }

        .mobile-menu-inner {
          padding: 12px 16px 20px;
          display: flex; flex-direction: column; gap: 4px;
        }
        .mobile-nav-link {
          display: flex; align-items: center; gap: 12px;
          padding: 12px 14px;
          border-radius: var(--radius-md);
          color: var(--text-secondary);
          font-weight: 500;
          font-size: 0.95rem;
          text-decoration: none;
          transition: all 0.15s;
        }
        .mobile-nav-link:hover, .mobile-nav-link.active {
          background: rgba(14,165,233,0.08);
          color: var(--primary);
        }
        .mobile-nav-link svg { flex-shrink: 0; }
        .mobile-menu-divider {
          height: 1px; background: var(--border-color);
          margin: 8px 0;
        }
        .hamburger-btn {
          display: none;
        }
        @media (max-width: 768px) {
          .hamburger-btn { display: flex; }
        }
      `}</style>

      <div className="navbar-wrapper">
        <nav className="navbar">
          <div className="navbar-inner">
            {/* LOGO */}
            <Link to="/" className="nav-logo" onClick={closeMenu}>
              <div className="nav-logo-badge">
                <Zap size={14} style={{ display: 'inline' }} /> SSA
              </div>
              <span className="nav-logo-text">Speed Script Academy</span>
            </Link>

            {/* DESKTOP LINKS */}
            <div className="desktop-nav-links">
              <Link to="/leaderboard" className={`nav-link ${isActive('/leaderboard') ? 'active' : ''}`}>Leaderboard</Link>
              <Link to="/about" className={`nav-link ${isActive('/about') ? 'active' : ''}`}>About</Link>
              <Link to="/contact" className={`nav-link ${isActive('/contact') ? 'active' : ''}`}>Contact</Link>

              {user ? (
              <>
                <Link to={user.role === 'admin' ? '/admin' : '/dashboard'}
                  className={`nav-link ${(isActive('/dashboard') || isActive('/admin')) ? 'active' : ''}`}>
                  <LayoutDashboard size={16} /> Dashboard
                </Link>

                {user.role !== 'admin' && (
                  <Link to="/courses" className={`nav-link ${isActive('/courses') ? 'active' : ''}`}>
                    <FileText size={16} /> Courses
                  </Link>
                )}

                <div className="nav-divider" />

                <div className="user-chip">
                  <div className="user-avatar">{user.name?.charAt(0).toUpperCase()}</div>
                  {user.name}
                  {user.role === 'admin' && (
                    <span style={{ fontSize: '0.65rem', background: 'var(--warning)', color: '#fff', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold' }}>ADMIN</span>
                  )}
                </div>

                <button onClick={toggleTheme} className="icon-btn" title="Toggle theme">
                  {theme === 'lite' ? <Moon size={16} /> : <Sun size={16} />}
                </button>

                <button onClick={handleLogout} className="icon-btn" title="Logout">
                  <LogOut size={16} />
                </button>
              </>
            ) : (
              <>
                <button onClick={toggleTheme} className="icon-btn" title="Toggle theme">
                  {theme === 'lite' ? <Moon size={16} /> : <Sun size={16} />}
                </button>
                <Link to="/login" className="btn btn-outline" style={{ padding: '7px 18px', fontSize: '0.88rem' }}>Login</Link>
                <Link to="/register" className="btn btn-primary" style={{ padding: '7px 18px', fontSize: '0.88rem' }}>Sign Up</Link>
              </>
            )}
          </div>

          {/* MOBILE: Theme + Hamburger */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button onClick={toggleTheme} className="icon-btn hamburger-btn" title="Toggle theme">
              {theme === 'lite' ? <Moon size={18} /> : <Sun size={18} />}
            </button>
            <button
              className="icon-btn hamburger-btn"
              onClick={() => setMenuOpen(o => !o)}
              aria-label="Toggle menu"
            >
              {menuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
          </div>
        </nav>
      </div>

      {/* MOBILE SLIDE-DOWN MENU */}
      <div className={`mobile-menu ${menuOpen ? 'open' : ''}`}>
        <div className="mobile-menu-inner">
          {user && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', background: 'var(--bg-surface-elevated)', borderRadius: 'var(--radius-md)', marginBottom: '4px' }}>
                <div className="user-avatar" style={{ width: 36, height: 36, fontSize: '0.9rem' }}>{user.name?.charAt(0).toUpperCase()}</div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{user.name}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{user.role === 'admin' ? '⚡ Admin' : 'Student'}</div>
                </div>
              </div>
              <div className="mobile-menu-divider" />
            </>
          )}

          <Link to="/leaderboard" className={`mobile-nav-link ${isActive('/leaderboard') ? 'active' : ''}`} onClick={closeMenu}>
            <Trophy size={18} /> Leaderboard
          </Link>
          <Link to="/about" className={`mobile-nav-link ${isActive('/about') ? 'active' : ''}`} onClick={closeMenu}>
            <User size={18} /> About
          </Link>
          <Link to="/contact" className={`mobile-nav-link ${isActive('/contact') ? 'active' : ''}`} onClick={closeMenu}>
            <FileText size={18} /> Contact
          </Link>

          {user ? (
            <>
              {/* User Identity Header */}
              <div style={{ padding: '16px 14px', background: 'rgba(14,165,233,0.04)', borderRadius: '12px', marginBottom: '8px' }}>
                <div style={{ fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {user.name} 
                  {user.role === 'admin' && <span style={{ fontSize: '0.6rem', background: 'var(--warning)', color: '#fff', padding: '1px 5px', borderRadius: '4px' }}>ADMIN</span>}
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '2px' }}>{user.email}</div>
              </div>

              <Link to={user.role === 'admin' ? '/admin' : '/dashboard'}
                className={`mobile-nav-link ${(isActive('/dashboard') || isActive('/admin')) ? 'active' : ''}`}
                onClick={closeMenu}>
                <LayoutDashboard size={18} /> Dashboard
              </Link>
              {user.role !== 'admin' && (
                <Link to="/courses" className={`mobile-nav-link ${isActive('/courses') ? 'active' : ''}`} onClick={closeMenu}>
                  <BookOpen size={18} /> Courses
                </Link>
              )}
              <div className="mobile-menu-divider" />
              <button className="mobile-nav-link" onClick={handleLogout} style={{ width: '100%', border: 'none', cursor: 'pointer', color: 'var(--danger)' }}>
                <LogOut size={18} /> Logout
              </button>
            </>
          ) : (
            <>
              <div className="mobile-menu-divider" />
              <Link to="/login" className="btn btn-outline" style={{ margin: '4px 0', justifyContent: 'center' }} onClick={closeMenu}>Login</Link>
              <Link to="/register" className="btn btn-primary" style={{ margin: '4px 0', justifyContent: 'center' }} onClick={closeMenu}>Sign Up Free</Link>
            </>
          )}
        </div>
      </div>
    </>
  );
}
