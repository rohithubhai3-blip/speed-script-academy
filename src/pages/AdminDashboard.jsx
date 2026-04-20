import { useEffect, useState } from 'react';
import { db } from '../data/db';
import api from '../services/api';
import axios from 'axios';
import { Users, FileDiff, Server, Plus, List, Settings, Edit3, Eye, Upload, QrCode, CheckCircle2, MessageSquare, Loader2, Trash2, ShieldCheck, X, Key, Lock, PlayCircle, Zap, Activity } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('overview'); // overview | users | courses
  const navigate = useNavigate();

  const [users, setUsers] = useState([]);
  const [attempts, setAttempts] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [globalSettings, setGlobalSettings] = useState({ upiId: '', whatsappNumber: '', qrCodeUrl: '' });
  const [pendingRequests, setPendingRequests] = useState([]);
  const [siteContent, setSiteContent] = useState(null);
  const [approvalDurations, setApprovalDurations] = useState({}); // reqId -> durationDays

  // Forms states
  const [newUser, setNewUser] = useState({ name: '', email: '', password: '', role: 'user' });
  
  const [editingCourseId, setEditingCourseId] = useState(null);
  const [newCourse, setNewCourse] = useState({ title: '', description: '', price: 0, status: 'Upcoming', thumbnailUrl: '', stats: { attemptsCount: 0, uniqueStudentsCount: 0, totalWPM: 0, totalAccuracy: 0 } });
  const [thumbnailUploading, setThumbnailUploading] = useState(false);

  // User Management State
  const [selectedUserForAccess, setSelectedUserForAccess] = useState(null);
  const [userCourseAccess, setUserCourseAccess] = useState([]); // [{courseId, expiresAt}]
  const [accessGrantCourseId, setAccessGrantCourseId] = useState('');
  const [accessGrantDays, setAccessGrantDays] = useState('lifetime'); // 'lifetime' | '30' | '90' | '180' | '365'
  const [userAccessForm, setUserAccessForm] = useState([]); // legacy fallback

  const [selectedUserForPasswordReset, setSelectedUserForPasswordReset] = useState(null);
  const [newPasswordValue, setNewPasswordValue] = useState('');
  
  const [editingLessonConfig, setEditingLessonConfig] = useState(null); // {courseId, levelId, lessonId}
  
  const [activeCourseIdForLesson, setActiveCourseIdForLesson] = useState('');
  const [activeLevelIdForLesson, setActiveLevelIdForLesson] = useState('level-normal');
  const [newLesson, setNewLesson] = useState({
    title: '', 
    timeLimit: '00:05:00',
    passage: '', 
    mediaUrl: '', 
    mediaType: 'audio',
    allowedErrorPercent: 5, 
    capRule: 'Ignore', 
    punctRule: 'Ignore', 
    similarWordRule: 'Allow (Half Mistake)',
    baseWpm: 80,
    isBackspaceAllowed: false,
    halfMistakeAllowed: true,
    fullMistakeAllowed: true
  });

  const [promos, setPromos] = useState([]);

  const loadData = async () => {
    try {
      setLoading(true);
      // Fire ALL requests in parallel — 6× faster than sequential awaits
      const [u, a, c, p, s, r, sc] = await Promise.all([
        db.getAllUsers(),
        db.getAllAttempts(),
        db.getCourses(),
        db.getPromos(),
        db.getGlobalSettings(),
        db.getPendingRequests(),
        db.getSiteContent(),
      ]);
      setUsers(u);
      setAttempts(a);
      setCourses(c);
      setPromos(p);
      setGlobalSettings(s);
      setPendingRequests(r);
      setSiteContent(sc);
    } catch (err) {
      console.error("Dashboard data load failed:", err);
    } finally {
      setLoading(false);
    }
  };


  useEffect(() => { loadData(); }, []);

  // Handlers
  const handleCreateUser = async (e) => {
    e.preventDefault();
    try {
      await db.adminCreateUser(newUser.email, newUser.password, newUser.name, newUser.role);
      alert("User created successfully!");
      setNewUser({ name: '', email: '', password: '', role: 'user' });
      loadData();
    } catch (err) { alert(err.message); }
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm("Are you sure you want to delete this user? This action cannot be undone.")) return;
    try {
      await db.deleteUser(userId);
      alert("User deleted successfully!");
      loadData();
    } catch (err) { alert(err.message); }
  };

  const openAccessModal = (user) => {
    setSelectedUserForAccess(user);
    // Build unified access list from courseAccess (new) + purchasedCourses (legacy)
    const existing = user.courseAccess?.length > 0
      ? user.courseAccess
      : (user.purchasedCourses || []).map(id => ({ courseId: id, expiresAt: null }));
    setUserCourseAccess(existing);
    setAccessGrantCourseId('');
    setAccessGrantDays('lifetime');
  };

  const handleGrantAccess = async () => {
    if (!accessGrantCourseId) return alert('Please select a course first.');
    // Build expiresAt from duration
    let expiresAt = null;
    if (accessGrantDays !== 'lifetime') {
      const d = new Date();
      d.setDate(d.getDate() + parseInt(accessGrantDays));
      expiresAt = d.toISOString();
    }
    // Remove existing entry for same course (will re-add with new expiry)
    const filtered = userCourseAccess.filter(a => a.courseId !== accessGrantCourseId);
    const updated = [...filtered, { courseId: accessGrantCourseId, expiresAt }];
    setUserCourseAccess(updated);
    try {
      await db.updateUserAccess(selectedUserForAccess._id || selectedUserForAccess.id, updated);
      alert('✅ Access granted!');
      loadData();
    } catch (err) { alert(err.message); }
  };

  const handleRevokeAccess = async (courseId) => {
    if (!window.confirm('Remove this course from the user?')) return;
    const updated = userCourseAccess.filter(a => a.courseId !== courseId);
    setUserCourseAccess(updated);
    try {
      await db.updateUserAccess(selectedUserForAccess._id || selectedUserForAccess.id, updated);
      alert('Course access revoked.');
      loadData();
    } catch (err) { alert(err.message); }
  };

  const openResetModal = (user) => {
    setSelectedUserForPasswordReset(user);
    setNewPasswordValue('');
  };

  const handleUpdateAccess = async () => {
    try {
      await db.updateUserAccess(selectedUserForAccess._id || selectedUserForAccess.id, userAccessForm);
      alert("User access updated successfully!");
      setSelectedUserForAccess(null);
      loadData();
    } catch (err) { alert(err.message); }
  };

  const toggleCourseInAccessForm = (courseId) => {
    setUserAccessForm(prev => 
      prev.includes(courseId) ? prev.filter(id => id !== courseId) : [...prev, courseId]
    );
  };

  const handleResetPasswordFinal = async () => {
    if (!newPasswordValue || newPasswordValue.length < 6) {
       return alert("Password must be at least 6 characters.");
    }
    try {
       await db.resetUserPassword(selectedUserForPasswordReset._id || selectedUserForPasswordReset.id, newPasswordValue);
       alert("Password reset successfully! 🔐");
       setSelectedUserForPasswordReset(null);
    } catch (err) { alert(err.message); }
  };

  const handleImpersonate = async (userId) => {
    if (!window.confirm("Log into this user's account? Your current session will be replaced.")) return;
    try {
      const response = await api.post(`/auth/impersonate/${userId}`);
      if (response.data.token) {
        // Update local storage using the correct app key: ssa_user
        // The store reads from 'ssa_user', so we must save the full response there.
        localStorage.setItem('ssa_user', JSON.stringify(response.data));
        
        // Force refresh to reload the entire app with the new user session
        window.location.href = '/dashboard';
      }
    } catch (err) {
      alert("Impersonation failed: " + (err.response?.data?.message || err.message));
    }
  };



  const handleDeleteLesson = async (courseId, levelId, lessonId) => {
    if (!window.confirm("Are you sure you want to permanently delete this lesson? This cannot be undone.")) return;
    try {
      await db.deleteLesson(courseId, levelId, lessonId);
      alert("Lesson deleted successfully!");
      loadData();
    } catch (err) {
      alert("Failed to delete lesson: " + err.message);
    }
  };

  const handleLaunchCourse = async (course) => {
    const isFree = window.confirm(`Launch "${course.title}" for FREE? (Click OK for Free, Cancel to set a Price)`);
    let price = 0;
    if (!isFree) {
      const p = window.prompt(`Enter price for "${course.title}":`, "499");
      if (p === null) return; // cancelled
      price = parseInt(p, 10);
      if (isNaN(price) || price < 0) return alert("Invalid price");
    }

    if (!window.confirm(`Are you sure you want to launch it as ${isFree ? 'FREE' : '₹'+price}? All enrolled users will ${isFree ? 'get immediate access' : 'be notified to pay'}.`)) return;

    try {
      await db.launchCourse(course.id, isFree, price);
      alert(`Course launched successfully as ${isFree ? 'FREE' : '₹'+price}!`);
      loadData();
    } catch (err) {
      alert("Launch failed: " + err.message);
    }
  };

  const handleSaveCourse = async (e) => {
    e.preventDefault();

    try {
      if (editingCourseId) {
        await db.editCourse(editingCourseId, newCourse);
        alert("Course updated!");
      } else {
        const courseWithId = { 
          ...newCourse, 
          id: newCourse.title.toLowerCase().replace(/\s+/g, '-') + '-' + Math.random().toString(36).substring(7),
          levels: [
            { id: 'level-normal', title: 'Normal', lessons: [] },
            { id: 'level-inter', title: 'Intermediate', lessons: [] },
            { id: 'level-adv', title: 'Advanced', lessons: [] }
          ]
        };
        await db.addCourse(courseWithId);
        alert("Course created successfully!");
      }
      setEditingCourseId(null);
      setNewCourse({ title: '', description: '', price: 0, status: 'Upcoming', thumbnailUrl: '', stats: { attemptsCount: 0, uniqueStudentsCount: 0, totalWPM: 0, totalAccuracy: 0 } });
      loadData();
    } catch (err) { alert(err.message); }
  };

  const handleThumbnailUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      setThumbnailUploading(true);
      const cloudName = 'dnnczci7d';
      const uploadPreset = 'ssastorage';
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', uploadPreset);
      const response = await axios.post(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, formData);
      if (response.data.secure_url) {
        setNewCourse(prev => ({ ...prev, thumbnailUrl: response.data.secure_url }));
        alert('Thumbnail uploaded! ✅');
      }
    } catch (err) {
      alert('Thumbnail upload failed: ' + err.message);
    } finally {
      setThumbnailUploading(false);
    }
  };

  const handleDeleteCourse = async (courseId) => {
    if (!window.confirm("Are you sure you want to delete this course and all its lessons?")) return;
    try {
      await db.deleteCourse(courseId);
      alert("Course deleted successfully!");
      loadData();
    } catch (err) { alert(err.message); }
  };

  const startEditCourse = (c) => {
    setEditingCourseId(c.id);
    setNewCourse({ 
      title: c.title, 
      description: c.description || '', 
      price: c.price || 0, 
      thumbnailUrl: c.thumbnailUrl || '',
      status: c.status || 'Active',
      stats: c.stats || { attemptsCount: 0, uniqueStudentsCount: 0, totalWPM: 0, totalAccuracy: 0 }
    });
  };

  const handleGeneratePromo = async (courseId) => {
    if(!courseId) return alert("Select a course first.");
    try {
      const code = await db.generatePromoCode(courseId);
      alert(`Code Generated: ${code}`);
      loadData();
    } catch (err) { alert(err.message); }
  };

  const startEditLesson = (courseId, levelId, lesson) => {
    setEditingLessonConfig({ courseId, levelId, lessonId: lesson.id });
    setActiveCourseIdForLesson(courseId);
    setActiveLevelIdForLesson(levelId);
    setNewLesson({
      title: lesson.title || '',
      passage: lesson.passage || '',
      timeLimit: lesson.timeLimit || '00:05:00',
      mediaUrl: lesson.mediaUrl || lesson.audioUrl || '',
      mediaType: lesson.mediaType || 'audio',
      allowedErrorPercent: lesson.allowedErrorPercent ?? 5,
      capRule: lesson.capRule || 'Ignore',
      punctRule: lesson.punctRule || 'Ignore',
      similarWordRule: lesson.similarWordRule || 'Strict',
      baseWpm: lesson.baseWpm || 80,
      isBackspaceAllowed: lesson.isBackspaceAllowed || false,
      halfMistakeAllowed: lesson.halfMistakeAllowed !== false,
      fullMistakeAllowed: lesson.fullMistakeAllowed !== false
    });
  };

  const handleUpdateSettings = async (e) => {
    e.preventDefault();
    try {
      await db.updateGlobalSettings(globalSettings);
      alert("Payment settings updated!");
      loadData();
    } catch (err) { alert(err.message); }
  };

  const handleApproveRequest = async (reqId, userId, courseId) => {
    try {
      const durationDays = approvalDurations[reqId] ?? 0; // 0 = lifetime
      await db.purchaseCourse(reqId, userId, courseId, durationDays);
      alert(`Course approved! Access granted ${durationDays > 0 ? `for ${durationDays} days` : 'for lifetime'}.`);
      loadData();
    } catch (err) { alert(err.message); }
  };

  const handleQRUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setGlobalSettings({ ...globalSettings, qrCodeUrl: reader.result });
    };
    reader.readAsDataURL(file);
  };

  const handleUpdateSiteContent = async (e) => {
    e?.preventDefault();
    try {
      await db.updateSiteContent(siteContent);
      alert("Site content updated successfully!");
      loadData();
    } catch (err) { alert(err.message); }
  };

  const handleSaveTest = async (e) => {
    e.preventDefault();
    try {
      if(!activeCourseIdForLesson) return alert("Select a course first.");
      
      const isPermanent = e.nativeEvent.submitter?.innerText.toLowerCase().includes('permanent');
      
      if (editingLessonConfig) {
        await db.editLesson(editingLessonConfig.courseId, editingLessonConfig.levelId, editingLessonConfig.lessonId, newLesson);
        alert(isPermanent ? "Test Updated and Saved Permanently!" : "Test Updated!");
      } else {
        // Fix: Generate unique ID for the lesson to prevent 500 error
        const lessonWithId = {
          ...newLesson,
          audioUrl: newLesson.mediaUrl, // Sync for legacy support
          id: newLesson.title.toLowerCase().replace(/\s+/g, '-') + '-' + Date.now().toString(36)
        };
        await db.addLesson(activeCourseIdForLesson, activeLevelIdForLesson, lessonWithId);
        alert(isPermanent ? "Test Created and Saved Permanently to Database!" : "Test Created and Saved Successfully!");
      }

      setEditingLessonConfig(null);
      setNewLesson({ 
        title: '', 
        timeLimit: '00:05:00', 
        passage: '', 
        mediaUrl: '', 
        mediaType: 'audio', 
        allowedErrorPercent: 5, 
        capRule: 'Ignore', 
        punctRule: 'Ignore', 
        similarWordRule: 'Allow (Half Mistake)',
        baseWpm: 80,
        isBackspaceAllowed: false,
        halfMistakeAllowed: true,
        fullMistakeAllowed: true
      });
      loadData();
    } catch (err) { 
      alert(err.message); 
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      setIsUploading(true);
      setUploadProgress(0);

      // --- THE SILVER BULLET FIX (Unsigned Cloudinary Upload) ---
      const cloudName = 'dnnczci7d'; 
      const uploadPreset = 'ssastorage'; 

      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', uploadPreset);

      // Upload DIRECTLY from the browser to Cloudinary
      const response = await axios.post(
        `https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`,
        formData,
        {
          onUploadProgress: (progressEvent) => {
            const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setUploadProgress(percentCompleted);
          }
        }
      );

      const result = response.data;
      
      if (result.secure_url) {
        setNewLesson(prev => ({ ...prev, mediaUrl: result.secure_url }));
        alert("Audio Uploaded Successfully! (Live on Cloud) 🚀");
      } else {
        throw new Error("Upload failed: No URL returned");
      }
    } catch (err) {
      console.error("Cloud Upload Failed:", err);
      alert("Cloud Upload Failed: " + (err.response?.data?.error?.message || err.message));
    } finally {
      setIsUploading(false);
    }
  };

  if (loading) return (
    <div style={{ padding: '8px 0' }}>
      <style>{`@keyframes shimmer { 0%,100%{opacity:1} 50%{opacity:0.45} }`}</style>
      {/* Title skeleton */}
      <div style={{ height: '40px', width: '280px', background: 'rgba(148,163,184,0.15)', borderRadius: '10px', marginBottom: '12px', animation: 'shimmer 1.5s ease-in-out infinite' }} />
      <div style={{ height: '16px', width: '200px', background: 'rgba(148,163,184,0.1)', borderRadius: '6px', marginBottom: '28px', animation: 'shimmer 1.5s ease-in-out infinite 0.15s' }} />
      {/* Tabs skeleton */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '32px' }}>
        {[120, 140, 180, 130, 160, 180, 150].map((w, i) => (
          <div key={i} style={{ height: '40px', width: `${w}px`, background: 'rgba(148,163,184,0.15)', borderRadius: '8px', animation: `shimmer 1.5s ease-in-out infinite ${i * 0.08}s` }} />
        ))}
      </div>
      {/* Stats cards skeleton */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginBottom: '32px' }}>
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="glass-panel" style={{ padding: '24px', animation: `shimmer 1.5s ease-in-out infinite ${i * 0.1}s` }}>
            <div style={{ height: '16px', width: '60%', background: 'rgba(148,163,184,0.15)', borderRadius: '6px', marginBottom: '16px' }} />
            <div style={{ height: '40px', width: '40%', background: 'rgba(148,163,184,0.2)', borderRadius: '8px' }} />
          </div>
        ))}
      </div>
    </div>
  );


  return (
    <div>
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '2.5rem', marginBottom: '8px' }}>Admin Dashboard</h1>
        
        {/* TABS */}
        <div style={{ display: 'flex', gap: '16px', marginTop: '24px' }}>
          <button className={`btn ${activeTab === 'overview' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setActiveTab('overview')}>
            <List size={18} /> Overview
          </button>
          <button className={`btn ${activeTab === 'users' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setActiveTab('users')}>
            <Users size={18} /> Manage Users
          </button>
          <button className={`btn ${activeTab === 'courses' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setActiveTab('courses')}>
            <Settings size={18} /> Course & Test Builder
          </button>
           <button className={`btn ${activeTab === 'promos' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setActiveTab('promos')}>
            <Settings size={18} /> Promo Codes
          </button>
          <button className={`btn ${activeTab === 'payments' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setActiveTab('payments')}>
            <QrCode size={18} /> Payment Settings
          </button>
          <button className={`btn ${activeTab === 'approvals' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setActiveTab('approvals')}>
            <CheckCircle2 size={18} /> Manual Approvals {pendingRequests.length > 0 && <span style={{ background: 'var(--danger)', color: 'white', padding: '2px 6px', borderRadius: '50%', fontSize: '0.7rem' }}>{pendingRequests.length}</span>}
          </button>
          <button className={`btn ${activeTab === 'cms' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setActiveTab('cms')}>
            <Edit3 size={18} /> Site Content (CMS)
          </button>
        </div>
      </div>

      {/* OVERVIEW TAB */}
      {activeTab === 'overview' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px', marginBottom: '40px' }}>
          <div className="glass-card" style={{ padding: '24px', display: 'flex', alignItems: 'center', gap: '20px' }}>
            <div style={{ background: 'rgba(14, 165, 233, 0.08)', padding: '16px', borderRadius: 'var(--radius-full)' }}>
              <Users size={28} style={{ color: 'var(--primary)' }} />
            </div>
            <div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '4px' }}>Total Users</p>
              <h3 style={{ fontSize: '2rem' }}>{users.length}</h3>
            </div>
          </div>
          
          <div className="glass-card" style={{ padding: '24px', display: 'flex', alignItems: 'center', gap: '20px' }}>
            <div style={{ background: 'rgba(45, 212, 191, 0.1)', padding: '16px', borderRadius: 'var(--radius-full)', color: 'var(--accent)' }}>
              <FileDiff size={28} />
            </div>
            <div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '4px' }}>Total Attempts</p>
              <h3 style={{ fontSize: '2rem' }}>{attempts.length}</h3>
            </div>
          </div>
        </div>
      )}

      {/* USERS TAB */}
      {activeTab === 'users' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(500px, 1fr))', gap: '24px' }}>
          {/* USER TABLE */}
          <div className="glass-panel" style={{ padding: '32px', gridColumn: '1 / -1' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
              <h2 style={{ fontSize: '1.5rem' }}>All Accounts ({users.length})</h2>
              <div style={{ display: 'flex', gap: '8px' }}>
                <span style={{ fontSize: '0.78rem', padding: '4px 12px', borderRadius: '100px', background: 'rgba(245,158,11,0.15)', color: 'var(--warning)', border: '1px solid var(--warning)', fontWeight: 700 }}>
                  👑 {users.filter(u => u.role === 'admin').length} Admin{users.filter(u => u.role === 'admin').length !== 1 ? 's' : ''}
                </span>
                <span style={{ fontSize: '0.78rem', padding: '4px 12px', borderRadius: '100px', background: 'rgba(14,165,233,0.1)', color: 'var(--primary)', border: '1px solid var(--primary)', fontWeight: 700 }}>
                  👤 {users.filter(u => u.role !== 'admin').length} Students
                </span>
              </div>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '700px' }}>
                <thead>
                  <tr style={{ background: 'var(--bg-surface-elevated)', fontSize: '0.82rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    <th style={{ padding: '12px 16px', borderRadius: '8px 0 0 8px' }}>Name / Role</th>
                    <th style={{ padding: '12px 16px' }}>Email</th>
                    <th style={{ padding: '12px 16px' }}>Course Access</th>
                    <th style={{ padding: '12px 16px' }}>Last Login</th>
                    <th style={{ padding: '12px 16px', textAlign: 'right', borderRadius: '0 8px 8px 0' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(u => {
                    const isAdmin = u.role === 'admin';
                    // Unified access list
                    const accessList = u.courseAccess?.length > 0
                      ? u.courseAccess
                      : (u.purchasedCourses || []).map(id => ({ courseId: id, expiresAt: null }));

                    return (
                      <tr key={u._id || u.id} style={{ borderBottom: '1px solid var(--border-color)', transition: 'background 0.15s' }}
                         onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-surface-elevated)'}
                         onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>

                        {/* Name + Badge */}
                        <td style={{ padding: '14px 16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{
                              width: '34px', height: '34px', flexShrink: 0,
                              borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                              background: isAdmin
                                ? 'linear-gradient(135deg, var(--warning), #f97316)'
                                : 'linear-gradient(135deg, var(--primary), var(--secondary))',
                              color: 'white', fontWeight: 800, fontSize: '0.85rem'
                            }}>
                              {u.name?.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                <span style={{ fontWeight: 600, fontSize: '0.92rem' }}>{u.name}</span>
                                {isAdmin && (
                                  <span style={{ fontSize: '0.58rem', background: 'linear-gradient(135deg, var(--warning), #f97316)', color: 'white', padding: '2px 7px', borderRadius: '100px', fontWeight: 800, letterSpacing: '0.5px', textTransform: 'uppercase' }}>ADMIN</span>
                                )}
                              </div>
                              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '1px' }}>
                                {new Date(u.createdAt).toLocaleDateString()}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Email */}
                        <td style={{ padding: '14px 16px', color: 'var(--text-secondary)', fontSize: '0.84rem' }}>{u.email}</td>

                        {/* Course Access */}
                        <td style={{ padding: '14px 16px' }}>
                          {isAdmin ? (
                            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>All Access</span>
                          ) : accessList.length === 0 ? (
                            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>No courses</span>
                          ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                              {accessList.map((a, i) => {
                                const courseObj = courses.find(c => c.id === a.courseId);
                                const isExpired = a.expiresAt && new Date(a.expiresAt) <= new Date();
                                const daysLeft = a.expiresAt
                                  ? Math.max(0, Math.ceil((new Date(a.expiresAt) - new Date()) / (1000 * 60 * 60 * 24)))
                                  : null;
                                return (
                                  <div key={i} style={{
                                    display: 'flex', alignItems: 'center', gap: '6px',
                                    fontSize: '0.72rem', padding: '3px 8px', borderRadius: '100px',
                                    background: isExpired ? 'rgba(244,63,94,0.08)' : 'rgba(16,185,129,0.08)',
                                    border: `1px solid ${isExpired ? 'var(--danger)' : 'var(--success)'}`,
                                    color: isExpired ? 'var(--danger)' : 'var(--success)',
                                    width: 'fit-content'
                                  }}>
                                    {courseObj?.title || a.courseId}
                                    <span style={{ opacity: 0.75 }}>
                                      {a.expiresAt
                                        ? isExpired ? '· EXPIRED' : `· ${daysLeft}d left`
                                        : '· ∞'}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </td>

                        {/* Last Login */}
                        <td style={{ padding: '14px 16px', fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                          {u.lastLogin ? new Date(u.lastLogin).toLocaleString() : '—'}
                        </td>

                        {/* Actions */}
                        <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                            <button onClick={() => openResetModal(u)}
                              style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: '6px', color: 'var(--warning)', cursor: 'pointer', padding: '6px 8px', display: 'flex', alignItems: 'center' }}
                              title="Reset Password">
                              <Key size={15} />
                            </button>
                            <button onClick={() => handleImpersonate(u._id || u.id)}
                              style={{ background: 'rgba(56, 189, 248, 0.1)', border: '1px solid rgba(56, 189, 248, 0.3)', borderRadius: '6px', color: 'var(--primary)', cursor: 'pointer', padding: '6px 8px', display: 'flex', alignItems: 'center' }}
                              title="Login as User">
                              <Zap size={15} />
                            </button>
                            {!isAdmin && (
                              <button onClick={() => openAccessModal(u)}
                                style={{ background: 'rgba(14,165,233,0.1)', border: '1px solid rgba(14,165,233,0.3)', borderRadius: '6px', color: 'var(--primary)', cursor: 'pointer', padding: '6px 8px', display: 'flex', alignItems: 'center' }}
                                title="Manage Course Access">
                                <ShieldCheck size={15} />
                              </button>
                            )}

                            <button onClick={() => handleDeleteUser(u._id || u.id)}
                              style={{ background: 'rgba(244,63,94,0.1)', border: '1px solid rgba(244,63,94,0.3)', borderRadius: '6px', color: 'var(--danger)', cursor: 'pointer', padding: '6px 8px', display: 'flex', alignItems: 'center' }}
                              title="Delete Account">
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* CREATE USER FORM */}
          <form onSubmit={handleCreateUser} className="glass-panel" style={{ padding: '32px', alignSelf: 'start' }}>
            <h2 style={{ fontSize: '1.5rem', marginBottom: '24px' }}>Add New Account</h2>
            <div className="input-group">
              <label className="input-label">Full Name</label>
              <input type="text" required className="input-field" value={newUser.name} onChange={e => setNewUser({...newUser, name: e.target.value})} placeholder="Student Name" />
            </div>
            <div className="input-group">
              <label className="input-label">Email</label>
              <input type="email" required className="input-field" value={newUser.email} onChange={e => setNewUser({...newUser, email: e.target.value})} />
            </div>
            <div className="input-group">
              <label className="input-label">Password</label>
              <input type="text" required className="input-field" value={newUser.password} onChange={e => setNewUser({...newUser, password: e.target.value})} />
            </div>
            <div className="input-group">
              <label className="input-label">Role</label>
              <select className="input-field" value={newUser.role} onChange={e => setNewUser({...newUser, role: e.target.value})}>
                <option value="user">Student</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '16px' }}><Plus size={18}/> Create Account</button>
          </form>
        </div>
      )}

      {/* COURSE & TEST BUILDER TAB */}
      {activeTab === 'courses' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <form onSubmit={handleSaveCourse} className="glass-panel" style={{ padding: '32px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <h2 style={{ fontSize: '1.5rem', marginBottom: '24px' }}>{editingCourseId ? 'Edit Course' : 'Add New Course'}</h2>
                {editingCourseId && <button type="button" onClick={() => { setEditingCourseId(null); setNewCourse({title:'', description:'', price: 0, thumbnailUrl: ''}); }} className="btn btn-outline" style={{ padding: '4px 12px', fontSize: '0.8rem' }}>Cancel</button>}
              </div>
              <div className="input-group">
                <label className="input-label">Course Title</label>
                <input type="text" required className="input-field" value={newCourse.title} onChange={e => setNewCourse({...newCourse, title: e.target.value})} />
              </div>
              <div className="input-group">
                <label className="input-label">Description</label>
                <input type="text" required className="input-field" value={newCourse.description} onChange={e => setNewCourse({...newCourse, description: e.target.value})} />
              </div>
              <div className="input-group">
                <label className="input-label">Price (Set 0 for Free)</label>
                <input type="number" required min="0" className="input-field" value={newCourse.price} onChange={e => setNewCourse({...newCourse, price: parseInt(e.target.value)})} />
              </div>
              <div className="input-group">
                <label className="input-label">Status</label>
                <select className="input-field" value={newCourse.status || 'Upcoming'} onChange={e => setNewCourse({...newCourse, status: e.target.value})}>
                  <option value="Upcoming">Upcoming (Pre-Registration)</option>
                  <option value="Active">Active (Launched)</option>
                </select>
              </div>

              {/* THUMBNAIL UPLOAD */}
              <div className="input-group">
                <label className="input-label">Course Thumbnail</label>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                  <div style={{ flex: 1 }}>
                    <input
                      type="text"
                      className="input-field"
                      value={newCourse.thumbnailUrl}
                      onChange={e => setNewCourse({...newCourse, thumbnailUrl: e.target.value})}
                      placeholder="Paste image URL or upload below..."
                    />
                    <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginTop: '8px', cursor: thumbnailUploading ? 'not-allowed' : 'pointer', color: 'var(--primary)', fontSize: '0.85rem', opacity: thumbnailUploading ? 0.6 : 1 }}>
                      <Upload size={14} />
                      {thumbnailUploading ? 'Uploading...' : 'Upload Image from PC'}
                      <input type="file" accept="image/*" onChange={handleThumbnailUpload} style={{ display: 'none' }} disabled={thumbnailUploading} />
                    </label>
                  </div>
                  {newCourse.thumbnailUrl && (
                    <img src={newCourse.thumbnailUrl} alt="Thumbnail Preview" style={{ width: '80px', height: '60px', objectFit: 'cover', borderRadius: '8px', border: '2px solid var(--primary)' }} />
                  )}
                </div>
              </div>
              
              {/* 📊 COURSE STATISTICS (Admin Only Edit) */}
              <div style={{ background: 'rgba(148,163,184,0.06)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-color)', marginBottom: '20px' }}>
                <h4 style={{ fontSize: '0.9rem', marginBottom: '12px', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                   <Activity size={16} /> Course Usage Stats (Manual Control)
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="input-group">
                    <label className="input-label" style={{ fontSize: '0.75rem' }}>Tests Conducted</label>
                    <input type="number" className="input-field" value={newCourse.stats?.attemptsCount || 0} onChange={e => setNewCourse({...newCourse, stats: {...newCourse.stats, attemptsCount: parseInt(e.target.value) || 0}})} />
                  </div>
                  <div className="input-group">
                    <label className="input-label" style={{ fontSize: '0.75rem' }}>Unique Students</label>
                    <input type="number" className="input-field" value={newCourse.stats?.uniqueStudentsCount || 0} onChange={e => setNewCourse({...newCourse, stats: {...newCourse.stats, uniqueStudentsCount: parseInt(e.target.value) || 0}})} />
                  </div>
                  <div className="input-group">
                    <label className="input-label" style={{ fontSize: '0.75rem' }}>Total WPM (Sum)</label>
                    <input type="number" className="input-field" value={newCourse.stats?.totalWPM || 0} onChange={e => setNewCourse({...newCourse, stats: {...newCourse.stats, totalWPM: parseInt(e.target.value) || 0}})} />
                  </div>
                  <div className="input-group">
                    <label className="input-label" style={{ fontSize: '0.75rem' }}>Total Acc. (Sum)</label>
                    <input type="number" className="input-field" value={newCourse.stats?.totalAccuracy || 0} onChange={e => setNewCourse({...newCourse, stats: {...newCourse.stats, totalAccuracy: parseInt(e.target.value) || 0}})} />
                  </div>
                </div>
                {newCourse.stats?.attemptsCount > 0 && (
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '8px', padding: '8px', background: 'var(--bg-base)', borderRadius: '6px' }}>
                    Calculated: Avg WPM: {Math.round(newCourse.stats.totalWPM / newCourse.stats.attemptsCount)} | Avg Acc: {Math.round(newCourse.stats.totalAccuracy / newCourse.stats.attemptsCount)}%
                  </div>
                )}
              </div>

              <button type="submit" className={editingCourseId ? "btn btn-primary" : "btn btn-outline"} style={{ width: '100%', marginTop: '16px' }}>
                <Plus size={18}/> {editingCourseId ? 'Save Course Updates' : 'Create Course Category'}
              </button>
            </form>

            <div className="glass-panel" style={{ padding: '32px', maxHeight: '600px', overflowY: 'auto' }}>
              <h2 style={{ fontSize: '1.5rem', marginBottom: '24px' }}>Existing Courses Structure</h2>
              {courses.map(c => (
                <div key={c.id} style={{ marginBottom: '16px', background: 'var(--bg-base)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      {c.thumbnailUrl && <img src={c.thumbnailUrl} alt="thumb" style={{ width: '44px', height: '36px', objectFit: 'cover', borderRadius: '6px', border: '1px solid var(--border-color)' }} />}
                      <div>
                        <h3 style={{ color: 'var(--primary)', margin: 0 }}>{c.title}</h3>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          Status: {c.status || 'Active'} | Enrollments: {c.enrollments?.length || 0}
                        </div>
                        {/* 📈 Stats line in admin list */}
                        <div style={{ fontSize: '0.7rem', color: 'var(--success)', marginTop: '4px', fontWeight: 600 }}>
                           Tests: {c.stats?.attemptsCount || 0} | 
                           Avg WPM: {c.stats?.attemptsCount > 0 ? Math.round(c.stats.totalWPM / c.stats.attemptsCount) : 0} | 
                           Avg Acc: {c.stats?.attemptsCount > 0 ? Math.round(c.stats.totalAccuracy / c.stats.attemptsCount) : 0}%
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      {c.status === 'Upcoming' && (
                        <button onClick={() => handleLaunchCourse(c)} className="btn btn-primary" style={{ padding: '4px 10px', fontSize: '0.75rem' }} title="Launch Course">Launch</button>
                      )}
                      <button onClick={() => startEditCourse(c)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }} title="Edit Course Info"><Edit3 size={18} /></button>
                      <button onClick={() => handleDeleteCourse(c.id)} style={{ background: 'transparent', border: 'none', color: 'var(--danger)', cursor: 'pointer' }} title="Delete Course"><Trash2 size={18} /> </button>
                    </div>
                  </div>
                  
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginLeft: '16px', marginTop: '8px' }}>
                    {c.levels.map(l => (
                      <div key={l.id} style={{ marginBottom: '8px' }}>
                        <strong style={{ color: 'var(--text-primary)' }}>{l.title} Level</strong>
                        {l.lessons.length === 0 && <span style={{ marginLeft: '8px' }}>(Empty)</span>}
                        <ul style={{ paddingLeft: '20px', marginTop: '4px', listStyleType: 'disc' }}>
                          {l.lessons.map(ls => (
                              <li key={ls.id} style={{ marginBottom: '4px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span>{ls.title} ({ls.timeMinutes}m)</span>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                  <button onClick={() => navigate(`/test/${c.id}/${l.id}/${ls.id}`)} style={{ background: 'transparent', border: 'none', color: 'var(--accent)', cursor: 'pointer' }} title="Preview Test"><Eye size={14} /></button>
                                  <button onClick={() => startEditLesson(c.id, l.id, ls)} style={{ background: 'transparent', border: 'none', color: 'var(--warning)', cursor: 'pointer' }} title="Edit Test Config"><Edit3 size={14} /></button>
                                  <button onClick={() => handleDeleteLesson(c.id, l.id, ls.id)} style={{ background: 'transparent', border: 'none', color: 'var(--danger)', cursor: 'pointer' }} title="Delete Lesson"><Trash2 size={14} /></button>
                                </div>
                              </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* CREATE TEST FORM - PREMIUM THEME */}
          <form onSubmit={handleSaveTest} className="glass-panel" style={{ 
            padding: '32px', 
            background: 'var(--bg-surface)', 
            border: '1px solid var(--border-color)',
            boxShadow: 'var(--shadow-drop)',
            color: 'var(--text-primary)' 
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ fontSize: '1.8rem', fontWeight: 'bold', fontFamily: 'var(--font-heading)' }}>{editingLessonConfig ? 'Edit Test' : 'Create Test'}</h2>
              {editingLessonConfig && <button type="button" onClick={() => { setEditingLessonConfig(null); setNewLesson({ title: '', timeLimit: '00:05:00', passage: '', mediaUrl: '', mediaType: 'audio', allowedErrorPercent: 5, capRule: 'Ignore', punctRule: 'Ignore', similarWordRule: 'Allow (Half Mistake)', baseWpm: 80, isBackspaceAllowed: false, halfMistakeAllowed: true, fullMistakeAllowed: true }); }} className="btn btn-outline" style={{ padding: '4px 12px', fontSize: '0.8rem' }}>Cancel</button>}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div className="input-group">
                <label className="input-label">Select Course</label>
                <select required className="input-field" value={activeCourseIdForLesson} onChange={e => setActiveCourseIdForLesson(e.target.value)} disabled={!!editingLessonConfig}>
                  <option value="">-- Choose Course --</option>
                  {courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                </select>
              </div>

              <div className="input-group">
                <label className="input-label">Select Difficulty Level</label>
                <select required className="input-field" value={activeLevelIdForLesson} onChange={e => setActiveLevelIdForLesson(e.target.value)} disabled={!!editingLessonConfig}>
                  <option value="level-normal">Normal Level</option>
                  <option value="level-inter">Intermediate Level</option>
                  <option value="level-adv">Advanced Level</option>
                </select>
              </div>
            </div>

            <div className="input-group">
              <label className="input-label">Test Name</label>
              <input type="text" required className="input-field" value={newLesson.title} onChange={e => setNewLesson({...newLesson, title: e.target.value})} placeholder="Admin" />
            </div>

            <div className="input-group">
              <label className="input-label">Passage</label>
              <textarea required className="input-field" style={{ minHeight: '100px' }} value={newLesson.passage} onChange={e => setNewLesson({...newLesson, passage: e.target.value})} placeholder="The quick brown fox jumps over a lazy dog" />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div className="input-group">
                <label className="input-label">Time (HH:MM:SS)</label>
                <input type="text" required className="input-field" value={newLesson.timeLimit} onChange={e => setNewLesson({...newLesson, timeLimit: e.target.value})} placeholder="00:05:00" />
              </div>

              <div className="input-group">
                <label className="input-label">Allowed Error %</label>
                <input type="number" min="0" max="100" required className="input-field" value={newLesson.allowedErrorPercent} onChange={e => { const val = e.target.value; setNewLesson({...newLesson, allowedErrorPercent: val === '' ? 0 : Number(val)}); }} />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '24px' }}>
              <div className="input-group" style={{ marginBottom: 0 }}>
                <label className="input-label">Evaluation Rules</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  <span style={{ fontSize: '0.75rem', padding: '4px 10px', borderRadius: '4px', background: 'rgba(56,189,248,0.1)', color: 'var(--primary)', border: '1px solid var(--primary)' }}>Cap: {newLesson.capRule}</span>
                  <span style={{ fontSize: '0.75rem', padding: '4px 10px', borderRadius: '4px', background: 'rgba(56,189,248,0.1)', color: 'var(--primary)', border: '1px solid var(--primary)' }}>Punct: {newLesson.punctRule}</span>
                  <span style={{ fontSize: '0.75rem', padding: '4px 10px', borderRadius: '4px', background: 'rgba(56,189,248,0.1)', color: 'var(--primary)', border: '1px solid var(--primary)' }}>Errors: {newLesson.allowedErrorPercent}%</span>
                </div>
              </div>

              <div className="input-group" style={{ marginBottom: 0 }}>
                <label className="input-label">Core Rules</label>
                <button 
                  type="button"
                  onClick={() => setNewLesson({...newLesson, isBackspaceAllowed: !newLesson.isBackspaceAllowed})}
                  style={{
                    width: '100%',
                    padding: '10px 16px',
                    borderRadius: '8px',
                    border: '1px solid var(--border-color)',
                    background: newLesson.isBackspaceAllowed ? 'rgba(34, 197, 94, 0.1)' : 'rgba(244, 63, 94, 0.1)',
                    color: newLesson.isBackspaceAllowed ? '#166534' : '#991b1b',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '10px',
                    cursor: 'pointer',
                    fontWeight: 'bold',
                    transition: 'all 0.2s'
                  }}
                >
                  {newLesson.isBackspaceAllowed ? (
                    <><CheckCircle2 size={18} /> Backspace Allowed</>
                  ) : (
                    <><ShieldCheck size={18} /> Backspace Locked</>
                  )}
                </button>
              </div>
            </div>

            {/* MISTAKE POLICY TOGGLES */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '24px' }}>
              <div className="input-group" style={{ marginBottom: 0 }}>
                <label className="input-label">Half Mistake Policy</label>
                <button
                  type="button"
                  onClick={() => setNewLesson({...newLesson, halfMistakeAllowed: !newLesson.halfMistakeAllowed})}
                  style={{
                    width: '100%', padding: '10px 16px', borderRadius: '8px',
                    border: '1px solid var(--border-color)',
                    background: newLesson.halfMistakeAllowed ? 'rgba(245, 158, 11, 0.1)' : 'rgba(100, 116, 139, 0.1)',
                    color: newLesson.halfMistakeAllowed ? '#92400e' : 'var(--text-muted)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                    cursor: 'pointer', fontWeight: 'bold', transition: 'all 0.2s'
                  }}
                >
                  <CheckCircle2 size={16} />
                  {newLesson.halfMistakeAllowed ? 'Half Mistake: ON' : 'Half Mistake: OFF'}
                </button>
              </div>
              <div className="input-group" style={{ marginBottom: 0 }}>
                <label className="input-label">Full Mistake Policy</label>
                <button
                  type="button"
                  onClick={() => setNewLesson({...newLesson, fullMistakeAllowed: !newLesson.fullMistakeAllowed})}
                  style={{
                    width: '100%', padding: '10px 16px', borderRadius: '8px',
                    border: '1px solid var(--border-color)',
                    background: newLesson.fullMistakeAllowed ? 'rgba(244, 63, 94, 0.1)' : 'rgba(100, 116, 139, 0.1)',
                    color: newLesson.fullMistakeAllowed ? '#991b1b' : 'var(--text-muted)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                    cursor: 'pointer', fontWeight: 'bold', transition: 'all 0.2s'
                  }}
                >
                  <CheckCircle2 size={16} />
                  {newLesson.fullMistakeAllowed ? 'Full Mistake: ON' : 'Full Mistake: OFF'}
                </button>
              </div>
            </div>

            <div className="input-group">
              <label className="input-label">Audio / Dictation File</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: '10px' }}>
                  <input type="text" className="input-field" value={newLesson.mediaUrl} onChange={e => setNewLesson({...newLesson, mediaUrl: e.target.value})} placeholder="Direct audio URL or upload below..." />
                  
                  {/* PREVIEW BUTTON */}
                  <button 
                    type="button" 
                    onClick={() => {
                      if(!newLesson.mediaUrl) return alert("Please enter a link first");
                      const audio = new Audio(newLesson.mediaUrl);
                      audio.play().catch(e => alert("Could not play. Link might be broken or private: " + e.message));
                    }}
                    className="btn btn-outline"
                    style={{ padding: '0 12px', background: 'rgba(56, 189, 248, 0.1)', color: 'var(--primary)', borderColor: 'var(--primary)', borderStyle: 'dotted' }}
                    title="Test Audio Link"
                  >
                    <PlayCircle size={18} />
                  </button>

                  <label style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '12px', 
                    background: isUploading ? 'var(--bg-base)' : 'rgba(14, 165, 233, 0.05)', 
                    color: isUploading ? 'var(--text-muted)' : 'var(--primary)', 
                    padding: '0 20px', 
                    borderRadius: '8px', 
                    fontSize: '0.9rem', 
                    cursor: isUploading ? 'not-allowed' : 'pointer', 
                    border: '1px solid var(--border-color)',
                    opacity: isUploading ? 0.7 : 1,
                    transition: 'all 0.2s'
                  }}>
                    {isUploading ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        {uploadProgress}%
                      </>
                    ) : (
                      <>
                        <Upload size={16} />
                        Upload from PC
                      </>
                    )}
                    <input type="file" accept="audio/*,video/*" onChange={handleFileUpload} style={{ display: 'none' }} disabled={isUploading} />
                  </label>
                </div>
                {isUploading && (
                  <div style={{ width: '100%', height: '6px', background: 'rgba(56, 189, 248, 0.1)', borderRadius: '10px', overflow: 'hidden' }}>
                    <div style={{ width: `${uploadProgress}%`, height: '100%', background: 'var(--primary)', transition: 'width 0.3s ease' }}></div>
                  </div>
                )}
              </div>
            </div>

            <div className="input-group">
              <label className="input-label">Capitalization Rule</label>
              <select className="input-field" value={newLesson.capRule} onChange={e => setNewLesson({...newLesson, capRule: e.target.value})}>
                <option value="Ignore">Ignore</option>
                <option value="Half Mistake">Half Mistake</option>
                <option value="Full Mistake">Full Mistake</option>
              </select>
            </div>

            <div className="input-group">
              <label className="input-label">Punctuation Rule</label>
              <select className="input-field" value={newLesson.punctRule} onChange={e => setNewLesson({...newLesson, punctRule: e.target.value})}>
                <option value="Ignore">Ignore</option>
                <option value="Half Mistake">Half Mistake</option>
                <option value="Full Mistake">Full Mistake</option>
              </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div className="input-group">
                <label className="input-label">Similar Word Tolerance</label>
                <select className="input-field" value={newLesson.similarWordRule} onChange={e => setNewLesson({...newLesson, similarWordRule: e.target.value})}>
                  <option value="Allow (Half Mistake)">Allow (Half Mistake)</option>
                  <option value="Ignore">Ignore</option>
                  <option value="Strict (Full Mistake)">Strict (Full Mistake)</option>
                </select>
              </div>

              <div className="input-group">
                <label className="input-label">Base WPM (Original Speed)</label>
                <input type="number" min="40" max="140" required className="input-field" value={newLesson.baseWpm} onChange={e => setNewLesson({...newLesson, baseWpm: parseInt(e.target.value)})} />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
              <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
                {editingLessonConfig ? 'Update Test' : 'Save Test'}
              </button>
              <button type="button" onClick={handleSaveTest} className="btn" style={{ flex: 1, background: 'linear-gradient(135deg, #0ea5e9, #6366f1)', color: 'white' }}>
                Save Permanently
              </button>
            </div>
          </form>

        </div>
      )}

      {/* PROMO CODES TAB */}
      {activeTab === 'promos' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '24px', maxWidth: '800px', margin: '0 auto' }}>
          <div className="glass-panel" style={{ padding: '32px' }}>
            <h2 style={{ fontSize: '1.5rem', marginBottom: '8px' }}>Generate Access Code</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>Create a custom promo code that bypasses the payment gateway. Give this code to specific users for free access.</p>
            
            <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-end' }}>
              <div className="input-group" style={{ flex: 1, marginBottom: 0 }}>
                <label className="input-label">Select Locked Course</label>
                <select className="input-field" value={activeCourseIdForLesson} onChange={e => setActiveCourseIdForLesson(e.target.value)}>
                  <option value="">-- Choose Course --</option>
                  {courses.filter(c => c.price > 0).map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                </select>
              </div>
              <button 
                className="btn btn-primary" 
                onClick={() => handleGeneratePromo(activeCourseIdForLesson)}
                style={{ padding: '14px 24px' }}
              >
                Generate Promo Code
              </button>
            </div>
          </div>

          <div className="glass-panel" style={{ padding: '32px' }}>
            <h2 style={{ fontSize: '1.5rem', marginBottom: '24px' }}>Active Promo Codes</h2>
            {promos.length === 0 ? (
              <p style={{ color: 'var(--text-secondary)' }}>No promo codes generated yet.</p>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                    <th style={{ padding: '16px 8px' }}>Code</th>
                    <th style={{ padding: '16px 8px' }}>Course</th>
                    <th style={{ padding: '16px 8px' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {promos.map(p => {
                    const courseName = courses.find(c => c.id === p.courseId)?.title || "Unknown";
                    return (
                      <tr key={p.code} style={{ borderBottom: '1px solid var(--border-color)' }}>
                        <td style={{ padding: '16px 8px', fontWeight: 'bold', color: 'var(--primary)', fontFamily: 'monospace', fontSize: '1.1rem' }}>{p.code}</td>
                        <td style={{ padding: '16px 8px' }}>{courseName}</td>
                        <td style={{ padding: '16px 8px' }}>
                          <span style={{ fontSize: '0.75rem', background: p.usedBy ? 'rgba(244,63,94,0.2)' : 'rgba(16,185,129,0.2)', color: p.usedBy ? 'var(--danger)' : 'var(--success)', padding: '4px 8px', borderRadius: '4px', fontWeight: 'bold', textTransform: 'uppercase' }}>
                            {p.usedBy ? `Used by ${users.find(u => u.id === p.usedBy)?.name || p.usedBy}` : 'Unused'}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* PAYMENT SETTINGS TAB */}
      {activeTab === 'payments' && (
        <div className="glass-panel" style={{ padding: '32px' }}>
          <h2 style={{ fontSize: '1.8rem', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Settings className="text-primary" /> Payment & Gateway Configuration
          </h2>
          
          <form onSubmit={handleUpdateSettings}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div className="input-group">
                  <label className="input-label">UPI ID (e.g., yourname@okaxis)</label>
                  <input type="text" className="input-field" value={globalSettings.upiId} onChange={e => setGlobalSettings({...globalSettings, upiId: e.target.value})} placeholder="Paytm/GPay UPI ID" />
                </div>
                
                <div className="input-group">
                  <label className="input-label">WhatsApp Number (For proof)</label>
                  <input type="text" className="input-field" value={globalSettings.whatsappNumber} onChange={e => setGlobalSettings({...globalSettings, whatsappNumber: e.target.value})} placeholder="91XXXXXXXXXX" />
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>Include country code without + (e.g., 91 for India)</p>
                </div>

                <div className="input-group">
                  <label className="input-label">Payment QR Code</label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '10px' }}>
                    <input type="text" className="input-field" value={globalSettings.qrCodeUrl} readOnly placeholder="Upload QR Image below..." />
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--bg-surface-elevated)', border: '1px solid var(--border-color)', padding: '0 16px', borderRadius: '4px', cursor: 'pointer' }}>
                      <Upload size={14} />
                      <input type="file" accept="image/*" onChange={handleQRUpload} style={{ display: 'none' }} />
                    </label>
                  </div>
                </div>

                <button type="submit" className="btn btn-primary" style={{ marginTop: '12px', padding: '12px 32px' }}>Save Settings</button>
              </div>

              <div style={{ textAlign: 'center', background: 'var(--bg-base)', borderRadius: '12px', padding: '24px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <h4 style={{ marginBottom: '16px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>QR Code Preview</h4>
                {globalSettings.qrCodeUrl ? (
                  <img src={globalSettings.qrCodeUrl} alt="QR Code" style={{ maxWidth: '200px', borderRadius: '8px', boxShadow: 'var(--shadow-drop)' }} />
                ) : (
                  <div style={{ width: '200px', height: '200px', border: '2px dashed var(--border-color)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                    No QR Uploaded
                  </div>
                )}
              </div>
            </div>
          </form>
        </div>
      )}

      {/* APPROVALS TAB */}
      {activeTab === 'approvals' && (
        <div className="glass-panel" style={{ padding: '32px' }}>
          <h2 style={{ fontSize: '1.8rem', marginBottom: '8px' }}>Course Purchase Requests</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '32px' }}>Verify WhatsApp payments and approve access for students manually.</p>
          
          <div className="glass-card" style={{ padding: '0', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead style={{ background: 'var(--bg-surface-elevated)', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                <tr>
                  <th style={{ padding: '16px' }}>Student</th>
                  <th style={{ padding: '16px' }}>Course</th>
                  <th style={{ padding: '16px' }}>Request Date</th>
                  <th style={{ padding: '16px' }}>Duration</th>
                  <th style={{ padding: '16px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {pendingRequests.length === 0 ? (
                  <tr>
                    <td colSpan="4" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>No pending requests found.</td>
                  </tr>
                ) : (
                  pendingRequests.map(req => {
                    // Backend populates userId with {name, email} via .populate()
                    const studentName = req.userId?.name || 'Unknown';
                    const studentEmail = req.userId?.email || '';
                    const studentId = req.userId?._id || req.userId;
                    const course = courses.find(c => c.id === req.courseId);
                    const currentDuration = approvalDurations[req._id] ?? 0;
                    return (
                      <tr key={req._id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                        <td style={{ padding: '16px' }}>
                          <div style={{ fontWeight: 'bold' }}>{studentName}</div>
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{studentEmail}</div>
                        </td>
                        <td style={{ padding: '16px' }}>
                          <span style={{ color: 'var(--primary)', fontWeight: 500 }}>{course?.title || req.courseId || 'Unknown Course'}</span>
                        </td>
                        <td style={{ padding: '16px', color: 'var(--text-secondary)' }}>
                          {req.createdAt ? new Date(req.createdAt).toLocaleString() : 'N/A'}
                        </td>
                        <td style={{ padding: '16px' }}>
                          <select
                            value={currentDuration}
                            onChange={e => setApprovalDurations(prev => ({ ...prev, [req._id]: parseInt(e.target.value) }))}
                            className="input-field"
                            style={{ padding: '8px 12px', borderRadius: '8px', fontSize: '0.85rem', minWidth: '150px', marginBottom: '0' }}
                          >
                            <option value={0}>♾️ Lifetime</option>
                            <option value={30}>📅 30 Days</option>
                            <option value={60}>📅 60 Days</option>
                            <option value={90}>📅 90 Days (3M)</option>
                            <option value={180}>📅 6 Months</option>
                            <option value={365}>📅 1 Year</option>
                          </select>
                        </td>
                        <td style={{ padding: '16px', textAlign: 'right' }}>
                          <button 
                            className="btn btn-primary" 
                            style={{ padding: '8px 16px', fontSize: '0.85rem' }}
                            onClick={() => handleApproveRequest(req._id, studentId, req.courseId)}
                          >
                            <CheckCircle2 size={16} /> Approve
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CMS TAB */}
      {activeTab === 'cms' && siteContent && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
           <div className="glass-panel" style={{ padding: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
             <div>
               <h2 style={{ fontSize: '1.8rem', marginBottom: '8px' }}>Visual Content Management</h2>
               <p style={{ color: 'var(--text-secondary)', margin: 0 }}>Edit all website text and sections dynamically.</p>
             </div>
             <button className="btn btn-primary" onClick={handleUpdateSiteContent}>Save All Changes</button>
           </div>

           <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px' }}>
              
              {/* Hero & Pages Section */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                <div className="glass-panel" style={{ padding: '32px' }}>
                  <h3 style={{ marginBottom: '24px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>Hero Section</h3>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <div className="input-group">
                      <label className="input-label">Hero Title</label>
                      <input type="text" className="input-field" value={siteContent.hero.title} onChange={e => setSiteContent({...siteContent, hero: {...siteContent.hero, title: e.target.value}})} />
                    </div>
                    <div className="input-group">
                      <label className="input-label">Hero Subtitle</label>
                      <textarea className="input-field" style={{ minHeight: '80px' }} value={siteContent.hero.subtitle} onChange={e => setSiteContent({...siteContent, hero: {...siteContent.hero, subtitle: e.target.value}})} />
                    </div>
                  </div>
                </div>

                <div className="glass-panel" style={{ padding: '32px' }}>
                  <h3 style={{ marginBottom: '24px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>SEO Tags (Google Ranking)</h3>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <div className="input-group">
                      <label className="input-label">Meta Title</label>
                      <input type="text" className="input-field" value={siteContent.seo?.title || ''} onChange={e => setSiteContent({...siteContent, seo: {...siteContent.seo, title: e.target.value}})} />
                    </div>
                    <div className="input-group">
                      <label className="input-label">Meta Description</label>
                      <textarea className="input-field" style={{ minHeight: '60px' }} value={siteContent.seo?.description || ''} onChange={e => setSiteContent({...siteContent, seo: {...siteContent.seo, description: e.target.value}})} />
                    </div>
                    <div className="input-group">
                      <label className="input-label">Meta Keywords</label>
                      <input type="text" className="input-field" value={siteContent.seo?.keywords || ''} onChange={e => setSiteContent({...siteContent, seo: {...siteContent.seo, keywords: e.target.value}})} />
                    </div>
                  </div>
                </div>

                <div className="glass-panel" style={{ padding: '32px' }}>
                  <h3 style={{ marginBottom: '24px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>Global Social Links</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <div className="input-group">
                      <label className="input-label">YouTube URL</label>
                      <input type="text" className="input-field" value={siteContent.socials?.youtube || ''} onChange={e => setSiteContent({...siteContent, socials: {...siteContent.socials, youtube: e.target.value}})} />
                    </div>
                    <div className="input-group">
                      <label className="input-label">Telegram Link</label>
                      <input type="text" className="input-field" value={siteContent.socials?.telegram || ''} onChange={e => setSiteContent({...siteContent, socials: {...siteContent.socials, telegram: e.target.value}})} />
                    </div>
                    <div className="input-group">
                      <label className="input-label">WhatsApp Number (e.g. 919876543210)</label>
                      <input type="text" className="input-field" value={siteContent.socials?.whatsapp || ''} onChange={e => setSiteContent({...siteContent, socials: {...siteContent.socials, whatsapp: e.target.value}})} />
                    </div>
                  </div>
                </div>
                <div className="glass-panel" style={{ padding: '32px' }}>
                  <h3 style={{ marginBottom: '24px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>Site-wide Banner (Alert Bar)</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <input 
                        type="checkbox" 
                        checked={siteContent.banner?.enabled || false} 
                        onChange={e => setSiteContent({...siteContent, banner: {...siteContent.banner, enabled: e.target.checked}})} 
                        style={{ width: '20px', height: '20px' }}
                      />
                      <label style={{ fontWeight: 600 }}>Enable Top Announcement Banner</label>
                    </div>
                    <div className="input-group">
                      <label className="input-label">Banner Text (e.g. 2026 Batch Now Open!)</label>
                      <input type="text" className="input-field" value={siteContent.banner?.text || ''} onChange={e => setSiteContent({...siteContent, banner: {...siteContent.banner, text: e.target.value}})} />
                    </div>
                    <div className="input-group">
                      <label className="input-label">Banner Link (Button URL)</label>
                      <input type="text" className="input-field" value={siteContent.banner?.link || ''} onChange={e => setSiteContent({...siteContent, banner: {...siteContent.banner, link: e.target.value}})} />
                    </div>
                  </div>
                </div>

                <div className="glass-panel" style={{ padding: '32px' }}>
                  <h3 style={{ marginBottom: '24px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>Hero Promo Badge (Green Chip)</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <input 
                        type="checkbox" 
                        checked={siteContent.promoBadge?.enabled || false} 
                        onChange={e => setSiteContent({...siteContent, promoBadge: {...siteContent.promoBadge, enabled: e.target.checked}})} 
                        style={{ width: '20px', height: '20px' }}
                      />
                      <label style={{ fontWeight: 600 }}>Enable Hero Promo Badge</label>
                    </div>
                    <div className="input-group">
                      <label className="input-label">Badge Text (e.g. 🎁 FREE COURSES AVAILABLE)</label>
                      <input type="text" className="input-field" value={siteContent.promoBadge?.text || ''} onChange={e => setSiteContent({...siteContent, promoBadge: {...siteContent.promoBadge, text: e.target.value}})} />
                    </div>
                  </div>
                </div>

                <div className="glass-panel" style={{ padding: '32px' }}>
                  <h3 style={{ marginBottom: '24px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>Features Grid Editor</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {(siteContent.features || []).map((f, idx) => (
                      <div key={idx} style={{ padding: '16px', background: 'var(--bg-base)', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                           <span style={{ fontWeight: 'bold' }}>Feature {idx + 1}</span>
                           <button onClick={() => {
                             const newFeats = siteContent.features.filter((_, i) => i !== idx);
                             setSiteContent({...siteContent, features: newFeats});
                           }} style={{ color: 'var(--danger)', background: 'transparent', border: 'none', cursor: 'pointer' }}>Remove</button>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                          <div>
                            <label className="input-label" style={{fontSize: '0.75rem'}}>Icon (Activity, Zap, ShieldCheck, Server, Smartphone)</label>
                            <input type="text" className="input-field" value={f.icon || ''} onChange={e => {
                               const newFeats = [...siteContent.features];
                               newFeats[idx].icon = e.target.value;
                               setSiteContent({...siteContent, features: newFeats});
                            }} />
                          </div>
                          <div>
                            <label className="input-label" style={{fontSize: '0.75rem'}}>Title</label>
                            <input type="text" className="input-field" value={f.title || ''} onChange={e => {
                               const newFeats = [...siteContent.features];
                               newFeats[idx].title = e.target.value;
                               setSiteContent({...siteContent, features: newFeats});
                            }} />
                          </div>
                        </div>
                        <label className="input-label" style={{fontSize: '0.75rem'}}>Description</label>
                        <textarea className="input-field" style={{ minHeight: '60px' }} value={f.desc || ''} onChange={e => {
                           const newFeats = [...siteContent.features];
                           newFeats[idx].desc = e.target.value;
                           setSiteContent({...siteContent, features: newFeats});
                        }} />
                      </div>
                    ))}
                    <button className="btn btn-outline" style={{width:'100%'}} onClick={() => setSiteContent({...siteContent, features: [...(siteContent.features || []), {icon: 'Zap', title: 'New Feature', desc: ''}]})}>+ Add New Feature</button>
                  </div>
                </div>
              </div>

              {/* Dynamic Lists Section */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                
                <div className="glass-panel" style={{ padding: '32px' }}>
                  <h3 style={{ marginBottom: '24px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>Student Reviews</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {(siteContent.reviews || []).map((r, idx) => (
                      <div key={idx} style={{ padding: '12px', background: 'var(--bg-base)', borderRadius: '8px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                           <span style={{ fontWeight: 'bold', fontSize: '0.8rem' }}>Review {idx + 1}</span>
                           <button onClick={() => {
                             const newReviews = siteContent.reviews.filter((_, i) => i !== idx);
                             setSiteContent({...siteContent, reviews: newReviews});
                           }} style={{ color: 'var(--danger)', background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '0.75rem' }}>Remove</button>
                        </div>
                        <input type="text" placeholder="Student Name" className="input-field" style={{ marginBottom: '8px' }} value={r.name || ''} onChange={e => {
                           const newReviews = [...siteContent.reviews];
                           newReviews[idx].name = e.target.value;
                           setSiteContent({...siteContent, reviews: newReviews});
                        }} />
                        <input type="text" placeholder="Role (e.g. 100 WPM, SSC Steno)" className="input-field" style={{ marginBottom: '8px' }} value={r.role || ''} onChange={e => {
                           const newReviews = [...siteContent.reviews];
                           newReviews[idx].role = e.target.value;
                           setSiteContent({...siteContent, reviews: newReviews});
                        }} />
                        <textarea placeholder="Review text..." className="input-field" value={r.text || ''} onChange={e => {
                           const newReviews = [...siteContent.reviews];
                           newReviews[idx].text = e.target.value;
                           setSiteContent({...siteContent, reviews: newReviews});
                        }} />
                      </div>
                    ))}
                    <button className="btn btn-outline" style={{width:'100%'}} onClick={() => setSiteContent({...siteContent, reviews: [...(siteContent.reviews || []), {name: '', role: '', text: '', stars: 5}]})}>+ Add Student Review</button>
                  </div>
                </div>

                <div className="glass-panel" style={{ padding: '32px' }}>
                  <h3 style={{ marginBottom: '24px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>FAQ Management</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {siteContent.faq.map((f, idx) => (
                      <div key={idx} style={{ padding: '12px', background: 'var(--bg-base)', borderRadius: '8px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                           <span style={{ fontWeight: 'bold', fontSize: '0.8rem' }}>Question {idx + 1}</span>
                           <button onClick={() => {
                             const newFaq = siteContent.faq.filter((_, i) => i !== idx);
                             setSiteContent({...siteContent, faq: newFaq});
                           }} style={{ color: 'var(--danger)', background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '0.75rem' }}>Remove</button>
                        </div>
                        <input type="text" className="input-field" style={{ marginBottom: '8px' }} value={f.q} onChange={e => {
                           const newFaq = [...siteContent.faq];
                           newFaq[idx].q = e.target.value;
                           setSiteContent({...siteContent, faq: newFaq});
                        }} />
                        <textarea className="input-field" value={f.a} onChange={e => {
                           const newFaq = [...siteContent.faq];
                           newFaq[idx].a = e.target.value;
                           setSiteContent({...siteContent, faq: newFaq});
                        }} />
                      </div>
                    ))}
                    <button className="btn btn-outline" style={{width:'100%'}} onClick={() => setSiteContent({...siteContent, faq: [...siteContent.faq, {q: 'New Question', a: 'New Answer'}]})}>+ Add FAQ Item</button>
                  </div>
                </div>

                <div className="glass-panel" style={{ padding: '32px' }}>
                  <h3 style={{ marginBottom: '24px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>Contact Information (Displayed globally)</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                     <div className="input-group">
                        <label className="input-label">Public Email</label>
                        <input type="email" className="input-field" value={siteContent.contact.email} onChange={e => setSiteContent({...siteContent, contact: {...siteContent.contact, email: e.target.value}})} />
                     </div>
                     <div className="input-group">
                        <label className="input-label">Support Phone</label>
                        <input type="text" className="input-field" value={siteContent.contact.phone} onChange={e => setSiteContent({...siteContent, contact: {...siteContent.contact, phone: e.target.value}})} />
                     </div>
                     <div className="input-group">
                        <label className="input-label">Address</label>
                        <input type="text" className="input-field" value={siteContent.contact.address} onChange={e => setSiteContent({...siteContent, contact: {...siteContent.contact, address: e.target.value}})} />
                     </div>
                  </div>
                </div>
              </div>
           </div>
        </div>
      )}

      {/* ACCESS CONTROL MODAL — UPGRADED */}
      {selectedUserForAccess && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', backdropFilter: 'blur(10px)' }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '560px', padding: '32px', position: 'relative', maxHeight: '90vh', overflowY: 'auto' }}>
            <button onClick={() => setSelectedUserForAccess(null)} style={{ position: 'absolute', top: '16px', right: '16px', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={22}/></button>

            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '24px' }}>
              <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--primary), var(--secondary))', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 800, fontSize: '1.1rem' }}>
                {selectedUserForAccess.name?.charAt(0).toUpperCase()}
              </div>
              <div>
                <h2 style={{ fontSize: '1.3rem' }}>Manage Course Access</h2>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{selectedUserForAccess.name} · {selectedUserForAccess.email}</p>
              </div>
            </div>

            {/* Currently Active Courses */}
            <div style={{ marginBottom: '24px' }}>
              <h4 style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px' }}>Current Access</h4>
              {userCourseAccess.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontStyle: 'italic' }}>No courses granted yet.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {userCourseAccess.map((a, i) => {
                    const courseObj = courses.find(c => c.id === a.courseId);
                    const isExpired = a.expiresAt && new Date(a.expiresAt) <= new Date();
                    const daysLeft = a.expiresAt
                      ? Math.max(0, Math.ceil((new Date(a.expiresAt) - new Date()) / (1000 * 60 * 60 * 24)))
                      : null;
                    return (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderRadius: '8px', background: isExpired ? 'rgba(244,63,94,0.07)' : 'rgba(16,185,129,0.07)', border: `1px solid ${isExpired ? 'var(--danger)' : 'var(--success)'}30` }}>
                        <div>
                          <p style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: '2px' }}>{courseObj?.title || a.courseId}</p>
                          <p style={{ fontSize: '0.72rem', color: isExpired ? 'var(--danger)' : 'var(--success)' }}>
                            {a.expiresAt
                              ? isExpired
                                ? `⚠️ Expired on ${new Date(a.expiresAt).toLocaleDateString()}`
                                : `✅ ${daysLeft} days left · till ${new Date(a.expiresAt).toLocaleDateString()}`
                              : '✅ Lifetime Access (∞)'}
                          </p>
                        </div>
                        <button onClick={() => handleRevokeAccess(a.courseId)}
                          style={{ background: 'rgba(244,63,94,0.1)', border: '1px solid var(--danger)', borderRadius: '6px', color: 'var(--danger)', cursor: 'pointer', padding: '5px 10px', fontSize: '0.75rem', fontWeight: 700 }}>
                          Revoke
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div style={{ height: '1px', background: 'var(--border-color)', margin: '20px 0' }} />

            {/* Grant New Access */}
            <h4 style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '16px' }}>Grant / Renew Access</h4>
            <div className="input-group">
              <label className="input-label">Select Course</label>
              <select className="input-field" value={accessGrantCourseId} onChange={e => setAccessGrantCourseId(e.target.value)}>
                <option value="">-- Choose a course --</option>
                {courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
              </select>
            </div>
            <div className="input-group">
              <label className="input-label">Duration</label>
              <select className="input-field" value={accessGrantDays} onChange={e => setAccessGrantDays(e.target.value)}>
                <option value="lifetime">♾️ Lifetime (No Expiry)</option>
                <option value="30">📅 1 Month (30 days)</option>
                <option value="90">📅 3 Months (90 days)</option>
                <option value="180">📅 6 Months (180 days)</option>
                <option value="365">📅 1 Year (365 days)</option>
              </select>
            </div>
            <button onClick={handleGrantAccess} className="btn btn-primary" style={{ width: '100%', marginTop: '4px' }}>
              <Zap size={16} /> Grant Access
            </button>

            <button onClick={() => setSelectedUserForAccess(null)} className="btn btn-outline" style={{ width: '100%', marginTop: '12px' }}>Close</button>
          </div>
        </div>
      )}

      {/* PASSWORD RESET MODAL */}
      {selectedUserForPasswordReset && (
         <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', backdropFilter: 'blur(12px)' }}>
            <div className="glass-panel" style={{ width: '100%', maxWidth: '400px', padding: '32px', position: 'relative', border: '1px solid rgba(255,255,255,0.1)' }}>
               <button onClick={() => setSelectedUserForPasswordReset(null)} style={{ position: 'absolute', top: '16px', right: '16px', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={24}/></button>
               
               <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                  <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(234, 179, 8, 0.1)', color: 'var(--warning)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                     <Key size={32} />
                  </div>
                  <h2 style={{ fontSize: '1.5rem', marginBottom: '8px' }}>Reset Password</h2>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Account: <strong>{selectedUserForPasswordReset.name}</strong></p>
               </div>

               <div className="input-group">
                  <label className="input-label">New Password</label>
                  <div style={{ position: 'relative' }}>
                     <input 
                        type="text" 
                        autoFocus
                        className="input-field" 
                        placeholder="Enter secure password"
                        value={newPasswordValue}
                        onChange={e => setNewPasswordValue(e.target.value)}
                        style={{ paddingLeft: '40px' }}
                     />
                     <div style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>
                        <Lock size={18} />
                     </div>
                  </div>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '8px' }}>Must be at least 6 characters long.</p>
               </div>

               <div style={{ marginTop: '32px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <button onClick={handleResetPasswordFinal} className="btn btn-primary" style={{ background: 'var(--warning)', color: 'black' }}>Update Now</button>
                  <button onClick={() => setSelectedUserForPasswordReset(null)} className="btn btn-outline">Cancel</button>
               </div>
            </div>
         </div>
      )}
    </div>
  );
}
