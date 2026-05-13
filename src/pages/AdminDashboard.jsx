import { useEffect, useState } from 'react';
import { db } from '../data/db';
import api from '../services/api';
import axios from 'axios';
import { Users, FileDiff, Server, Plus, List, Settings, Edit3, Eye, Upload, QrCode, CheckCircle2, MessageSquare, Loader2, Trash2, ShieldCheck, X, Key, Lock, PlayCircle, Zap, Activity, BookOpen, Clock, Mail, Megaphone, DollarSign, TrendingUp, Trophy, BarChart2, Calendar, AlertTriangle, UserCheck, UserX, ArrowUpRight, Filter } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import useStore from '../store/useStore';

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('overview'); // overview | users | courses
  const addToast = useStore(state => state.addToast);
  const showModal = useStore(state => state.showModal);
  const hideModal = useStore(state => state.hideModal);
  const navigate = useNavigate();

  const [users, setUsers] = useState([]);
  const [attempts, setAttempts] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [globalSettings, setGlobalSettings] = useState({ upiId: '', whatsappNumber: '', qrCodeUrl: '', announcementMessage: '', announcementExpiresAt: null });
  const [pendingRequests, setPendingRequests] = useState([]);
  const [siteContent, setSiteContent] = useState(null);
  const [inquiries, setInquiries] = useState([]);
  const [approvalDurations, setApprovalDurations] = useState({}); // reqId -> durationDays
  
  // Enrollments State
  const [enrollmentSearch, setEnrollmentSearch] = useState('');
  const [enrollmentType, setEnrollmentType] = useState('active'); // active | expired

  // Paid Users State
  const [paidUsersSearch, setPaidUsersSearch] = useState('');
  const [paidUsersFilter, setPaidUsersFilter] = useState('all'); // all | active | expired
  const [paidUsersCourseFilter, setPaidUsersCourseFilter] = useState('all'); // all | courseId

  // Earnings State
  const [earningsSearch, setEarningsSearch] = useState('');
  const [earningsDateFilter, setEarningsDateFilter] = useState('all'); // today | week | month | all
  const [earningsCourseFilter, setEarningsCourseFilter] = useState('all');
  const [earningsStatusFilter, setEarningsStatusFilter] = useState('all'); // all | active | expired

  // Admin Leaderboard Selector
  const [lbSelectedCourseId, setLbSelectedCourseId] = useState('');
  const [lbSelectedLessonId, setLbSelectedLessonId] = useState('');

  // Sidebar
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Forms states
  const [newUser, setNewUser] = useState({ name: '', email: '', password: '', role: 'user' });
  
  const [editingCourseId, setEditingCourseId] = useState(null);
  const [newCourse, setNewCourse] = useState({ title: '', description: '', price: 0, status: 'Upcoming', thumbnailUrl: '', stats: { attemptsCount: 0, uniqueStudentsCount: 0, totalWPM: 0, totalAccuracy: 0 } });
  const [thumbnailUploading, setThumbnailUploading] = useState(false);

  // User Management State
  const [usersSearch, setUsersSearch] = useState('');
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
      const [u, a, c, p, s, r, sc, inq] = await Promise.all([
        db.getAllUsers(),
        db.getAllAttempts(),
        db.getCourses(),
        db.getPromos(),
        db.getGlobalSettings(),
        db.getPendingRequests(),
        db.getSiteContent(),
        db.getInquiries(),
      ]);
      setUsers(u);
      setAttempts(a);
      setCourses(c);
      setPromos(p);
      setGlobalSettings(s);
      setPendingRequests(r);
      setSiteContent(sc);
      setInquiries(inq);
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
      addToast("User created successfully!", "success");
      setNewUser({ name: '', email: '', password: '', role: 'user' });
      loadData();
    } catch (err) { addToast(err.message, "error"); }
  };

  const handleDeleteInquiry = async (id) => {
    showModal({
      title: "Delete Inquiry?",
      message: "Are you sure you want to remove this message from the inbox?",
      type: "danger",
      onConfirm: async () => {
        try {
          await db.deleteInquiry(id);
          addToast("Message deleted", "success");
          loadData();
        } catch (err) {
          addToast("Failed to delete", "error");
        }
      }
    });
  };

  const handleDeleteUser = async (userId) => {
    showModal({
      title: "Delete User?",
      message: "Are you sure you want to delete this user? This action cannot be undone.",
      type: "danger",
      onConfirm: async () => {
        try {
          await db.deleteUser(userId);
          addToast("User deleted successfully!", "success");
          loadData();
        } catch (err) { addToast(err.message, "error"); }
      }
    });
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
      addToast('✅ Access granted!', 'success');
      loadData();
    } catch (err) { addToast(err.message, 'error'); }
  };

  const handleRevokeAccess = async (courseId) => {
    showModal({
      title: 'Revoke Access?',
      message: 'Remove this course from the user? They will no longer be able to access the lessons.',
      type: 'danger',
      onConfirm: async () => {
        const updated = userCourseAccess.filter(a => a.courseId !== courseId);
        setUserCourseAccess(updated);
        try {
          await db.updateUserAccess(selectedUserForAccess._id || selectedUserForAccess.id, updated);
          addToast('Course access revoked.', 'success');
          loadData();
        } catch (err) { addToast(err.message, 'error'); }
      }
    });
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
       return addToast("Password must be at least 6 characters.", "warning");
    }
    try {
       await db.resetUserPassword(selectedUserForPasswordReset._id || selectedUserForPasswordReset.id, newPasswordValue);
       addToast("Password reset successfully! 🔐", "success");
       setSelectedUserForPasswordReset(null);
    } catch (err) { addToast(err.message, "error"); }
  };

  const handleImpersonate = async (userId) => {
    showModal({
      title: "Impersonate User?",
      message: "Log into this user's account? Your current session will be replaced and you will see the site as they do.",
      onConfirm: async () => {
        try {
          const response = await api.post(`/auth/impersonate/${userId}`);
          if (response.data.token) {
            localStorage.setItem('ssa_user', JSON.stringify(response.data));
            window.location.href = '/dashboard';
          }
        } catch (err) {
          addToast("Impersonation failed: " + (err.response?.data?.message || err.message), "error");
        }
      }
    });
  };



  const handleDeleteLesson = async (courseId, levelId, lessonId) => {
    showModal({
      title: "Delete Lesson?",
      message: "Are you sure you want to permanently delete this lesson? This cannot be undone.",
      type: "danger",
      onConfirm: async () => {
        try {
          await db.deleteLesson(courseId, levelId, lessonId);
          addToast("Lesson deleted successfully!", "success");
          loadData();
        } catch (err) {
          addToast("Failed to delete lesson: " + err.message, "error");
        }
      }
    });
  };

  const handleLaunchCourse = async (course) => {
    showModal({
      title: `Launch ${course.title}`,
      message: "Set the price for this course. Enter '0' to launch it for FREE. All enrolled users will be notified.",
      showInput: true,
      defaultValue: "499",
      placeholder: "Enter price (e.g. 499)",
      onConfirm: async (priceVal) => {
        const price = parseInt(priceVal, 10);
        if (isNaN(price) || price < 0) return addToast("Invalid price", "error");
        
        const isFree = price === 0;
        try {
          await db.launchCourse(course.id, isFree, price);
          addToast(`Course launched successfully as ${isFree ? 'FREE' : '₹'+price}!`, "success");
          loadData();
        } catch (err) {
          addToast("Launch failed: " + err.message, "error");
        }
      }
    });
  };

  const handleSaveCourse = async (e) => {
    e.preventDefault();

    try {
      if (editingCourseId) {
        await db.editCourse(editingCourseId, newCourse);
        addToast("Course updated!", "success");
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
        addToast("Course created successfully!", "success");
      }
      setEditingCourseId(null);
      setNewCourse({ title: '', description: '', price: 0, status: 'Upcoming', thumbnailUrl: '', stats: { attemptsCount: 0, uniqueStudentsCount: 0, totalWPM: 0, totalAccuracy: 0 } });
      loadData();
    } catch (err) { addToast(err.message, "error"); }
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
        addToast('Thumbnail uploaded! ✅', 'success');
      }
    } catch (err) {
      addToast('Thumbnail upload failed: ' + err.message, 'error');
    } finally {
      setThumbnailUploading(false);
    }
  };

  const handleDeleteCourse = async (courseId) => {
    showModal({
      title: "Delete Course?",
      message: "Are you sure you want to delete this course and all its lessons? This action is permanent.",
      type: "danger",
      onConfirm: async () => {
        try {
          await db.deleteCourse(courseId);
          addToast("Course deleted successfully!", "success");
          loadData();
        } catch (err) { addToast(err.message, "error"); }
      }
    });
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


  const now_dash = new Date();
  const today_start = new Date(); today_start.setHours(0,0,0,0);

  // Compute sidebar badge counts
  const pendingCount = pendingRequests.length;
  const inboxCount = inquiries.length;
  const expiringCount = users.reduce((acc, u) => {
    return acc + (u.courseAccess || []).filter(a => a.expiresAt && (new Date(a.expiresAt) - now_dash) / (1000*60*60*24) <= 7 && new Date(a.expiresAt) > now_dash).length;
  }, 0);

  const sidebarGroups = [
    { label: 'Main', items: [
      { id: 'overview', icon: <BarChart2 size={18}/>, label: 'Dashboard' },
    ]},
    { label: 'Users', items: [
      { id: 'users', icon: <Users size={18}/>, label: 'All Users' },
      { id: 'paid-users', icon: <UserCheck size={18}/>, label: 'Paid Users' },
      { id: 'enrollments', icon: <BookOpen size={18}/>, label: 'Enrollments' },
    ]},
    { label: 'Content', items: [
      { id: 'courses', icon: <Settings size={18}/>, label: 'Tests & Courses' },
      { id: 'promos', icon: <Zap size={18}/>, label: 'Promo Codes' },
    ]},
    { label: 'Finance', items: [
      { id: 'earnings', icon: <TrendingUp size={18}/>, label: 'Earnings' },
      { id: 'payments', icon: <QrCode size={18}/>, label: 'Payment Setup' },
      { id: 'approvals', icon: <CheckCircle2 size={18}/>, label: 'Approvals', badge: pendingCount },
    ]},
    { label: 'Analytics', items: [
      { id: 'leaderboards', icon: <Trophy size={18}/>, label: 'Leaderboards' },
    ]},
    { label: 'Communication', items: [
      { id: 'inbox', icon: <MessageSquare size={18}/>, label: 'Inbox', badge: inboxCount },
      { id: 'cms', icon: <Edit3 size={18}/>, label: 'Site Content' },
    ]},
  ];

  return (
    <div style={{ display: 'flex', gap: '0', alignItems: 'flex-start', minHeight: 'calc(100vh - 180px)' }}>

      {/* ========== SIDEBAR ========== */}
      <style>{`
        .admin-sidebar { width: 220px; flex-shrink: 0; transition: width 0.25s ease; }
        .admin-sidebar.collapsed { width: 56px; }
        .admin-sidebar.collapsed .sidebar-label { display: none; }
        .admin-sidebar.collapsed .sidebar-group-label { display: none; }
        .admin-sidebar.collapsed .sidebar-nav-item { justify-content: center; padding: 10px; }
        @media (max-width: 768px) {
          .admin-layout { flex-direction: column !important; }
          .admin-sidebar { width: 100% !important; }
          .admin-sidebar .sidebar-group-label { display: none !important; }
          .admin-sidebar nav { display: flex; flex-wrap: wrap; gap: 4px; flex-direction: row !important; padding: 8px !important; }
          .admin-sidebar .sidebar-nav-item { padding: 8px 10px !important; flex: 0 0 auto; }
          .admin-sidebar .sidebar-label { display: block !important; font-size: 0.78rem !important; }
        }
      `}</style>

      <aside
        className={`admin-sidebar ${sidebarCollapsed ? 'collapsed' : ''}`}
        style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-color)',
          borderRadius: '20px',
          padding: '16px 12px',
          marginRight: '24px',
          position: 'sticky',
          top: '100px',
          maxHeight: 'calc(100vh - 140px)',
          overflowY: 'auto',
          overflowX: 'hidden',
        }}
      >
        {/* Sidebar Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', paddingBottom: '12px', borderBottom: '1px solid var(--border-color)' }}>
          {!sidebarCollapsed && (
            <div>
              <div style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--primary)' }}>Admin Panel</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Manage everything</div>
            </div>
          )}
          <button
            onClick={() => setSidebarCollapsed(p => !p)}
            style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '4px', borderRadius: '6px', display: 'flex' }}
            title={sidebarCollapsed ? 'Expand' : 'Collapse'}
          >
            <List size={18}/>
          </button>
        </div>

        {/* Nav Groups */}
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {sidebarGroups.map(group => (
            <div key={group.label} style={{ marginBottom: '8px' }}>
              <div className="sidebar-group-label" style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.8px', padding: '4px 8px', marginBottom: '2px' }}>
                {group.label}
              </div>
              {group.items.map(item => (
                <button
                  key={item.id}
                  className="sidebar-nav-item"
                  onClick={() => setActiveTab(item.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '10px',
                    width: '100%', padding: '9px 12px', borderRadius: '10px',
                    border: 'none', cursor: 'pointer', textAlign: 'left',
                    fontSize: '0.875rem', fontWeight: activeTab === item.id ? 700 : 500,
                    background: activeTab === item.id ? 'var(--primary)' : 'transparent',
                    color: activeTab === item.id ? 'white' : 'var(--text-secondary)',
                    transition: 'all 0.15s',
                    position: 'relative'
                  }}
                  onMouseEnter={e => { if (activeTab !== item.id) e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
                  onMouseLeave={e => { if (activeTab !== item.id) e.currentTarget.style.background = 'transparent'; }}
                >
                  <span style={{ flexShrink: 0 }}>{item.icon}</span>
                  <span className="sidebar-label" style={{ whiteSpace: 'nowrap', flex: 1 }}>{item.label}</span>
                  {item.badge > 0 && (
                    <span style={{
                      background: activeTab === item.id ? 'rgba(255,255,255,0.3)' : 'var(--danger)',
                      color: 'white', fontSize: '0.62rem', fontWeight: 800,
                      padding: '1px 5px', borderRadius: '100px', minWidth: '18px', textAlign: 'center'
                    }}>{item.badge}</span>
                  )}
                </button>
              ))}
            </div>
          ))}
        </nav>
      </aside>

      {/* ========== MAIN CONTENT ========== */}
      <div className="admin-layout" style={{ flex: 1, minWidth: 0 }}>

      {/* OVERVIEW TAB */}
      {activeTab === 'overview' && (() => {
        const activePaidUsers = users.filter(u => (u.courseAccess || []).some(a => !a.expiresAt || new Date(a.expiresAt) > now_dash)).length;
        const freeUsers = users.filter(u => (u.courseAccess || []).length === 0 && u.role !== 'admin').length;
        const todayRegs = users.filter(u => u.createdAt && new Date(u.createdAt) >= today_start).length;
        const totalRevenue = users.reduce((sum, u) => {
          return sum + (u.courseAccess || []).reduce((s, a) => {
            const c = courses.find(c => c.id === a.courseId);
            return s + (c?.price || 0);
          }, 0);
        }, 0);

        const cards = [
          { label: 'Total Users', value: users.length, icon: <Users size={24}/>, color: '14, 165, 233', tab: 'users' },
          { label: 'Active Paid Users', value: activePaidUsers, icon: <UserCheck size={24}/>, color: '16, 185, 129', tab: 'paid-users' },
          { label: 'Free Users', value: freeUsers, icon: <UserX size={24}/>, color: '99, 102, 241', tab: 'users' },
          { label: 'Total Attempts', value: attempts.length, icon: <FileDiff size={24}/>, color: '45, 212, 191', tab: null },
          { label: 'Total Courses', value: courses.length, icon: <BookOpen size={24}/>, color: '249, 115, 22', tab: 'courses' },
          { label: 'Est. Revenue (₹)', value: `₹${totalRevenue.toLocaleString()}`, icon: <TrendingUp size={24}/>, color: '234, 179, 8', tab: 'earnings' },
          { label: 'Expiring Soon', value: expiringCount, icon: <AlertTriangle size={24}/>, color: '239, 68, 68', tab: 'paid-users' },
          { label: "Today's Registrations", value: todayRegs, icon: <Calendar size={24}/>, color: '168, 85, 247', tab: null },
        ];

        return (
          <div>
            <div style={{ marginBottom: '24px' }}>
              <h1 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '4px' }}>Dashboard Overview</h1>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Welcome back, Admin 👋 — here's what's happening today.</p>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '32px' }}>
              {cards.map((card, i) => (
                <div
                  key={card.label}
                  className="glass-card"
                  onClick={() => card.tab && setActiveTab(card.tab)}
                  style={{
                    padding: '20px 24px', display: 'flex', alignItems: 'center', gap: '16px',
                    cursor: card.tab ? 'pointer' : 'default',
                    transition: 'transform 0.15s',
                    borderLeft: `3px solid rgba(${card.color}, 0.6)`
                  }}
                  onMouseEnter={e => { if (card.tab) e.currentTarget.style.transform = 'translateY(-2px)'; }}
                  onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
                >
                  <div style={{ background: `rgba(${card.color}, 0.1)`, padding: '12px', borderRadius: '12px', color: `rgb(${card.color})`, flexShrink: 0 }}>
                    {card.icon}
                  </div>
                  <div>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginBottom: '4px' }}>{card.label}</p>
                    <h3 style={{ fontSize: '1.8rem', fontWeight: 800, color: `rgb(${card.color})` }}>{card.value}</h3>
                  </div>
                </div>
              ))}
            </div>

            {/* Quick Actions */}
            <div className="glass-panel" style={{ padding: '24px' }}>
              <h3 style={{ fontSize: '1rem', marginBottom: '16px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 700 }}>Quick Actions</h3>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
                {[
                  { label: 'Add Test', tab: 'courses', color: 'var(--primary)' },
                  { label: 'Approve Requests', tab: 'approvals', color: '#f59e0b', badge: pendingCount },
                  { label: 'View Earnings', tab: 'earnings', color: '#22c55e' },
                  { label: 'Manage Users', tab: 'users', color: '#818cf8' },
                  { label: 'View Leaderboard', tab: 'leaderboards', color: '#f97316' },
                  { label: 'Check Inbox', tab: 'inbox', color: '#ec4899', badge: inboxCount },
                ].map(a => (
                  <button
                    key={a.label}
                    onClick={() => setActiveTab(a.tab)}
                    style={{
                      padding: '10px 20px', borderRadius: '100px', border: `1px solid ${a.color}40`,
                      background: `${a.color}10`, color: a.color, cursor: 'pointer',
                      fontWeight: 600, fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '8px'
                    }}
                  >
                    {a.label}
                    {a.badge > 0 && <span style={{ background: a.color, color: 'white', fontSize: '0.65rem', padding: '1px 6px', borderRadius: '100px', fontWeight: 800 }}>{a.badge}</span>}
                    <ArrowUpRight size={14}/>
                  </button>
                ))}
              </div>
            </div>
          </div>
        );
      })()}

      {/* INBOX TAB */}
      {activeTab === 'inbox' && (
        <div className="glass-panel" style={{ padding: '32px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
            <div>
              <h2 style={{ fontSize: '1.8rem', fontWeight: 800 }}>User Inquiries</h2>
              <p style={{ color: 'var(--text-secondary)' }}>Manage messages received from the Contact Page.</p>
            </div>
            {inquiries.length > 0 && (
              <button onClick={() => inquiries.forEach(msg => handleDeleteInquiry(msg.id))} className="btn btn-outline" style={{ color: 'var(--danger)', borderColor: 'var(--danger)' }}>
                Clear All
              </button>
            )}
          </div>

          {inquiries.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px', border: '2px dashed var(--border-color)', borderRadius: '24px' }}>
              <div style={{ width: '80px', height: '80px', background: 'rgba(255,255,255,0.03)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                <MessageSquare size={32} color="var(--text-muted)" />
              </div>
              <h3 style={{ color: 'var(--text-primary)' }}>Your inbox is empty</h3>
              <p style={{ color: 'var(--text-secondary)' }}>When users send messages via the Contact Page, they will appear here.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {inquiries.map(msg => (
                <div key={msg.id} style={{ 
                  background: 'rgba(255,255,255,0.02)', 
                  padding: '24px', 
                  borderRadius: '20px', 
                  border: '1px solid var(--border-color)',
                  transition: 'transform 0.2s',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                    <div>
                      <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--primary)', marginBottom: '4px' }}>{msg.name}</div>
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Mail size={14} /> {msg.email}
                        <span style={{ color: 'var(--text-muted)' }}>•</span>
                        <span>{new Date(msg.timestamp).toLocaleString()}</span>
                      </div>
                    </div>
                    <button onClick={() => handleDeleteInquiry(msg.id)} style={{ background: 'transparent', border: 'none', color: 'var(--danger)', cursor: 'pointer', opacity: 0.6 }}>
                      <Trash2 size={18} />
                    </button>
                  </div>
                  <div style={{ 
                    background: 'rgba(0,0,0,0.2)', 
                    padding: '16px', 
                    borderRadius: '12px', 
                    color: 'var(--text-primary)', 
                    fontSize: '0.95rem',
                    lineHeight: 1.6,
                    whiteSpace: 'pre-wrap'
                  }}>
                    {msg.message}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ENROLLMENTS TAB */}
      {activeTab === 'enrollments' && (() => {
        // Aggregate all enrollments from all users
        // UNIFIED ENROLLMENT LOGIC: Combine Course.enrollments and User.courseAccess
        const allEnrollments = [];

        // 1. Get from users' active access (Paid/Manual)
        users.forEach(user => {
          const access = user.courseAccess || [];
          access.forEach(a => {
            allEnrollments.push({
              courseId: a.courseId,
              studentName: user.name,
              studentEmail: user.email,
              userId: user._id || user.id,
              enrolledAt: a.createdAt || user.createdAt,
              status: 'ACTIVE'
            });
          });
          
          // Legacy check
          if (user.purchasedCourses) {
            user.purchasedCourses.forEach(id => {
              if (!allEnrollments.find(e => e.userId === (user._id || user.id) && e.courseId === id)) {
                allEnrollments.push({
                  courseId: id,
                  studentName: user.name,
                  studentEmail: user.email,
                  userId: user._id || user.id,
                  enrolledAt: user.createdAt,
                  status: 'LEGACY'
                });
              }
            });
          }
        });

        // 2. Get from courses' enrollment records (Registered/Interested)
        courses.forEach(course => {
          if (course.enrollments) {
            course.enrollments.forEach(e => {
              const uId = e.userId?._id || e.userId;
              // Avoid duplicates if already added from courseAccess
              const exists = allEnrollments.find(ae => ae.userId.toString() === uId.toString() && ae.courseId === course.id);
              if (!exists) {
                allEnrollments.push({
                  courseId: course.id,
                  studentName: e.name || 'Unknown',
                  studentEmail: e.email || '',
                  userId: uId,
                  enrolledAt: e.enrolledAt || course.createdAt,
                  status: 'ENROLLED' // User clicked "Enroll" but access not yet granted/paid
                });
              }
            });
          }
        });

        // Sort by date (descending)
        allEnrollments.sort((a, b) => new Date(b.enrolledAt) - new Date(a.enrolledAt));

        const now = new Date();
        const filtered = allEnrollments.filter(e => {
          const course = courses.find(c => c.id === e.courseId);
          const courseName = course?.title || e.courseId;
          const matchesSearch = 
            e.studentName?.toLowerCase().includes(enrollmentSearch.toLowerCase()) ||
            e.studentEmail?.toLowerCase().includes(enrollmentSearch.toLowerCase()) ||
            courseName?.toLowerCase().includes(enrollmentSearch.toLowerCase());
          
          const isExpired = e.expiresAt && new Date(e.expiresAt) <= now;
          const matchesType = enrollmentType === 'active' ? !isExpired : isExpired;

          return matchesSearch && matchesType;
        }).sort((a, b) => new Date(b.enrolledAt) - new Date(a.enrolledAt));

        return (
          <div className="glass-panel" style={{ padding: '32px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px', flexWrap: 'wrap', gap: '16px' }}>
              <div>
                <h2 style={{ fontSize: '1.8rem', fontWeight: 800 }}>Course Enrollments</h2>
                <p style={{ color: 'var(--text-secondary)' }}>Track which students are learning which courses.</p>
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '12px', padding: '4px', display: 'flex', gap: '4px' }}>
                  <button 
                    onClick={() => setEnrollmentType('active')}
                    style={{ 
                      padding: '8px 16px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600,
                      background: enrollmentType === 'active' ? 'var(--primary)' : 'transparent',
                      color: enrollmentType === 'active' ? 'white' : 'var(--text-secondary)'
                    }}
                  >
                    Active ({allEnrollments.filter(e => !e.expiresAt || new Date(e.expiresAt) > now).length})
                  </button>
                  <button 
                    onClick={() => setEnrollmentType('expired')}
                    style={{ 
                      padding: '8px 16px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600,
                      background: enrollmentType === 'expired' ? 'var(--danger)' : 'transparent',
                      color: enrollmentType === 'expired' ? 'white' : 'var(--text-secondary)'
                    }}
                  >
                    Expired ({allEnrollments.filter(e => e.expiresAt && new Date(e.expiresAt) <= now).length})
                  </button>
                </div>
              </div>
            </div>

            <div style={{ marginBottom: '24px' }}>
              <input 
                type="text" 
                placeholder="Search by student name, email or course..." 
                className="input-field"
                value={enrollmentSearch}
                onChange={e => setEnrollmentSearch(e.target.value)}
                style={{ width: '100%', maxWidth: '500px' }}
              />
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead style={{ background: 'var(--bg-surface-elevated)', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                  <tr>
                    <th style={{ padding: '16px' }}>User ID</th>
                    <th style={{ padding: '16px' }}>Student</th>
                    <th style={{ padding: '16px' }}>Course</th>
                    <th style={{ padding: '16px' }}>Enrolled On</th>
                    <th style={{ padding: '16px' }}>Expiry</th>
                    <th style={{ padding: '16px' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan="6" style={{ padding: '60px', textAlign: 'center', color: 'var(--text-muted)' }}>
                        No {enrollmentType} enrollments found matching your search.
                      </td>
                    </tr>
                  ) : (
                    filtered.map((enr, idx) => {
                      const course = courses.find(c => c.id === enr.courseId);
                      const isExpiringSoon = enr.expiresAt && (new Date(enr.expiresAt) - now) / (1000 * 60 * 60 * 24) < 7;
                      const isEnrolledOnly = enr.status === 'ENROLLED';

                      return (
                        <tr key={`${enr.userId}-${enr.courseId}-${idx}`} style={{ borderBottom: '1px solid var(--border-color)', transition: 'background 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                          <td style={{ padding: '16px' }}>
                            <span style={{ fontFamily: 'monospace', background: 'rgba(255,255,255,0.05)', padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem' }}>
                              {enr.uniqueId || '—'}
                            </span>
                          </td>
                          <td style={{ padding: '16px' }}>
                            <div style={{ fontWeight: 600 }}>{enr.studentName}</div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{enr.studentEmail}</div>
                          </td>
                          <td style={{ padding: '16px' }}>
                            <span style={{ color: 'var(--primary)', fontWeight: 500 }}>{course?.title || enr.courseId}</span>
                          </td>
                          <td style={{ padding: '16px', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                            {new Date(enr.enrolledAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}
                          </td>
                          <td style={{ padding: '16px', fontSize: '0.9rem', color: isExpiringSoon ? 'var(--warning)' : 'var(--text-secondary)' }}>
                            {enr.expiresAt ? new Date(enr.expiresAt).toLocaleDateString() : '♾️ Lifetime'}
                          </td>
                          <td style={{ padding: '16px' }}>
                            <span style={{ 
                              fontSize: '0.7rem', 
                              padding: '4px 10px', 
                              borderRadius: '4px', 
                              fontWeight: 'bold',
                              background: isEnrolledOnly ? 'rgba(234, 179, 8, 0.1)' : 'rgba(34, 197, 94, 0.1)',
                              color: isEnrolledOnly ? '#92400e' : '#166534',
                              border: `1px solid ${isEnrolledOnly ? '#facc15' : '#22c55e'}50`
                            }}>
                              {enr.status}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        );
      })()}

      {/* PAID USERS TAB */}
      {activeTab === 'paid-users' && (() => {
        const allPaid = [];
        const now = new Date();

        users.forEach(user => {
          // 1. Current Access
          if (user.courseAccess && user.courseAccess.length > 0) {
            user.courseAccess.forEach(a => {
              allPaid.push({
                userId: user._id || user.id,
                uniqueId: user.uniqueId,
                studentName: user.name,
                studentEmail: user.email,
                courseId: a.courseId,
                enrolledAt: a.createdAt || user.createdAt,
                expiresAt: a.expiresAt,
                paymentStatus: 'Paid / Manual Approval',
                type: 'access'
              });
            });
          }
          // 2. Legacy Purchased Courses
          if (user.purchasedCourses && user.purchasedCourses.length > 0) {
            user.purchasedCourses.forEach(courseId => {
              // Avoid duplicates if already added via courseAccess
              if (!allPaid.find(p => p.userId === (user._id || user.id) && p.courseId === courseId)) {
                allPaid.push({
                  userId: user._id || user.id,
                  uniqueId: user.uniqueId,
                  studentName: user.name,
                  studentEmail: user.email,
                  courseId: courseId,
                  enrolledAt: user.createdAt,
                  expiresAt: null, // Lifetime
                  paymentStatus: 'Legacy Paid',
                  type: 'legacy'
                });
              }
            });
          }
        });

        // Filter and Sort
        const filteredPaid = allPaid.filter(p => {
          const course = courses.find(c => c.id === p.courseId);
          const courseName = course?.title || p.courseId;
          const searchLower = paidUsersSearch.toLowerCase();
          
          const matchesSearch = 
            p.studentName?.toLowerCase().includes(searchLower) ||
            p.studentEmail?.toLowerCase().includes(searchLower) ||
            p.uniqueId?.includes(searchLower);
            
          const isExpired = p.expiresAt && new Date(p.expiresAt) <= now;
          const matchesType = paidUsersFilter === 'all' 
            ? true 
            : paidUsersFilter === 'active' 
              ? !isExpired 
              : isExpired;

          const matchesCourse = paidUsersCourseFilter === 'all' || p.courseId === paidUsersCourseFilter;

          return matchesSearch && matchesType && matchesCourse;
        }).sort((a, b) => {
           // Sort by Expiry Date by default (Expiring soonest first, lifetime last)
           if (!a.expiresAt && !b.expiresAt) return new Date(b.enrolledAt) - new Date(a.enrolledAt);
           if (!a.expiresAt) return 1;
           if (!b.expiresAt) return -1;
           return new Date(a.expiresAt) - new Date(b.expiresAt);
        });

        const activeCount = allPaid.filter(p => !p.expiresAt || new Date(p.expiresAt) > now).length;
        const expiredCount = allPaid.length - activeCount;

        return (
          <div className="glass-panel" style={{ padding: '32px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px', flexWrap: 'wrap', gap: '16px' }}>
              <div>
                <h2 style={{ fontSize: '1.8rem', fontWeight: 800 }}>Paid Users Management</h2>
                <p style={{ color: 'var(--text-secondary)' }}>Manage subscriptions and track paid access.</p>
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '12px', padding: '4px', display: 'flex', gap: '4px' }}>
                  <button 
                    onClick={() => setPaidUsersFilter('all')}
                    style={{ 
                      padding: '8px 16px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600,
                      background: paidUsersFilter === 'all' ? 'var(--primary)' : 'transparent',
                      color: paidUsersFilter === 'all' ? 'white' : 'var(--text-secondary)'
                    }}
                  >
                    All ({allPaid.length})
                  </button>
                  <button 
                    onClick={() => setPaidUsersFilter('active')}
                    style={{ 
                      padding: '8px 16px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600,
                      background: paidUsersFilter === 'active' ? 'rgba(34, 197, 94, 0.2)' : 'transparent',
                      color: paidUsersFilter === 'active' ? '#22c55e' : 'var(--text-secondary)'
                    }}
                  >
                    Active ({activeCount})
                  </button>
                  <button 
                    onClick={() => setPaidUsersFilter('expired')}
                    style={{ 
                      padding: '8px 16px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600,
                      background: paidUsersFilter === 'expired' ? 'rgba(244, 63, 94, 0.2)' : 'transparent',
                      color: paidUsersFilter === 'expired' ? '#f43f5e' : 'var(--text-secondary)'
                    }}
                  >
                    Expired ({expiredCount})
                  </button>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '16px', marginBottom: '24px', flexWrap: 'wrap' }}>
              <input 
                type="text" 
                placeholder="Search by student name, email, or ID..." 
                className="input-field"
                value={paidUsersSearch}
                onChange={e => setPaidUsersSearch(e.target.value)}
                style={{ flex: '1 1 300px', maxWidth: '500px' }}
              />
              
              <select 
                className="input-field" 
                value={paidUsersCourseFilter} 
                onChange={e => setPaidUsersCourseFilter(e.target.value)}
                style={{ flex: '0 0 250px' }}
              >
                <option value="all">All Plans / Courses</option>
                {courses.filter(c => c.price > 0).map(c => (
                  <option key={c.id} value={c.id}>{c.title}</option>
                ))}
              </select>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '900px' }}>
                <thead style={{ background: 'var(--bg-surface-elevated)', color: 'var(--text-secondary)', fontSize: '0.85rem', textTransform: 'uppercase' }}>
                  <tr>
                    <th style={{ padding: '16px' }}>User ID</th>
                    <th style={{ padding: '16px' }}>Student</th>
                    <th style={{ padding: '16px' }}>Active Plan</th>
                    <th style={{ padding: '16px' }}>Start Date</th>
                    <th style={{ padding: '16px' }}>Expiry Date</th>
                    <th style={{ padding: '16px' }}>Duration Left</th>
                    <th style={{ padding: '16px' }}>Status</th>
                    <th style={{ padding: '16px', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPaid.length === 0 ? (
                    <tr>
                      <td colSpan="8" style={{ padding: '60px', textAlign: 'center', color: 'var(--text-muted)' }}>
                        No paid users found matching your filters.
                      </td>
                    </tr>
                  ) : (
                    filteredPaid.map((p, idx) => {
                      const course = courses.find(c => c.id === p.courseId);
                      const isExpired = p.expiresAt && new Date(p.expiresAt) <= now;
                      const isExpiringSoon = p.expiresAt && (new Date(p.expiresAt) - now) / (1000 * 60 * 60 * 24) < 7 && !isExpired;
                      
                      let durationLeft = "Lifetime";
                      if (p.expiresAt) {
                         if (isExpired) {
                            durationLeft = "Expired";
                         } else {
                            const days = Math.ceil((new Date(p.expiresAt) - now) / (1000 * 60 * 60 * 24));
                            durationLeft = `${days} Days`;
                         }
                      }

                      return (
                        <tr key={`${p.userId}-${p.courseId}-${idx}`} style={{ borderBottom: '1px solid var(--border-color)', transition: 'background 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                          <td style={{ padding: '16px' }}>
                            <span style={{ fontFamily: 'monospace', background: 'rgba(255,255,255,0.05)', padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem' }}>
                              {p.uniqueId || '—'}
                            </span>
                          </td>
                          <td style={{ padding: '16px' }}>
                            <div style={{ fontWeight: 600 }}>{p.studentName}</div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{p.studentEmail}</div>
                          </td>
                          <td style={{ padding: '16px' }}>
                            <span style={{ color: 'var(--primary)', fontWeight: 500 }}>{course?.title || p.courseId}</span>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '4px' }}>{p.paymentStatus}</div>
                          </td>
                          <td style={{ padding: '16px', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                            {new Date(p.enrolledAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}
                          </td>
                          <td style={{ padding: '16px', fontSize: '0.9rem', color: isExpired ? 'var(--danger)' : isExpiringSoon ? 'var(--warning)' : 'var(--text-secondary)' }}>
                            {p.expiresAt ? new Date(p.expiresAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : '♾️ No Expiry'}
                          </td>
                          <td style={{ padding: '16px', fontSize: '0.9rem' }}>
                             <span style={{ 
                                color: isExpired ? 'var(--danger)' : isExpiringSoon ? 'var(--warning)' : 'var(--success)',
                                fontWeight: 600 
                             }}>
                                {durationLeft}
                             </span>
                          </td>
                          <td style={{ padding: '16px' }}>
                            <span style={{ 
                              fontSize: '0.75rem', 
                              padding: '6px 12px', 
                              borderRadius: '100px', 
                              fontWeight: 'bold',
                              background: isExpired ? 'rgba(244, 63, 94, 0.1)' : 'rgba(34, 197, 94, 0.1)',
                              color: isExpired ? '#f43f5e' : '#22c55e',
                              border: `1px solid ${isExpired ? '#f43f5e' : '#22c55e'}50`
                            }}>
                              {isExpired ? 'EXPIRED' : 'ACTIVE'}
                            </span>
                          </td>
                          <td style={{ padding: '16px', textAlign: 'right' }}>
                            <button onClick={() => {
                                const userObj = users.find(u => (u._id || u.id) === p.userId);
                                if (userObj) openAccessModal(userObj);
                              }}
                              style={{ background: 'rgba(14,165,233,0.1)', border: '1px solid rgba(14,165,233,0.3)', borderRadius: '6px', color: 'var(--primary)', cursor: 'pointer', padding: '6px 8px', display: 'inline-flex', alignItems: 'center' }}
                              title="Manage Course Access">
                              <ShieldCheck size={15} />
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
        );
      })()}

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

            <div style={{ marginBottom: '20px' }}>
              <input 
                type="text" 
                placeholder="Search by student name or email..." 
                className="input-field"
                value={usersSearch}
                onChange={e => setUsersSearch(e.target.value)}
                style={{ width: '100%', maxWidth: '500px' }}
              />
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '700px' }}>
                <thead>
                  <tr style={{ background: 'var(--bg-surface-elevated)', fontSize: '0.82rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    <th style={{ padding: '12px 16px', borderRadius: '8px 0 0 8px' }}>User ID</th>
                    <th style={{ padding: '12px 16px' }}>Name / Role</th>
                    <th style={{ padding: '12px 16px' }}>Email</th>
                    <th style={{ padding: '12px 16px' }}>Course Access</th>
                    <th style={{ padding: '12px 16px' }}>Last Login</th>
                    <th style={{ padding: '12px 16px', textAlign: 'right', borderRadius: '0 8px 8px 0' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.filter(u => 
                    u.name?.toLowerCase().includes(usersSearch.toLowerCase()) || 
                    u.email?.toLowerCase().includes(usersSearch.toLowerCase()) ||
                    u.uniqueId?.includes(usersSearch)
                  ).map(u => {
                    const isAdmin = u.role === 'admin';
                    // Unified access list
                    const accessList = u.courseAccess?.length > 0
                      ? u.courseAccess
                      : (u.purchasedCourses || []).map(id => ({ courseId: id, expiresAt: null }));

                    return (
                      <tr key={u._id || u.id} style={{ borderBottom: '1px solid var(--border-color)', transition: 'background 0.15s' }}
                         onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-surface-elevated)'}
                         onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>

                        <td style={{ padding: '14px 16px' }}>
                          <span style={{ fontFamily: 'monospace', background: 'rgba(255,255,255,0.05)', padding: '4px 8px', borderRadius: '4px', fontSize: '0.85rem' }}>
                            {u.uniqueId || '—'}
                          </span>
                        </td>
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
                      if(!newLesson.mediaUrl) return addToast("Please enter a link first", "warning");
                      const audio = new Audio(newLesson.mediaUrl);
                      audio.play().catch(e => addToast("Could not play. Link might be broken or private: " + e.message, "error"));
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
                          <span style={{ fontSize: '0.75rem', background: p.isUsed ? 'rgba(244,63,94,0.1)' : 'rgba(16,185,129,0.1)', color: p.isUsed ? 'var(--danger)' : 'var(--success)', padding: '4px 8px', borderRadius: '4px', fontWeight: 'bold', textTransform: 'uppercase' }}>
                            {p.isUsed ? `Used by ${users.find(u => (u._id || u.id).toString() === (p.usedBy?._id || p.usedBy)?.toString())?.name || 'Someone'}` : 'Unused'}
                          </span>
                          {p.usedAt && <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '4px' }}>{new Date(p.usedAt).toLocaleDateString()}</div>}
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

                <div className="input-group" style={{ gridColumn: 'span 2', background: 'rgba(14, 165, 233, 0.05)', padding: '20px', borderRadius: '8px', border: '1px dashed var(--primary)' }}>
                  <label className="input-label" style={{ color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Megaphone size={16} /> Broadcast Message (Visible to users)
                  </label>
                  <textarea 
                    className="input-field" 
                    value={globalSettings.announcementMessage} 
                    onChange={e => setGlobalSettings({...globalSettings, announcementMessage: e.target.value})} 
                    placeholder="Type a message to show on top of every page..."
                    style={{ minHeight: '80px', marginBottom: '12px' }}
                  />
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
                    <div>
                      <label className="input-label" style={{ fontSize: '0.8rem' }}>Display Until</label>
                      <input 
                        type="datetime-local" 
                        className="input-field" 
                        value={globalSettings.announcementExpiresAt ? new Date(new Date(globalSettings.announcementExpiresAt).getTime() - (new Date().getTimezoneOffset() * 60000)).toISOString().slice(0, 16) : ''} 
                        onChange={e => setGlobalSettings({...globalSettings, announcementExpiresAt: e.target.value})} 
                      />
                    </div>
                    <div>
                      <label className="input-label" style={{ fontSize: '0.8rem' }}>Popup Duration (Sec)</label>
                      <input 
                        type="number" 
                        className="input-field" 
                        value={globalSettings.announcementDuration || 10} 
                        onChange={e => setGlobalSettings({...globalSettings, announcementDuration: parseInt(e.target.value) || 0})} 
                        min="1"
                        max="300"
                      />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                      <button 
                        type="button" 
                        className="btn" 
                        style={{ width: '100%', background: 'rgba(244, 63, 94, 0.1)', color: 'var(--danger)', border: '1px solid var(--danger)' }}
                        onClick={() => setGlobalSettings({...globalSettings, announcementMessage: '', announcementExpiresAt: null, announcementDuration: 10})}
                      >
                        Clear Message
                      </button>
                    </div>
                  </div>
                </div>

                <button type="submit" className="btn btn-primary" style={{ marginTop: '12px', padding: '12px 32px' }}>Save Settings</button>
              </div>

              <div style={{ textAlign: 'center', background: 'var(--bg-base)', borderRadius: '12px', padding: '24px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <h4 style={{ marginBottom: '16px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>QR Code Preview</h4>
                {globalSettings.qrCodeUrl ? (
                  <img src={globalSettings.qrCodeUrl} alt="QR Code" style={{ maxWidth: '200px', borderRadius: '8px', boxShadow: 'var(--shadow-drop)', marginBottom: '16px' }} />
                ) : (
                  <div style={{ width: '200px', height: '200px', border: '2px dashed var(--border-color)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', marginBottom: '16px' }}>
                    No QR Uploaded
                  </div>
                )}
                <label style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '8px 16px', background: 'rgba(56, 189, 248, 0.1)', color: 'var(--primary)', border: '1px solid var(--primary)', borderRadius: '6px', fontSize: '0.9rem' }}>
                  <Upload size={16} /> Upload New QR
                  <input type="file" accept="image/*" onChange={handleQRUpload} style={{ display: 'none' }} />
                </label>
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
                        <label className="input-label">Support WhatsApp</label>
                        <input type="text" className="input-field" value={siteContent.contact.whatsapp} onChange={e => setSiteContent({...siteContent, contact: {...siteContent.contact, whatsapp: e.target.value}})} placeholder="Include country code (e.g. 919877878802)" />
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

      {/* ==================== EARNINGS TAB ==================== */}
      {activeTab === 'earnings' && (() => {
        const earningNow = new Date();
        const earningToday = new Date(); earningToday.setHours(0,0,0,0);
        const earningWeekAgo = new Date(); earningWeekAgo.setDate(earningWeekAgo.getDate() - 7);
        const earningMonthAgo = new Date(); earningMonthAgo.setMonth(earningMonthAgo.getMonth() - 1);

        // Build payment records from courseAccess grants
        const allRecords = [];
        users.forEach(user => {
          (user.courseAccess || []).forEach(a => {
            const course = courses.find(c => c.id === a.courseId);
            allRecords.push({
              userName: user.name,
              email: user.email,
              courseId: a.courseId,
              courseName: course?.title || a.courseId,
              amount: course?.price || 0,
              method: 'Admin Grant / Manual Approval',
              date: a.createdAt || user.createdAt || new Date().toISOString(),
              expiresAt: a.expiresAt,
              status: !a.expiresAt || new Date(a.expiresAt) > earningNow ? 'Active' : 'Expired',
            });
          });
        });

        // Revenue summaries
        const todayRev = allRecords.filter(r => new Date(r.date) >= earningToday).reduce((s,r) => s+r.amount, 0);
        const weekRev = allRecords.filter(r => new Date(r.date) >= earningWeekAgo).reduce((s,r) => s+r.amount, 0);
        const monthRev = allRecords.filter(r => new Date(r.date) >= earningMonthAgo).reduce((s,r) => s+r.amount, 0);
        const totalRev = allRecords.reduce((s,r) => s+r.amount, 0);

        // Filter records
        const filtered = allRecords.filter(r => {
          const matchSearch = !earningsSearch || r.userName?.toLowerCase().includes(earningsSearch.toLowerCase()) || r.email?.toLowerCase().includes(earningsSearch.toLowerCase());
          const matchCourse = earningsCourseFilter === 'all' || r.courseId === earningsCourseFilter;
          const matchStatus = earningsStatusFilter === 'all' || r.status.toLowerCase() === earningsStatusFilter;
          const d = new Date(r.date);
          const matchDate = earningsDateFilter === 'all' ? true
            : earningsDateFilter === 'today' ? d >= earningToday
            : earningsDateFilter === 'week' ? d >= earningWeekAgo
            : d >= earningMonthAgo;
          return matchSearch && matchCourse && matchStatus && matchDate;
        });

        const summaryCards = [
          { label: "Today's Revenue", value: `₹${todayRev.toLocaleString()}`, color: '14, 165, 233' },
          { label: 'This Week', value: `₹${weekRev.toLocaleString()}`, color: '16, 185, 129' },
          { label: 'This Month', value: `₹${monthRev.toLocaleString()}`, color: '249, 115, 22' },
          { label: 'All-Time Revenue', value: `₹${totalRev.toLocaleString()}`, color: '234, 179, 8' },
        ];

        return (
          <div>
            <div style={{ marginBottom: '24px' }}>
              <h2 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '4px' }}>Earnings & Revenue</h2>
              <p style={{ color: 'var(--text-secondary)' }}>Track all course access grants and estimated revenue.</p>
            </div>

            {/* Revenue Summary Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginBottom: '28px' }}>
              {summaryCards.map(c => (
                <div key={c.label} className="glass-card" style={{ padding: '20px', borderLeft: `3px solid rgba(${c.color}, 0.6)` }}>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>{c.label}</p>
                  <h3 style={{ fontSize: '1.8rem', fontWeight: 800, color: `rgb(${c.color})` }}>{c.value}</h3>
                </div>
              ))}
            </div>

            {/* Filters */}
            <div className="glass-panel" style={{ padding: '24px', marginBottom: '20px' }}>
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
                <input type="text" placeholder="Search by name or email..." className="input-field"
                  value={earningsSearch} onChange={e => setEarningsSearch(e.target.value)}
                  style={{ flex: '1 1 200px', maxWidth: '320px' }} />
                <select className="input-field" value={earningsCourseFilter} onChange={e => setEarningsCourseFilter(e.target.value)} style={{ flex: '0 0 200px' }}>
                  <option value="all">All Courses</option>
                  {courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                </select>
                <select className="input-field" value={earningsDateFilter} onChange={e => setEarningsDateFilter(e.target.value)} style={{ flex: '0 0 160px' }}>
                  <option value="all">All Time</option>
                  <option value="today">Today</option>
                  <option value="week">This Week</option>
                  <option value="month">This Month</option>
                </select>
                <select className="input-field" value={earningsStatusFilter} onChange={e => setEarningsStatusFilter(e.target.value)} style={{ flex: '0 0 140px' }}>
                  <option value="all">All Status</option>
                  <option value="active">Active</option>
                  <option value="expired">Expired</option>
                </select>
              </div>
            </div>

            {/* Payment Records Table */}
            <div className="glass-panel" style={{ padding: '0', overflow: 'hidden' }}>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '900px' }}>
                  <thead style={{ background: 'var(--bg-surface-elevated)', color: 'var(--text-secondary)', fontSize: '0.82rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    <tr>
                      <th style={{ padding: '16px' }}>User</th>
                      <th style={{ padding: '16px' }}>Course / Plan</th>
                      <th style={{ padding: '16px' }}>Amount</th>
                      <th style={{ padding: '16px' }}>Method</th>
                      <th style={{ padding: '16px' }}>Grant Date</th>
                      <th style={{ padding: '16px' }}>Expiry</th>
                      <th style={{ padding: '16px' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.length === 0 ? (
                      <tr><td colSpan="7" style={{ padding: '60px', textAlign: 'center', color: 'var(--text-muted)' }}>No payment records found matching your filters.</td></tr>
                    ) : filtered.map((r, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid var(--border-color)' }}
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                        <td style={{ padding: '14px 16px' }}>
                          <div style={{ fontWeight: 600 }}>{r.userName}</div>
                          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{r.email}</div>
                        </td>
                        <td style={{ padding: '14px 16px', color: 'var(--primary)', fontWeight: 500 }}>{r.courseName}</td>
                        <td style={{ padding: '14px 16px' }}>
                          <span style={{ fontWeight: 800, fontSize: '1.1rem', color: r.amount > 0 ? 'var(--success)' : 'var(--text-muted)' }}>
                            {r.amount > 0 ? `₹${r.amount}` : 'Free'}
                          </span>
                        </td>
                        <td style={{ padding: '14px 16px', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>{r.method}</td>
                        <td style={{ padding: '14px 16px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                          {r.date ? new Date(r.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                        </td>
                        <td style={{ padding: '14px 16px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                          {r.expiresAt ? new Date(r.expiresAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '♾️ Lifetime'}
                        </td>
                        <td style={{ padding: '14px 16px' }}>
                          <span style={{ fontSize: '0.72rem', padding: '4px 10px', borderRadius: '100px', fontWeight: 700,
                            background: r.status === 'Active' ? 'rgba(16,185,129,0.1)' : 'rgba(244,63,94,0.1)',
                            color: r.status === 'Active' ? '#22c55e' : '#f43f5e',
                            border: `1px solid ${r.status === 'Active' ? '#22c55e' : '#f43f5e'}50`
                          }}>{r.status}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ==================== LEADERBOARDS TAB ==================== */}
      {activeTab === 'leaderboards' && (() => {
        const selectedCourse = courses.find(c => c.id === lbSelectedCourseId);
        const allLessons = selectedCourse
          ? selectedCourse.levels.flatMap(l => l.lessons.map(ls => ({ ...ls, levelTitle: l.title })))
          : [];
        const lbAttempts = lbSelectedLessonId
          ? attempts.filter(a => a.lessonId === lbSelectedLessonId)
              .sort((a,b) => b.accuracy - a.accuracy || b.wpm - a.wpm || a.fullMistakes - b.fullMistakes)
          : [];

        return (
          <div>
            <div style={{ marginBottom: '24px' }}>
              <h2 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '4px' }}>Test Leaderboards</h2>
              <p style={{ color: 'var(--text-secondary)' }}>View per-test rankings — select a course and test below.</p>
            </div>

            <div className="glass-panel" style={{ padding: '24px', marginBottom: '24px' }}>
              <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                <div style={{ flex: '1 1 250px' }}>
                  <label className="input-label">Select Course</label>
                  <select className="input-field" value={lbSelectedCourseId} onChange={e => { setLbSelectedCourseId(e.target.value); setLbSelectedLessonId(''); }}>
                    <option value="">-- Choose a course --</option>
                    {courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                  </select>
                </div>
                {lbSelectedCourseId && (
                  <div style={{ flex: '1 1 250px' }}>
                    <label className="input-label">Select Test</label>
                    <select className="input-field" value={lbSelectedLessonId} onChange={e => setLbSelectedLessonId(e.target.value)}>
                      <option value="">-- Choose a test --</option>
                      {allLessons.map(ls => <option key={ls.id} value={ls.id}>[{ls.levelTitle}] {ls.title}</option>)}
                    </select>
                  </div>
                )}
              </div>
            </div>

            {lbSelectedLessonId ? (
              <div className="glass-panel" style={{ padding: '0', overflow: 'hidden' }}>
                <div style={{ padding: '20px 24px', background: 'var(--bg-surface-elevated)', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h3 style={{ fontWeight: 700, margin: 0 }}>{allLessons.find(l => l.id === lbSelectedLessonId)?.title || 'Test'} — Leaderboard</h3>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', margin: '2px 0 0' }}>{lbAttempts.length} total attempts · Ranked by Accuracy → WPM → Fewest Mistakes</p>
                  </div>
                  <Trophy size={24} style={{ color: '#f59e0b' }}/>
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '750px' }}>
                    <thead style={{ background: 'rgba(255,255,255,0.02)', color: 'var(--text-secondary)', fontSize: '0.82rem', textTransform: 'uppercase' }}>
                      <tr>
                        <th style={{ padding: '14px 16px' }}>Rank</th>
                        <th style={{ padding: '14px 16px' }}>Student</th>
                        <th style={{ padding: '14px 16px' }}>WPM</th>
                        <th style={{ padding: '14px 16px' }}>Accuracy</th>
                        <th style={{ padding: '14px 16px' }}>Mistakes</th>
                        <th style={{ padding: '14px 16px' }}>Duration</th>
                        <th style={{ padding: '14px 16px' }}>Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {lbAttempts.length === 0 ? (
                        <tr><td colSpan="7" style={{ padding: '60px', textAlign: 'center', color: 'var(--text-muted)' }}>No attempts for this test yet.</td></tr>
                      ) : lbAttempts.map((a, i) => {
                        const rankColors = ['#f59e0b', '#94a3b8', '#b45309'];
                        const rankEmoji = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : null;
                        return (
                          <tr key={a._id || i} style={{ borderBottom: '1px solid var(--border-color)' }}
                            onMouseEnter={e => e.currentTarget.style.background = i < 3 ? `rgba(${i===0?'234,179,8':i===1?'148,163,184':'180,83,9'},0.05)` : 'rgba(255,255,255,0.02)'}
                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                            <td style={{ padding: '14px 16px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 800, color: rankColors[i] || 'var(--text-secondary)', fontSize: '1.1rem' }}>
                                {rankEmoji || `#${i+1}`}
                              </div>
                            </td>
                            <td style={{ padding: '14px 16px', fontWeight: 600 }}>{a.userName || 'Student'}</td>
                            <td style={{ padding: '14px 16px', color: 'var(--primary)', fontWeight: 700 }}>{a.wpm}</td>
                            <td style={{ padding: '14px 16px' }}>
                              <span style={{ color: parseFloat(a.accuracy) >= 95 ? 'var(--success)' : parseFloat(a.accuracy) >= 85 ? '#f59e0b' : 'var(--danger)', fontWeight: 700 }}>{a.accuracy}%</span>
                            </td>
                            <td style={{ padding: '14px 16px', fontSize: '0.85rem' }}>
                              <span style={{ color: 'var(--danger)' }}>F:{a.fullMistakes || 0}</span>
                              {' '}
                              <span style={{ color: '#f59e0b' }}>H:{a.halfMistakes || 0}</span>
                            </td>
                            <td style={{ padding: '14px 16px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                              {a.duration ? `${Math.floor(a.duration/60)}m ${a.duration%60}s` : '—'}
                            </td>
                            <td style={{ padding: '14px 16px', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                              {a.timestamp ? new Date(a.timestamp).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '—'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '80px 40px', border: '2px dashed var(--border-color)', borderRadius: '20px', color: 'var(--text-muted)' }}>
                <Trophy size={48} style={{ marginBottom: '16px', opacity: 0.3 }} />
                <p style={{ fontSize: '1.1rem' }}>Select a course and test above to view its leaderboard.</p>
              </div>
            )}
          </div>
        );
      })()}

      </div>
    </div>
  );
}
