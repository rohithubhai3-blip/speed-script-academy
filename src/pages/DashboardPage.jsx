import { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { Award, Target, Hash, TrendingUp } from 'lucide-react';
import { db } from '../data/db';
import useStore from '../store/useStore';
import { Link } from 'react-router-dom';

export default function DashboardPage() {
  const user = useStore(state => state.user);
  const [attempts, setAttempts] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [attemptsData, coursesData] = await Promise.all([
          db.getUserAttempts(user.id),
          db.getCourses()
        ]);
        setAttempts(attemptsData);
        setCourses(coursesData);
      } catch (err) {
        console.error("Dashboard Load Error:", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [user.id]);

  if (loading) return <div style={{ padding: '40px', textAlign: 'center' }}>Loading dashboard...</div>;

  const total = attempts.length;
  const avgWPM = total > 0 ? (attempts.reduce((acc, a) => acc + a.wpm, 0) / total).toFixed(0) : 0;
  const avgAcc = total > 0 ? (attempts.reduce((acc, a) => acc + parseFloat(a.accuracy), 0) / total).toFixed(1) : 0;
  const bestAcc = total > 0 ? Math.max(...attempts.map(a => parseFloat(a.accuracy))) : 0;

  const chartData = attempts.map((a, i) => ({
    name: `Test ${total - i}`, // Since they are sorted descending by timestamp
    accuracy: parseFloat(a.accuracy),
    wpm: a.wpm
  })).reverse(); // Show chronological order

  return (
    <div style={{ padding: '0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div>
          <h1 style={{ fontSize: '2.5rem', marginBottom: '8px' }}>Welcome back, {user.name}!</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Here's an overview of your stenography progress.</p>
        </div>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <Link to="/my-results" className="btn btn-outline" style={{ padding: '12px 24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            📋 My Results
          </Link>
          <Link to="/courses" className="btn btn-primary" style={{ padding: '12px 24px' }}>
            Resume Practice
          </Link>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginBottom: '32px' }}>
        <div className="glass-card" style={{ padding: '22px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ background: 'rgba(56, 189, 248, 0.1)', padding: '14px', borderRadius: 'var(--radius-full)' }}>
            <Hash size={26} className="text-primary" />
          </div>
          <div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', marginBottom: '4px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Tests</p>
            <h3 style={{ fontSize: '1.8rem', lineHeight: 1 }}>{total}</h3>
          </div>
        </div>
        
        <div className="glass-card" style={{ padding: '22px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ background: 'rgba(45, 212, 191, 0.1)', padding: '14px', borderRadius: 'var(--radius-full)', color: 'var(--accent)' }}>
            <TrendingUp size={26} />
          </div>
          <div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', marginBottom: '4px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Avg WPM</p>
            <h3 style={{ fontSize: '1.8rem', lineHeight: 1 }}>{avgWPM}</h3>
          </div>
        </div>

        <div className="glass-card" style={{ padding: '22px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ background: 'rgba(129, 140, 248, 0.1)', padding: '14px', borderRadius: 'var(--radius-full)', color: 'var(--secondary)' }}>
            <Target size={26} />
          </div>
          <div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', marginBottom: '4px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Avg Accuracy</p>
            <h3 style={{ fontSize: '1.8rem', lineHeight: 1 }}>{avgAcc}%</h3>
          </div>
        </div>

        <div className="glass-card" style={{ padding: '22px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ background: 'rgba(245, 158, 11, 0.1)', padding: '14px', borderRadius: 'var(--radius-full)', color: 'var(--warning)' }}>
            <Award size={26} />
          </div>
          <div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', marginBottom: '4px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Best Score</p>
            <h3 style={{ fontSize: '1.8rem', lineHeight: 1 }}>{bestAcc}%</h3>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px', marginBottom: '32px' }}>
        <div className="glass-card" style={{ padding: '32px' }}>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '32px' }}>Performance Trend</h2>
          {total > 0 ? (
            <div style={{ width: '100%', height: '350px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="name" stroke="var(--text-secondary)" />
                  <YAxis dataKey="accuracy" domain={[0, 100]} stroke="var(--text-secondary)" />
                  <Tooltip contentStyle={{ background: 'var(--bg-surface-elevated)', border: '1px solid var(--border-color)', borderRadius: '8px' }} />
                  <Line type="monotone" dataKey="accuracy" stroke="var(--primary)" strokeWidth={3} dot={{ r: 4, fill: 'var(--primary)' }} activeDot={{ r: 8 }} />
                  <Line type="monotone" dataKey="wpm" stroke="var(--secondary)" strokeWidth={3} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
              <p>No test data available yet. Complete a test to view your timeline.</p>
            </div>
          )}
        </div>

        <div id="library" className="glass-card" style={{ padding: '32px' }}>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '24px' }}>My Library</h2>
          {(!user?.purchasedCourses || user.purchasedCourses.length === 0) ? (
            <div style={{ textAlign: 'center', border: '1px solid rgba(255,255,255,0.1)', padding: '32px', borderRadius: '8px' }}>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '16px' }}>You haven't unlocked any premium courses yet.</p>
              <Link to="/courses" className="btn btn-outline" style={{ color: 'var(--primary)', borderColor: 'var(--primary)' }}>Browse Catalog</Link>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxHeight: '420px', overflowY: 'auto', paddingRight: '8px' }}>
              {user.purchasedCourses.map((id, idx) => {
                const course = courses.find(c => c.id === id || c._id === id);
                return (
                  <div key={idx} style={{ 
                    background: 'rgba(255,255,255,0.02)', 
                    padding: '20px', 
                    borderRadius: '16px', 
                    border: '1px solid var(--border-color)', 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    transition: 'transform 0.2s',
                  }}>
                    <div>
                      <div style={{ fontWeight: 700, color: 'var(--primary)', fontSize: '1.1rem', marginBottom: '4px' }}>
                        {course?.title || `Course ${id}`}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        Status: <span style={{ color: 'var(--success)', fontWeight: 'bold' }}>Unlocked</span>
                      </div>
                    </div>
                    <Link to={course ? `/courses` : "/courses"} className="btn btn-primary" style={{ padding: '8px 20px', fontSize: '0.9rem', borderRadius: 'var(--radius-full)' }}>
                      Practice
                    </Link>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div className="glass-card" style={{ padding: '32px' }}>
        <h2 style={{ fontSize: '1.5rem', marginBottom: '24px' }}>Recent Attempts</h2>
        {total > 0 ? (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                  <th style={{ padding: '14px 10px', fontWeight: 700 }}>Date</th>
                  <th style={{ padding: '14px 10px', fontWeight: 700 }}>Lesson</th>
                  <th style={{ padding: '14px 10px', fontWeight: 700 }}>WPM</th>
                  <th style={{ padding: '14px 10px', fontWeight: 700 }}>Accuracy</th>
                  <th style={{ padding: '14px 10px', fontWeight: 700 }}>Error %</th>
                  <th style={{ padding: '14px 10px', fontWeight: 700 }}>Full ❌</th>
                  <th style={{ padding: '14px 10px', fontWeight: 700 }}>Half ⚠️</th>
                  <th style={{ padding: '14px 10px', fontWeight: 700 }}>Result</th>
                </tr>
              </thead>
              <tbody>
                {attempts.slice(0, 20).map((a, idx) => {
                  const isPassed = a.passed ?? (parseFloat(a.accuracy) >= 95);
                  return (
                    <tr key={a._id || idx} style={{ borderBottom: '1px solid rgba(148,163,184,0.08)', transition: 'background 0.15s' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(14,165,233,0.04)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      <td style={{ padding: '13px 10px', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                        {new Date(a.timestamp).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' })}
                      </td>
                      <td style={{ padding: '13px 10px', fontWeight: 600, maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {a.lessonTitle || a.lessonId || '—'}
                      </td>
                      <td style={{ padding: '13px 10px', fontWeight: 700, color: 'var(--primary)' }}>{a.wpm}</td>
                      <td style={{ padding: '13px 10px', fontWeight: 600, color: parseFloat(a.accuracy) > 90 ? 'var(--success)' : parseFloat(a.accuracy) > 70 ? 'var(--warning)' : 'var(--danger)' }}>
                        {parseFloat(a.accuracy).toFixed(1)}%
                      </td>
                      <td style={{ padding: '13px 10px', color: parseFloat(a.errorPercent) > 5 ? 'var(--danger)' : 'var(--success)' }}>
                        {a.errorPercent != null ? parseFloat(a.errorPercent).toFixed(2) + '%' : '—'}
                      </td>
                      <td style={{ padding: '13px 10px', color: (a.fullMistakes > 0) ? '#ef4444' : 'var(--text-muted)' }}>
                        {a.fullMistakes ?? '—'}
                      </td>
                      <td style={{ padding: '13px 10px', color: (a.halfMistakes > 0) ? '#f59e0b' : 'var(--text-muted)' }}>
                        {a.halfMistakes ?? '—'}
                      </td>
                      <td style={{ padding: '13px 10px' }}>
                        <span style={{
                          padding: '4px 10px', borderRadius: '100px', fontSize: '0.72rem', fontWeight: 700,
                          background: isPassed ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.1)',
                          color: isPassed ? 'var(--success)' : 'var(--danger)',
                          border: `1px solid ${isPassed ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`
                        }}>
                          {isPassed ? 'PASS' : 'FAIL'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-secondary)' }}>
            <p style={{ marginBottom: '8px' }}>No attempts yet.</p>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Complete a test to see your results here.</p>
          </div>
        )}
      </div>
    </div>
  );
}

