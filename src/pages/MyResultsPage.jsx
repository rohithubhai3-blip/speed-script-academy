import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, ArrowLeft, ClipboardList, Trash2 } from 'lucide-react';
import useStore from '../store/useStore';
import { db } from '../data/db';

// Helper — same colour logic as TestPage
function MistakeChip({ item }) {
  const isHalf = item.mistakeClass === 'half';
  const isFull = item.mistakeClass === 'full';

  let style = {
    padding: '3px 7px', borderRadius: '4px', fontWeight: '500',
    display: 'inline-flex', alignItems: 'center', gap: '3px',
    fontSize: '0.92rem', lineHeight: 1.6
  };
  let badge = null;

  switch (item.type) {
    case 'correct':
      style = { ...style, background: '#dcfce7', color: '#166534', borderBottom: '2px solid #22c55e' };
      break;
    case 'substitution_extra':
      style = { ...style, background: '#fecaca', color: '#7f1d1d', borderBottom: '2px solid #dc2626', outline: '1px solid #fca5a5' };
      badge = 'F';
      break;
    case 'extra':
      style = { ...style, background: '#fee2e2', color: '#991b1b', borderBottom: '2px dashed #ef4444' };
      badge = 'F';
      break;
    case 'missing':
      style = { ...style, background: '#e0f2fe', color: '#0369a1', borderBottom: '2px solid #0ea5e9' };
      badge = 'F';
      break;
    case 'repetition':
      style = { ...style, background: '#fce7f3', color: '#9d174d', borderBottom: '2px solid #ec4899' };
      badge = 'F';
      break;
    case 'abbreviation':
      style = { ...style, background: '#fef3c7', color: '#78350f', borderBottom: '2px solid #f59e0b' };
      badge = 'F';
      break;
    case 'spelling':
      style = { ...style, background: isHalf ? '#fef9c3' : '#fee2e2', color: isHalf ? '#713f12' : '#991b1b', borderBottom: `2px solid ${isHalf ? '#eab308' : '#ef4444'}` };
      badge = isHalf ? 'H' : 'F';
      break;
    case 'singular_plural':
      style = { ...style, background: '#fef9c3', color: '#713f12', borderBottom: '2px solid #eab308' };
      badge = 'H';
      break;
    case 'capitalization':
      style = { ...style, background: isHalf ? '#fef9c3' : '#fee2e2', color: isHalf ? '#713f12' : '#991b1b', borderBottom: `2px solid ${isHalf ? '#eab308' : '#ef4444'}` };
      badge = isHalf ? 'H' : 'F';
      break;
    case 'punctuation':
      style = { ...style, background: '#fef9c3', color: '#713f12', borderBottom: '2px solid #eab308' };
      badge = 'H';
      break;
    default:
      style = { ...style, opacity: 0.5 };
  }

  return (
    <span style={style}>
      {item.word}
      {badge && (
        <sup style={{
          fontSize: '0.6em', fontWeight: 800,
          background: badge === 'H' ? '#eab308' : '#ef4444',
          color: 'white', borderRadius: '3px', padding: '1px 3px', marginLeft: '2px'
        }}>{badge}</sup>
      )}
      {item.original && item.type !== 'correct' && item.original !== item.word && (
        <span style={{ fontSize: '0.72em', opacity: 0.65, fontWeight: 'normal', paddingLeft: '3px', marginLeft: '2px' }}>
          ✕{item.original}
        </span>
      )}
    </span>
  );
}

