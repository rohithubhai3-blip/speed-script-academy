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
        <Link to="/courses" className="btn btn-primary" style={{ padding: '12px 24px' }}>
          Resume Practice
        </Link>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px', marginBottom: '40px' }}>
        <div className="glass-card" style={{ padding: '24px', display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div style={{ background: 'rgba(56, 189, 248, 0.1)', padding: '16px', borderRadius: 'var(--radius-full)' }}>
            <Hash size={28} className="text-primary" />
          </div>
          <div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '4px' }}>Total Tests</p>
            <h3 style={{ fontSize: '2rem' }}>{total}</h3>
          </div>
        </div>
        
        <div className="glass-card" style={{ padding: '24px', display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div style={{ background: 'rgba(45, 212, 191, 0.1)', padding: '16px', borderRadius: 'var(--radius-full)', color: 'var(--accent)' }}>
            <TrendingUp size={28} />
          </div>
          <div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '4px' }}>Average WPM</p>
            <h3 style={{ fontSize: '2rem' }}>{avgWPM}</h3>
          </div>
        </div>

        <div className="glass-card" style={{ padding: '24px', display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div style={{ background: 'rgba(129, 140, 248, 0.1)', padding: '16px', borderRadius: 'var(--radius-full)', color: 'var(--secondary)' }}>
            <Target size={28} />
          </div>
          <div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '4px' }}>Avg Accuracy</p>
            <h3 style={{ fontSize: '2rem' }}>{avgAcc}%</h3>
          </div>
        </div>

        <div className="glass-card" style={{ padding: '24px', display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div style={{ background: 'rgba(245, 158, 11, 0.1)', padding: '16px', borderRadius: 'var(--radius-full)', color: 'var(--warning)' }}>
            <Award size={28} />
          </div>
          <div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '4px' }}>Best Score</p>
            <h3 style={{ fontSize: '2rem' }}>{bestAcc}%</h3>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '40px', marginBottom: '40px' }}>
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
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                <th style={{ padding: '16px 8px' }}>Date</th>
                <th style={{ padding: '16px 8px' }}>WPM</th>
                <th style={{ padding: '16px 8px' }}>Accuracy</th>
                <th style={{ padding: '16px 8px' }}>Mistakes</th>
              </tr>
            </thead>
            <tbody>
              {attempts.slice(0, 5).map(a => (
                <tr key={a.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <td style={{ padding: '16px 8px' }}>{new Date(a.timestamp).toLocaleDateString()}</td>
                  <td style={{ padding: '16px 8px', fontWeight: 'bold' }}>{a.wpm}</td>
                  <td style={{ padding: '16px 8px', color: parseFloat(a.accuracy) > 90 ? 'var(--success)' : (parseFloat(a.accuracy) > 70 ? 'var(--warning)' : 'var(--danger)') }}>{a.accuracy}%</td>
                  <td style={{ padding: '16px 8px' }}>{a.mistakes}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p style={{ color: 'var(--text-secondary)' }}>No recent attempts found.</p>
        )}
      </div>
    </div>
  );
}
