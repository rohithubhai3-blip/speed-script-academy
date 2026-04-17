import { useEffect, useState } from 'react';
import { db } from '../data/db';
import { Link, useNavigate } from 'react-router-dom';
import { Play, Lock, CreditCard, CheckCircle } from 'lucide-react';
import useStore from '../store/useStore';

export default function CoursesPage() {
  const [courses, setCourses] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const user = useStore(state => state.user);
  const updateUser = useStore(state => state.updateUser);
  const navigate = useNavigate();

  useEffect(() => {
    async function load() {
      try {
        const [c, r, freshUser] = await Promise.all([
          db.getCourses(),
          db.getPendingRequests(),
          db.getMe() // Always fetch fresh user access data
        ]);
        setCourses(c);
        setPendingRequests(r);

        // Sync local session with database reality
        if (freshUser) {
           updateUser({ ...user, ...freshUser });
        }
      } catch (err) {
        console.error("Failed to load courses:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) return <div style={{ padding: '40px', textAlign: 'center' }}>Loading courses...</div>;

  return (
    <div>
      <h1 style={{ fontSize: '2.5rem', marginBottom: '8px' }}>Practice Modules</h1>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '40px' }}>Select a course and difficulty level to test your speed.</p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '40px' }}>
        {courses.map(course => {
          const isOwned = !course.price || course.price === 0 || user?.purchasedCourses?.includes(course.id) || user?.role === 'admin';
          const isPending = pendingRequests.find(r => r.userId === user?.id && r.courseId === course.id);
          
          return (
            <div key={course.id} className="glass-panel" style={{ padding: '32px', position: 'relative', overflow: 'hidden' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <h2 style={{ fontSize: '1.8rem', color: 'var(--primary)', marginBottom: '8px' }}>
                    {course.title}
                  </h2>
                  <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>{course.description}</p>
                </div>
                {!isOwned ? (
                  <div style={{ background: 'var(--bg-surface-elevated)', padding: '8px 16px', borderRadius: 'var(--radius-full)', color: isPending ? 'var(--warning)' : 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem', fontWeight: 'bold', border: isPending ? '1px solid var(--warning)' : 'none' }}>
                    {isPending ? 'Verification Pending' : <><Lock size={16} /> Premium Access</>}
                  </div>
                ) : (
                  <div style={{ background: 'var(--primary)', padding: '4px 12px', borderRadius: 'var(--radius-full)', color: 'var(--bg-base)', fontSize: '0.8rem', fontWeight: 'bold' }}>
                    {course.price > 0 ? "PURCHASED" : "FREE"}
                  </div>
                )}
              </div>
              
              {!isOwned ? (
                <div style={{ background: 'rgba(255,255,255,0.7)', padding: '40px', borderRadius: 'var(--radius-md)', textAlign: 'center', border: '1px solid var(--border-color)', backdropFilter: 'blur(4px)' }}>
                  {isPending ? (
                    <>
                      <CheckCircle size={48} color="var(--warning)" style={{ margin: '0 auto 16px auto' }} />
                      <h3 style={{ fontSize: '1.5rem', marginBottom: '8px', color: 'var(--text-primary)' }}>Verification in Progress</h3>
                      <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>We have received your payment request. Please ensure you've sent the screenshot on WhatsApp. Your course will be unlocked shortly.</p>
                      <div style={{ color: 'var(--warning)', fontWeight: 600 }}>Please wait 2-4 hours for manual approval.</div>
                    </>
                  ) : (
                    <>
                      <Lock size={48} color="var(--text-secondary)" style={{ margin: '0 auto 16px auto' }} />
                      <h3 style={{ fontSize: '1.5rem', marginBottom: '8px', color: 'var(--text-primary)' }}>Course Locked</h3>
                      <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>Unlock full access to all comprehensive test levels and analytics for this module.</p>
                      <button className="btn btn-primary" onClick={() => navigate(`/checkout/${course.id}`)} style={{ padding: '12px 32px', fontSize: '1.1rem' }}>
                        <CreditCard size={20} /> Unlock Now for ₹{course.price}
                      </button>
                    </>
                  )}
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
                  {course.levels.map(level => (
                    <div key={level.id} className="glass-card" style={{ padding: '24px', background: 'var(--bg-surface-elevated)' }}>
                      <h3 style={{ fontSize: '1.2rem', marginBottom: '16px' }}>{level.title}</h3>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {level.lessons.map(lesson => (
                          <Link 
                            key={lesson.id} 
                            to={`/test/${course.id}/${level.id}/${lesson.id}`}
                            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-base)', padding: '12px', borderRadius: 'var(--radius-sm)', transition: 'background 0.2s', border: '1px solid var(--border-color)' }}
                            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(14, 165, 233, 0.08)'}
                            onMouseLeave={(e) => e.currentTarget.style.background = 'var(--bg-base)'}
                          >
                            <div>
                              <span style={{ fontWeight: 500, display: 'block' }}>{lesson.title}</span>
                              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{lesson.timeMinutes} Min</span>
                            </div>
                            <Play size={16} className="text-primary" />
                          </Link>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  );
}