export default function MyResultsPage() {
  const user = useStore(state => state.user);
  const navigate = useNavigate();
  const [attempts, setAttempts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null); // full result object from localStorage

  // Load saved detailed results from localStorage (keyed per attempt _id)
  const getDetailedResult = (attemptId) => {
    try {
      const raw = localStorage.getItem(`ssa_detail_${user?.id}_${attemptId}`);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  };

  useEffect(() => {
    async function load() {
      try {
        const data = await db.getUserAttempts(user.id);
        setAttempts(data || []);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [user.id]);

  if (loading) return (
    <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-secondary)' }}>Loading your results...</div>
  );

  return (
    <div style={{ paddingBottom: '60px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '32px' }}>
        <button onClick={() => navigate('/dashboard')} className="btn btn-outline" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px' }}>
          <ArrowLeft size={16} /> Back
        </button>
        <div>
          <h1 style={{ fontSize: '2rem', marginBottom: '4px' }}>My Results</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Your complete test history with detailed breakdowns</p>
        </div>
      </div>

      {attempts.length === 0 ? (
        <div className="glass-card" style={{ padding: '60px', textAlign: 'center' }}>
          <ClipboardList size={48} style={{ color: 'var(--text-muted)', marginBottom: '16px' }} />
          <h3 style={{ marginBottom: '8px' }}>No Results Yet</h3>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>Complete your first test to see detailed results here.</p>
          <button className="btn btn-primary" onClick={() => navigate('/courses')}>Browse Courses</button>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '16px' }}>
          {attempts.map((a, idx) => {
            const isPassed = a.passed ?? (parseFloat(a.errorPercent) <= 5);
            const detail = getDetailedResult(a._id);
            const isOpen = selected === a._id;

            return (
              <div key={a._id || idx} className="glass-card" style={{ overflow: 'hidden' }}>
                {/* Summary Row */}
                <div
                  onClick={() => setSelected(isOpen ? null : a._id)}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '20px 24px', cursor: 'pointer', flexWrap: 'wrap', gap: '12px',
                    borderBottom: isOpen ? '1px solid var(--border-color)' : 'none'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                    <div style={{
                      width: '40px', height: '40px', borderRadius: '50%', flexShrink: 0,
                      background: isPassed ? 'rgba(16,185,129,0.15)' : 'rgba(244,63,94,0.1)',
                      border: `2px solid ${isPassed ? 'var(--success)' : 'var(--danger)'}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '1rem'
                    }}>
                      {isPassed ? '✅' : '❌'}
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '1rem' }}>{a.lessonTitle || a.lessonId || 'Unknown Test'}</div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                        {new Date(a.timestamp).toLocaleString('en-IN')}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', alignItems: 'center' }}>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 700 }}>WPM</div>
                      <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--primary)' }}>{a.wpm}</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 700 }}>Accuracy</div>
                      <div style={{ fontSize: '1.4rem', fontWeight: 800, color: parseFloat(a.accuracy) > 90 ? 'var(--success)' : 'var(--danger)' }}>{parseFloat(a.accuracy).toFixed(1)}%</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 700 }}>Full ❌</div>
                      <div style={{ fontSize: '1.4rem', fontWeight: 800, color: a.fullMistakes > 0 ? '#ef4444' : 'var(--text-muted)' }}>{a.fullMistakes ?? '—'}</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 700 }}>Half ⚠️</div>
                      <div style={{ fontSize: '1.4rem', fontWeight: 800, color: a.halfMistakes > 0 ? '#f59e0b' : 'var(--text-muted)' }}>{a.halfMistakes ?? '—'}</div>
                    </div>
                    <span style={{
                      padding: '5px 14px', borderRadius: '100px', fontSize: '0.78rem', fontWeight: 800,
                      background: isPassed ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.1)',
                      color: isPassed ? 'var(--success)' : 'var(--danger)',
                      border: `1px solid ${isPassed ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`
                    }}>
                      {isPassed ? 'PASSED' : 'FAILED'}
                    </span>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{isOpen ? '▲' : '▼'}</span>
                  </div>
                </div>

                {/* Expanded Detail View */}
                {isOpen && (
                  <div style={{ padding: '24px', animation: 'fadeIn 0.25s ease' }}>
                    {detail?.result?.visualHTML ? (
                      <>
                        {/* Stats row */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px', marginBottom: '24px' }}>
                          {[
                            { label: '⚡ Net WPM', value: a.wpm, color: 'var(--primary)' },
                            { label: '✅ Accuracy', value: `${parseFloat(a.accuracy).toFixed(1)}%`, color: isPassed ? 'var(--success)' : 'var(--danger)' },
                            { label: '📄 Total Words', value: a.totalWords, color: '#818cf8' },
                            { label: '⌨️ Words Typed', value: a.typedWords, color: '#2dd4bf' },
                            { label: '🟡 Half Mistakes', value: a.halfMistakes, color: 'var(--warning)' },
                            { label: '🔴 Full Mistakes', value: a.fullMistakes, color: 'var(--danger)' },
                          ].map(({ label, value, color }) => (
                            <div key={label} style={{ background: 'var(--bg-surface-elevated)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '16px', textAlign: 'center' }}>
                              <p style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 800, marginBottom: '6px' }}>{label}</p>
                              <p style={{ fontSize: '1.8rem', fontWeight: 800, color, margin: 0 }}>{value}</p>
                            </div>
                          ))}
                        </div>

                        {/* Pass / Fail Banner */}
                        <div style={{ background: isPassed ? 'rgba(16,185,129,0.08)' : 'rgba(244,63,94,0.07)', border: `1px solid ${isPassed ? 'rgba(16,185,129,0.3)' : 'rgba(244,63,94,0.2)'}`, borderRadius: '10px', padding: '12px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '8px' }}>
                          <span style={{ fontWeight: 700 }}>Error: <span style={{ color: isPassed ? 'var(--success)' : 'var(--danger)' }}>{parseFloat(a.errorPercent).toFixed(2)}%</span></span>
                          <span style={{ fontWeight: 700, color: isPassed ? 'var(--success)' : 'var(--danger)' }}>{isPassed ? '✅ PASSED' : '❌ FAILED'}</span>
                        </div>

                        {/* Visual Analysis */}
                        <h4 style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '12px' }}>Visual Text Analysis</h4>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 4px', marginBottom: '12px' }}>
                          {[
                            { color: '#22c55e', label: '✓ Correct' },
                            { color: '#ef4444', label: '● Full Mistake (F)' },
                            { color: '#f59e0b', label: '◑ Half Mistake (H)' },
                            { color: '#0ea5e9', label: '▽ Omission (F)' },
                            { color: '#dc2626', label: '✕ Wrong Word (F)' },
                          ].map(({ color, label }) => (
                            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.72rem', fontWeight: 600 }}>
                              <div style={{ width: 10, height: 10, background: color, borderRadius: '2px' }} />
                              {label}
                            </div>
                          ))}
                        </div>
                        <div style={{
                          background: '#f8fafc', padding: '20px', borderRadius: '8px',
                          lineHeight: 2.4, border: '1px solid var(--border-color)', color: '#334155',
                          display: 'flex', flexWrap: 'wrap', gap: '8px 4px'
                        }}>
                          {detail.result.visualHTML.map((item, i) => (
                            <MistakeChip key={i} item={item} />
                          ))}
                        </div>
                      </>
                    ) : (
                      <div style={{ textAlign: 'center', padding: '32px', color: 'var(--text-secondary)' }}>
                        <p style={{ marginBottom: '8px' }}>📊 Summary only — detailed visual analysis is available for tests taken after this update.</p>
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>WPM: {a.wpm} · Accuracy: {parseFloat(a.accuracy).toFixed(1)}% · Full Mistakes: {a.fullMistakes ?? '—'} · Half: {a.halfMistakes ?? '—'}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <style>{`@keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }`}</style>
    </div>
  );
}
