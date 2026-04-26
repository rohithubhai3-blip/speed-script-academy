import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import AdminRegisterPage from './pages/AdminRegisterPage';
import DashboardPage from './pages/DashboardPage';
import MyResultsPage from './pages/MyResultsPage';
import CoursesPage from './pages/CoursesPage';
import AdminDashboard from './pages/AdminDashboard';
import TestPage from './pages/TestPage';
import CheckoutPage from './pages/CheckoutPage';
import LeaderboardPage from './pages/LeaderboardPage';
import InfoPage from './pages/InfoPage';
import ContactPage from './pages/ContactPage';
import Footer from './components/Footer';
import useStore from './store/useStore';
import ErrorBoundary from './components/ErrorBoundary';
import ToastContainer from './components/ToastContainer';
import ModalContainer from './components/ModalContainer';
import AnnouncementBanner from './components/AnnouncementBanner';
import { db, warmupServer } from './services/api';

// Protected Route Component — now checks authVerified flag
const ProtectedRoute = ({ children, requireAdmin = false }) => {
  const user = useStore(state => state.user);
  const authVerified = useStore(state => state.authVerified);
  
  // While verification is in progress, show a loading state
  if (!authVerified) {
    return (
      <div style={{ padding: '100px 20px', textAlign: 'center', minHeight: '60vh', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <h3 className="animate-pulse">Verifying your session...</h3>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  if (requireAdmin && user.role !== 'admin') return <Navigate to="/dashboard" replace />;
  
  return children;
};

function App() {
  const theme = useStore(state => state.theme);
  const user = useStore(state => state.user);
  const setAnnouncement = useStore(state => state.setAnnouncement);
  const logout = useStore(state => state.logout);
  const setAuthVerified = useStore(state => state.setAuthVerified);
  const updateUser = useStore(state => state.updateUser);

  // ── TOKEN VERIFICATION on app startup ──
  // Prevents fake localStorage injection (e.g. console hacking)
  useEffect(() => {
    const verifyAuth = async () => {
      const storedUser = JSON.parse(localStorage.getItem('ssa_user'));
      if (!storedUser || !storedUser.token) {
        // No stored user or no token — nothing to verify
        setAuthVerified(true);
        return;
      }

      try {
        // Call backend to verify the token is real and get fresh user data
        const freshUser = await db.getMe();
        // Token is valid — update store with fresh server data (keeps token)
        updateUser({ ...freshUser, token: storedUser.token });
        setAuthVerified(true);
      } catch (err) {
        // Token is fake/expired/invalid → force logout
        console.warn('[AUTH] Token verification failed. Logging out.', err.message);
        logout();
        setAuthVerified(true);
      }
    };
    verifyAuth();
  }, []);

  useEffect(() => {
    const fetchAnnouncement = async () => {
      try {
        const settings = await db.getGlobalSettings();
        if (settings) {
          setAnnouncement({
            message: settings.announcementMessage || '',
            expiresAt: settings.announcementExpiresAt || null,
            duration: settings.announcementDuration || 10
          });
        }
      } catch (err) {
        console.error("Failed to fetch settings:", err);
      }
    };
    fetchAnnouncement();
  }, [setAnnouncement]);

  useEffect(() => {
    if (theme === 'dark') {
      document.body.classList.add('dark');
    } else {
      document.body.classList.remove('dark');
    }
  }, [theme]);

  // Warm up the backend serverless function immediately on app load
  // so that when user navigates to Dashboard/Courses it loads instantly
  useEffect(() => {
    warmupServer();
  }, []);

  return (
    <Router>
      <ErrorBoundary>
        <ToastContainer />
        <ModalContainer />
        <AnnouncementBanner />
        <div className="app-container">
          <div className="main-content">
            <Navbar />
            <div className="page-container" style={{ display: 'flex', flexDirection: 'column' }}>
              <Routes>
                <Route path="/" element={<LandingPage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
                {/* Secret admin registration — not linked anywhere public */}
                <Route path="/ssa-admin-init" element={<AdminRegisterPage />} />
                
                <Route path="/dashboard" element={
                  <ProtectedRoute>
                    <DashboardPage />
                  </ProtectedRoute>
                } />

                <Route path="/my-results" element={
                  <ProtectedRoute>
                    <MyResultsPage />
                  </ProtectedRoute>
                } />

                <Route path="/courses" element={
                  <ProtectedRoute>
                    <CoursesPage />
                  </ProtectedRoute>
                } />

                <Route path="/leaderboard" element={
                  <LeaderboardPage />
                } />

                <Route path="/checkout/:courseId" element={
                  <ProtectedRoute>
                    <CheckoutPage />
                  </ProtectedRoute>
                } />

                <Route path="/test/:courseId/:levelId/:lessonId" element={
                  <ProtectedRoute>
                    <TestPage />
                  </ProtectedRoute>
                } />

                <Route path="/admin" element={
                  <ProtectedRoute requireAdmin={true}>
                    <AdminDashboard />
                  </ProtectedRoute>
                } />

                {/* Info Pages */}
                <Route path="/about" element={<InfoPage />} />
                <Route path="/contact" element={<ContactPage />} />
                <Route path="/privacy" element={<InfoPage />} />
                <Route path="/refund" element={<InfoPage />} />
              </Routes>
              <Footer />
            </div>
          </div>
        </div>
      </ErrorBoundary>
    </Router>
  );
}

export default App;
