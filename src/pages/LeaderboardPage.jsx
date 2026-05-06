import React, { useEffect, useState } from 'react';
import { Trophy, Medal, MapPin, Award, Timer, Target, Info } from 'lucide-react';
import { db } from '../data/db';
import useStore from '../store/useStore';

export default function LeaderboardPage() {
  const [filter, setFilter] = useState('weekly');
  const [courses, setCourses] = useState([]);
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [selectedLessonId, setSelectedLessonId] = useState('');
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const user = useStore(s => s.user);

  useEffect(() => {
    async function init() {
      try {
        const c = await db.getCourses();
        setCourses(c);
      } catch (err) {
        console.error("Failed to load courses for leaderboard", err);
      }
    }
    init();
  }, []);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const res = await db.getLeaderboard(filter, selectedLessonId);
        setData(res);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [filter, selectedLessonId]);

  const selectedCourse = courses.find(c => c.id === selectedCourseId);
  const availableLessons = selectedCourse 
    ? selectedCourse.levels.flatMap(l => l.lessons) 
    : [];
  const selectedLesson = availableLessons.find(l => l.id === selectedLessonId);

  const top3 = data.slice(0, 3);
  const restUser = data.slice(3);

  const getMedalColor = (idx) => {
    if (idx === 0) return '#fbbf24'; // Gold
    if (idx === 1) return '#94a3b8'; // Silver
    if (idx === 2) return '#b45309'; // Bronze
    return 'var(--text-secondary)';
  };

  return (
    <div style={{ padding: '0', animation: 'fadeIn 0.3s ease-out' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '32px', flexWrap: 'wrap', gap: '20px' }}>
        <div style={{ flex: '1 1 300px' }}>
          <h1 style={{ fontSize: '2.5rem', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Trophy color="#fbbf24" size={36} /> {selectedLesson ? 'Test Leaderboard' : 'Global Leaderboard'}
          </h1>
          <p style={{ color: 'var(--text-secondary)' }}>
            {selectedLesson ? `Viewing rankings for test: ${selectedLesson.title}` : 'Compete with top shorthand learners across all tests.'} Filter by time or select a specific test.
          </p>
        </div>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'flex-end' }}>
          {/* COURSE & TEST SELECTORS */}
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            <select 
              value={selectedCourseId} 
              onChange={e => {
                setSelectedCourseId(e.target.value);
                setSelectedLessonId(''); // Reset lesson when course changes
              }}
              style={{
                background: 'var(--bg-surface)', color: 'var(--text-primary)', border: '1px solid var(--border-color)',
                padding: '8px 12px', borderRadius: '8px', fontSize: '0.9rem', outline: 'none', cursor: 'pointer'
              }}
            >
              <option value="">All Courses (Global)</option>
              {courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
            </select>

            {selectedCourseId && (
              <select
                value={selectedLessonId}
                onChange={e => setSelectedLessonId(e.target.value)}
                style={{
                  background: 'var(--bg-surface)', color: 'var(--text-primary)', border: '1px solid var(--border-color)',
                  padding: '8px 12px', borderRadius: '8px', fontSize: '0.9rem', outline: 'none', cursor: 'pointer', maxWidth: '250px'
                }}
              >
                <option value="">All Tests in Course</option>
                {selectedCourse?.levels.map(lvl => (
                  <optgroup key={lvl.id} label={`${lvl.title} Level`}>
                    {lvl.lessons.map(lsn => (
                      <option key={lsn.id} value={lsn.id}>{lsn.title}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
            )}
          </div>

          <div style={{ display: 'flex', background: 'var(--bg-surface)', padding: '4px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
            {['daily', 'weekly', 'all-time'].map(f => (
              <button key={f} onClick={() => setFilter(f)} style={{
                background: filter === f ? 'var(--primary)' : 'transparent',
                color: filter === f ? '#fff' : 'var(--text-secondary)',
                border: 'none', padding: '8px 16px', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer',
                transition: 'all 0.2s'
              }}>
                {f === 'daily' ? 'Today' : f === 'weekly' ? 'This Week' : 'All-Time'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-secondary)' }}>Loading ranks...</div>
      ) : data.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-secondary)', background: 'var(--bg-surface)', borderRadius: '16px' }}>
          No attempts in this period yet. Take a test to claim the #1 spot!
        </div>
      ) : (
        <>
          {/* Top 3 Podium */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px', alignItems: 'flex-end', marginBottom: '40px' }}>
            {/* Rank 2 */}
            {top3[1] && (
              <div className="glass-card" style={{ padding: '24px', textAlign: 'center', background: 'linear-gradient(145deg, rgba(148,163,184,0.1) 0%, transparent 100%)', borderTop: '4px solid #94a3b8' }}>
                <div style={{ fontSize: '3rem', margin: '0 auto 12px' }}>🥈</div>
                <h3 style={{ margin: '0 0 4px', fontSize: '1.2rem', color: (top3[1]._id === user?.id) ? 'var(--primary)' : 'var(--text-primary)' }}>{top3[1].userName || 'Anonymous'}</h3>
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '12px' }}>{top3[1].lessonTitle}</div>
                <div style={{ display: 'flex', justifyContent: 'center', gap: '16px' }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ color: 'var(--primary)', fontWeight: 800, fontSize: '1.4rem' }}>{top3[1].bestWpm}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>WPM</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ color: 'var(--success)', fontWeight: 800, fontSize: '1.4rem' }}>{top3[1].bestAccuracy.toFixed(1)}%</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>ACC</div>
                  </div>
                </div>
              </div>
            )}
            
            {/* Rank 1 */}
            {top3[0] && (
              <div className="glass-card" style={{ padding: '32px 24px', textAlign: 'center', background: 'linear-gradient(145deg, rgba(251,191,36,0.15) 0%, transparent 100%)', borderTop: '4px solid #fbbf24', boxShadow: '0 10px 40px -10px rgba(251,191,36,0.3)', transform: 'translateY(-16px)' }}>
                <div style={{ fontSize: '4rem', margin: '0 auto 12px' }}>🥇</div>
                <h3 style={{ margin: '0 0 4px', fontSize: '1.5rem', color: (top3[0]._id === user?.id) ? 'var(--primary)' : 'var(--text-primary)' }}>{top3[0].userName || 'Anonymous'}</h3>
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '16px' }}>{top3[0].lessonTitle}</div>
                <div style={{ display: 'flex', justifyContent: 'center', gap: '20px' }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ color: 'var(--primary)', fontWeight: 800, fontSize: '1.8rem' }}>{top3[0].bestWpm}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>SPEED (WPM)</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ color: 'var(--success)', fontWeight: 800, fontSize: '1.8rem' }}>{top3[0].bestAccuracy.toFixed(1)}%</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>ACCURACY</div>
                  </div>
                </div>
              </div>
            )}

            {/* Rank 3 */}
            {top3[2] && (
              <div className="glass-card" style={{ padding: '24px', textAlign: 'center', background: 'linear-gradient(145deg, rgba(180,83,9,0.1) 0%, transparent 100%)', borderTop: '4px solid #b45309' }}>
                <div style={{ fontSize: '3rem', margin: '0 auto 12px' }}>🥉</div>
                <h3 style={{ margin: '0 0 4px', fontSize: '1.2rem', color: (top3[2]._id === user?.id) ? 'var(--primary)' : 'var(--text-primary)' }}>{top3[2].userName || 'Anonymous'}</h3>
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '12px' }}>{top3[2].lessonTitle}</div>
                <div style={{ display: 'flex', justifyContent: 'center', gap: '16px' }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ color: 'var(--primary)', fontWeight: 800, fontSize: '1.4rem' }}>{top3[2].bestWpm}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>WPM</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ color: 'var(--success)', fontWeight: 800, fontSize: '1.4rem' }}>{top3[2].bestAccuracy.toFixed(1)}%</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>ACC</div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* List for Rank 4+ */}
          {restUser.length > 0 && (
            <div className="glass-card" style={{ padding: '24px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                    <th style={{ padding: '16px 12px' }}>Rank</th>
                    <th style={{ padding: '16px 12px' }}>Name</th>
                    <th style={{ padding: '16px 12px' }}>Top Speed</th>
                    <th style={{ padding: '16px 12px' }}>Precision</th>
                    <th style={{ padding: '16px 12px' }}>Mistakes</th>
                  </tr>
                </thead>
                <tbody>
                  {restUser.map((u, idx) => (
                    <tr key={u._id} style={{ 
                      borderBottom: '1px solid rgba(148,163,184,0.05)', 
                      background: (u._id === user?.id) ? 'rgba(14,165,233,0.08)' : 'transparent',
                      transition: 'background 0.2s'
                    }}>
                      <td style={{ padding: '16px 12px', fontWeight: 700, color: 'var(--text-secondary)' }}>#{idx + 4}</td>
                      <td style={{ padding: '16px 12px', fontWeight: 600, color: (u._id === user?.id) ? 'var(--primary)' : 'var(--text-primary)' }}>
                        {u.userName || 'Anonymous'} {(u._id === user?.id) && '(You)'}
                      </td>
                      <td style={{ padding: '16px 12px', color: 'var(--primary)', fontWeight: 700 }}>{u.bestWpm} wpm</td>
                      <td style={{ padding: '16px 12px', color: 'var(--success)', fontWeight: 600 }}>{u.bestAccuracy.toFixed(1)}%</td>
                      <td style={{ padding: '16px 12px', color: u.bestMistakes > 5 ? '#ef4444' : 'var(--text-muted)' }}>{u.bestMistakes} full</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
