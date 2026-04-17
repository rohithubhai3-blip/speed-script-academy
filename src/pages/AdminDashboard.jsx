import { useEffect, useState } from 'react';
import { db } from '../data/db';
import { Users, FileDiff, Server, Plus, List, Settings, Edit3, Eye, Upload, QrCode, CheckCircle2, MessageSquare } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('overview'); // overview | users | courses
  const navigate = useNavigate();

  const [users, setUsers] = useState([]);
  const [attempts, setAttempts] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [globalSettings, setGlobalSettings] = useState({ upiId: '', whatsappNumber: '', qrCodeUrl: '' });
  const [pendingRequests, setPendingRequests] = useState([]);
  const [siteContent, setSiteContent] = useState(null);

  // Forms states
  const [newUser, setNewUser] = useState({ name: '', email: '', password: '', role: 'user' });
  
  const [editingCourseId, setEditingCourseId] = useState(null);
  const [newCourse, setNewCourse] = useState({ title: '', description: '', price: 0 });
  
  const [editingLessonConfig, setEditingLessonConfig] = useState(null); // {courseId, levelId, lessonId}
  
  const [activeCourseIdForLesson, setActiveCourseIdForLesson] = useState('');
  const [activeLevelIdForLesson, setActiveLevelIdForLesson] = useState('level-normal');
  const [newLesson, setNewLesson] = useState({
    title: '', 
    timeLimit: '00:05:00', // HH:MM:SS
    passage: '', 
    mediaUrl: '', 
    mediaType: 'audio',
    allowedErrorPercent: 5, 
    capRule: 'Ignore', 
    punctRule: 'Ignore', 
    similarWordRule: 'Allow (Half Mistake)',
    baseWpm: 80
  });

  const [promos, setPromos] = useState([]);

  const loadData = async () => {
    try {
      setLoading(true);
      const u = await db.getAllUsers();
      const a = await db.getAllAttempts();
      const c = await db.getCourses();
      const p = await db.getPromos();
      const s = await db.getGlobalSettings();
      const r = await db.getPendingRequests();
      const sc = await db.getSiteContent();
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

  const handleSaveCourse = async (e) => {
    e.preventDefault();
    try {
      if (editingCourseId) {
        await db.editCourse(editingCourseId, newCourse);
        alert("Course updated!");
      } else {
        await db.addCourse(newCourse);
        alert("Course created!");
      }
      setEditingCourseId(null);
      setNewCourse({ title: '', description: '', price: 0 });
      loadData();
    } catch (err) { alert(err.message); }
  };

  const startEditCourse = (c) => {
    setEditingCourseId(c.id);
    setNewCourse({ title: c.title, description: c.description || '', price: c.price || 0 });
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
    setNewLesson({ ...lesson });
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
      await db.purchaseCourse(userId, courseId); // This also removes the request automatically in db.js
      alert("Course approved and unlocked for user!");
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
        await db.addLesson(activeCourseIdForLesson, activeLevelIdForLesson, newLesson);
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
        baseWpm: 80
      });
      loadData();
    } catch (err) { 
      if (err.name === 'QuotaExceededError') {
         alert("Storage Limit Exceeded! The video/audio file is too large for Local Storage. Please use a public URL link instead until Firebase is connected.");
      } else {
         alert(err.message); 
      }
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 4 * 1024 * 1024) {
      alert("Warning: Files larger than 4MB may fail to save in LocalStorage prototype. Consider using a URL instead.");
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setNewLesson(prev => ({ ...prev, mediaUrl: event.target.result }));
    };
    reader.readAsDataURL(file);
  };

  if (loading) return <div style={{ padding: '40px', textAlign: 'center' }}>Loading admin dashboard...</div>;

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
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '24px' }}>
          <div className="glass-panel" style={{ padding: '32px' }}>
            <h2 style={{ fontSize: '1.5rem', marginBottom: '24px' }}>Registered Users</h2>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                    <th style={{ padding: '16px 8px' }}>Name</th>
                    <th style={{ padding: '16px 8px' }}>Email</th>
                    <th style={{ padding: '16px 8px' }}>Role</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '16px 8px', fontWeight: 500 }}>{u.name}</td>
                      <td style={{ padding: '16px 8px', color: 'var(--text-secondary)' }}>{u.email}</td>
                      <td style={{ padding: '16px 8px' }}>
                        <span style={{ fontSize: '0.75rem', background: u.role === 'admin' ? 'var(--warning)' : 'rgba(56,189,248,0.2)', color: u.role === 'admin' ? '#000' : 'var(--primary)', padding: '4px 8px', borderRadius: '4px', fontWeight: 'bold', textTransform: 'uppercase' }}>
                          {u.role}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <form onSubmit={handleCreateUser} className="glass-panel" style={{ padding: '32px', alignSelf: 'start' }}>
            <h2 style={{ fontSize: '1.5rem', marginBottom: '24px' }}>Add New User</h2>
            
            <div className="input-group">
              <label className="input-label">Full Name</label>
              <input type="text" required className="input-field" value={newUser.name} onChange={e => setNewUser({...newUser, name: e.target.value})} />
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
                <option value="user">User</option>
                <option value="admin">Admin</option>
              </select>
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '16px' }}><Plus size={18}/> Create User</button>
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
                {editingCourseId && <button type="button" onClick={() => { setEditingCourseId(null); setNewCourse({title:'', description:'', price: 0}); }} className="btn btn-outline" style={{ padding: '4px 12px', fontSize: '0.8rem' }}>Cancel</button>}
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
              <button type="submit" className={editingCourseId ? "btn btn-primary" : "btn btn-outline"} style={{ width: '100%', marginTop: '16px' }}>
                <Plus size={18}/> {editingCourseId ? 'Save Course Updates' : 'Create Course Category'}
              </button>
            </form>

            <div className="glass-panel" style={{ padding: '32px', maxHeight: '600px', overflowY: 'auto' }}>
              <h2 style={{ fontSize: '1.5rem', marginBottom: '24px' }}>Existing Courses Structure</h2>
              {courses.map(c => (
                <div key={c.id} style={{ marginBottom: '16px', background: 'var(--bg-base)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ color: 'var(--primary)' }}>{c.title}</h3>
                    <button onClick={() => startEditCourse(c)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }} title="Edit Course Info"><Edit3 size={18} /></button>
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
              {editingLessonConfig && <button type="button" onClick={() => { setEditingLessonConfig(null); setNewLesson({ title: '', timeLimit: '00:05:00', passage: '', mediaUrl: '', mediaType: 'audio', allowedErrorPercent: 5, capRule: 'Ignore', punctRule: 'Ignore', similarWordRule: 'Allow (Half Mistake)', baseWpm: 80 }); }} className="btn btn-outline" style={{ padding: '4px 12px', fontSize: '0.8rem' }}>Cancel</button>}
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
                <input type="number" min="0" max="100" required className="input-field" value={newLesson.allowedErrorPercent} onChange={e => setNewLesson({...newLesson, allowedErrorPercent: parseInt(e.target.value)})} />
              </div>
            </div>

            <div className="input-group">
              <label className="input-label">Audio</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '10px' }}>
                <input type="text" className="input-field" value={newLesson.mediaUrl} onChange={e => setNewLesson({...newLesson, mediaUrl: e.target.value})} placeholder="Audio stream URL or base64" />
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(14, 165, 233, 0.05)', color: 'var(--primary)', padding: '0 16px', borderRadius: '4px', fontSize: '0.8rem', cursor: 'pointer', border: '1px solid var(--border-color)' }}>
                  <Upload size={14} />
                  <input type="file" accept="audio/*" onChange={handleFileUpload} style={{ display: 'none' }} />
                </label>
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
                    const student = users.find(u => u.id === req.userId);
                    const course = courses.find(c => c.id === req.courseId);
                    return (
                      <tr key={req.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                        <td style={{ padding: '16px' }}>
                          <div style={{ fontWeight: 'bold' }}>{student?.name || 'Unknown'}</div>
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{student?.email}</div>
                        </td>
                        <td style={{ padding: '16px' }}>
                          <span style={{ color: 'var(--primary)', fontWeight: 500 }}>{course?.title || 'Unknown Course'}</span>
                        </td>
                        <td style={{ padding: '16px', color: 'var(--text-secondary)' }}>
                          {new Date(req.timestamp).toLocaleString()}
                        </td>
                        <td style={{ padding: '16px', textAlign: 'right' }}>
                          <button 
                            className="btn btn-primary" 
                            style={{ padding: '8px 16px', fontSize: '0.85rem' }}
                            onClick={() => handleApproveRequest(req.id, req.userId, req.courseId)}
                          >
                            <CheckCircle2 size={16} /> Approve Access
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
              <div className="glass-panel" style={{ padding: '32px' }}>
                <h3 style={{ marginBottom: '24px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>Main Sections & Pages</h3>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <div className="input-group">
                    <label className="input-label">Hero Title</label>
                    <input type="text" className="input-field" value={siteContent.hero.title} onChange={e => setSiteContent({...siteContent, hero: {...siteContent.hero, title: e.target.value}})} />
                  </div>
                  <div className="input-group">
                    <label className="input-label">Hero Subtitle</label>
                    <textarea className="input-field" style={{ minHeight: '80px' }} value={siteContent.hero.subtitle} onChange={e => setSiteContent({...siteContent, hero: {...siteContent.hero, subtitle: e.target.value}})} />
                  </div>

                  {['about', 'privacy', 'refund'].map(pageKey => (
                     <div key={pageKey} style={{ background: 'var(--bg-base)', padding: '16px', borderRadius: '8px', marginTop: '10px' }}>
                        <h4 style={{ textTransform: 'capitalize', marginBottom: '12px', fontSize: '1rem' }}>{pageKey} Page</h4>
                        <div className="input-group">
                          <label className="input-label">Title</label>
                          <input type="text" className="input-field" value={siteContent[pageKey].title} onChange={e => setSiteContent({...siteContent, [pageKey]: {...siteContent[pageKey], title: e.target.value}})} />
                        </div>
                        <div className="input-group">
                          <label className="input-label">Long Content (Markdown Support)</label>
                          <textarea className="input-field" style={{ minHeight: '150px' }} value={siteContent[pageKey].content} onChange={e => setSiteContent({...siteContent, [pageKey]: {...siteContent[pageKey], content: e.target.value}})} />
                        </div>
                     </div>
                  ))}
                </div>
              </div>

              {/* FAQ & Dynamic Lists Section */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                
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
                    <button className="btn btn-outline w-full" onClick={() => setSiteContent({...siteContent, faq: [...siteContent.faq, {q: 'New Question', a: 'New Answer'}]})}>+ Add FAQ Item</button>
                  </div>
                </div>

                <div className="glass-panel" style={{ padding: '32px' }}>
                  <h3 style={{ marginBottom: '24px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>Contact Information</h3>
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
    </div>
  );
}
