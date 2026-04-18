import { useEffect, useState } from 'react';
import { db } from '../data/db';
import { Link, useNavigate } from 'react-router-dom';
import { Play, Lock, CreditCard, CheckCircle, BookOpen, Clock, ChevronDown, ChevronUp, Zap, Shield } from 'lucide-react';
import useStore from '../store/useStore';

// Default gradient thumbnails when no image is uploaded
const GRADIENT_FALLBACKS = [
  'linear-gradient(135deg, #0ea5e9 0%, #6366f1 100%)',
  'linear-gradient(135deg, #10b981 0%, #0ea5e9 100%)',
  'linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)',
  'linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)',
  'linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%)',
];

export default function CoursesPage() {
  const [courses, setCourses] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedCourse, setExpandedCourse] = useState(null);
  const user = useStore(state => state.user);
  const updateUser = useStore(state => state.updateUser);
  const navigate = useNavigate();

  useEffect(() => {
    async function load() {
      try {
        const [c, r, freshUser] = await Promise.all([
          db.getCourses(),
          db.getPendingRequests(),
          db.getMe()
        ]);
        setCourses(c);
        setPendingRequests(r);
        if (freshUser) updateUser({ ...user, ...freshUser });
        // Auto-expand first owned course
        const firstOwned = c.find(course =>
          !course.price || course.price === 0 || freshUser?.role === 'admin' ||
          freshUser?.purchasedCourses?.includes(course.id) ||
          freshUser?.courseAccess?.some(a => a.courseId === course.id)
        );
        if (firstOwned) setExpandedCourse(firstOwned.id);
      } catch (err) {
        console.error("Failed to load courses:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  // ── SKELETON ──────────────────────────────────────────────
  if (loading) return (
    <div>
      <style>{`@keyframes shimmer{0%,100%{opacity:1}50%{opacity:0.45}}`}</style>
      <div style={{ height: '40px', width: '260px', background: 'rgba(148,163,184,0.15)', borderRadius: '10px', marginBottom: '12px', animation: 'shimmer 1.5s infinite' }} />
      <div style={{ height: '18px', width: '300px', background: 'rgba(148,163,184,0.1)', borderRadius: '6px', marginBottom: '40px', animation: 'shimmer 1.5s infinite 0.1s' }} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '24px' }}>
        {[1, 2, 3].map(i => (
          <div key={i} style={{ borderRadius: '20px', overflow: 'hidden', border: '1px solid var(--border-color)', animation: `shimmer 1.5s infinite ${i * 0.1}s` }}>
            <div style={{ height: '180px', background: 'rgba(148,163,184,0.15)' }} />
            <div style={{ padding: '20px' }}>
              <div style={{ height: '22px', width: '70%', background: 'rgba(148,163,184,0.12)', borderRadius: '6px', marginBottom: '12px' }} />
              <div style={{ height: '14px', width: '90%', background: 'rgba(148,163,184,0.08)', borderRadius: '4px', marginBottom: '8px' }} />
              <div style={{ height: '40px', background: 'rgba(148,163,184,0.12)', borderRadius: '10px', marginTop: '20px' }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const totalLessons = (course) =>
    course.levels?.reduce((acc, l) => acc + (l.lessons?.length || 0), 0) || 0;

  return (
    <div>
      <style>{`
        .course-card {
          border-radius: 20px;
          overflow: hidden;
          border: 1px solid var(--border-color);
          background: var(--bg-surface);
          transition: transform 0.25s ease, box-shadow 0.25s ease;
          display: flex;
          flex-direction: column;
        }
        .course-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 16px 48px rgba(14,165,233,0.12);
        }
        .course-card.locked:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(0,0,0,0.08);
        }
        .thumbnail-wrap {
          position: relative;
          height: 190px;
          overflow: hidden;
          flex-shrink: 0;
        }
        .thumbnail-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: transform 0.4s ease;
        }
        .course-card:hover .thumbnail-img {
          transform: scale(1.04);
        }
        .thumbnail-overlay {
          position: absolute;
          inset: 0;
          background: linear-gradient(to bottom, transparent 30%, rgba(0,0,0,0.65) 100%);
        }
        .lesson-link {
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: var(--bg-base);
          padding: 11px 14px;
          border-radius: 10px;
          border: 1px solid var(--border-color);
          text-decoration: none;
          color: var(--text-primary);
          transition: all 0.18s ease;
          gap: 10px;
        }
        .lesson-link:hover {
          background: rgba(14,165,233,0.08);
          border-color: var(--primary);
          transform: translateX(3px);
        }
        .play-btn {
          width: 30px;
          height: 30px;
          border-radius: 50%;
          background: var(--primary);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          transition: transform 0.2s;
        }
        .lesson-link:hover .play-btn {
          transform: scale(1.15);
        }
      `}</style>

      {/* PAGE HEADER */}
      <div style={{ marginBottom: '40px' }}>
        <h1 style={{ fontSize: '2.2rem', marginBottom: '8px', fontWeight: 800 }}>Practice Modules</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '1rem' }}>
          Select a course and difficulty level to test your shorthand speed.
        </p>
      </div>

      {/* COURSE CARDS GRID */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(310px, 1fr))', gap: '28px' }}>
        {courses.map((course, courseIdx) => {
          const isOwned = !course.price || course.price === 0
            || user?.role === 'admin'
            || user?.purchasedCourses?.includes(course.id)
            || user?.courseAccess?.some(a => a.courseId === course.id);
          const isPending = pendingRequests.find(
            r => (r.userId?._id || r.userId) === (user?._id || user?.id) && r.courseId === course.id
          );
          const lessonCount = totalLessons(course);
          const fallbackBg = GRADIENT_FALLBACKS[courseIdx % GRADIENT_FALLBACKS.length];
          const isExpanded = expandedCourse === course.id;

          return (
            <div key={course.id} className={`course-card ${!isOwned ? 'locked' : ''}`}>

              {/* ── THUMBNAIL ── */}
              <div className="thumbnail-wrap" style={{ background: fallbackBg }}>
                {(course.thumbnailUrl || course.thumbnail) ? (
                  <img src={course.thumbnailUrl || course.thumbnail} alt={course.title} className="thumbnail-img" />
                ) : (
                  // Decorative SVG pattern when no thumbnail
                  <div style={{
                    width: '100%', height: '100%',
                    background: fallbackBg,
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}>
                    <BookOpen size={64} color="rgba(255,255,255,0.25)" />
                  </div>
                )}
                <div className="thumbnail-overlay" />

                {/* Status pill on thumbnail */}
                <div style={{ position: 'absolute', top: '14px', right: '14px' }}>
                  {!isOwned ? (
                    isPending ? (
                      <span style={{ background: 'rgba(245,158,11,0.9)', color: '#fff', padding: '5px 12px', borderRadius: '100px', fontSize: '0.72rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '5px', backdropFilter: 'blur(8px)' }}>
                        <Clock size={12} /> Pending
                      </span>
                    ) : (
                      <span style={{ background: 'rgba(0,0,0,0.5)', color: '#fff', padding: '5px 12px', borderRadius: '100px', fontSize: '0.72rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '5px', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.15)' }}>
                        <Lock size={11} /> ₹{course.price}
                      </span>
                    )
                  ) : (
                    <span style={{ background: course.price > 0 ? 'rgba(14,165,233,0.9)' : 'rgba(16,185,129,0.9)', color: '#fff', padding: '5px 12px', borderRadius: '100px', fontSize: '0.72rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '5px', backdropFilter: 'blur(8px)' }}>
                      {course.price > 0 ? <><Shield size={11} /> Purchased</> : <><Zap size={11} /> FREE</>}
                    </span>
                  )}
                </div>

                {/* Lesson count pill */}
                <div style={{ position: 'absolute', bottom: '14px', left: '14px', background: 'rgba(0,0,0,0.5)', color: '#fff', padding: '4px 10px', borderRadius: '100px', fontSize: '0.7rem', fontWeight: 600, backdropFilter: 'blur(6px)' }}>
                  {lessonCount} {lessonCount === 1 ? 'Lesson' : 'Lessons'}
                </div>
              </div>

              {/* ── CARD BODY ── */}
              <div style={{ padding: '20px 22px', flex: 1, display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0, lineHeight: 1.3 }}>
                  {course.title}
                </h2>
                {course.description && (
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5,
                    display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {course.description}
                  </p>
                )}

                {/* Level pills */}
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '4px' }}>
                  {course.levels?.map(lv => (
                    <span key={lv.id} style={{ fontSize: '0.68rem', padding: '3px 9px', borderRadius: '100px', background: 'rgba(14,165,233,0.08)', color: 'var(--primary)', border: '1px solid rgba(14,165,233,0.2)', fontWeight: 600 }}>
                      {lv.title} · {lv.lessons?.length || 0}
                    </span>
                  ))}
                </div>

                {/* ── ACTION ── */}
                {!isOwned ? (
                  // LOCKED STATE
                  <div style={{ marginTop: 'auto', paddingTop: '12px' }}>
                    {isPending ? (
                      <div style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: '12px', padding: '14px 16px', textAlign: 'center' }}>
                        <p style={{ fontSize: '0.82rem', color: 'var(--warning)', fontWeight: 600, margin: 0 }}>
                          ⏳ Verification in progress — 2–4 hrs
                        </p>
                      </div>
                    ) : (
                      <button
                        className="btn btn-primary"
                        onClick={() => navigate(`/checkout/${course.id}`)}
                        style={{ width: '100%', padding: '12px', fontSize: '0.95rem', borderRadius: '12px', justifyContent: 'center' }}
                      >
                        <CreditCard size={16} /> Unlock for ₹{course.price}
                      </button>
                    )}
                  </div>
                ) : (
                  // OWNED — EXPANDABLE LESSONS
                  <div style={{ marginTop: 'auto', paddingTop: '8px' }}>
                    <button
                      onClick={() => setExpandedCourse(isExpanded ? null : course.id)}
                      style={{
                        width: '100%', padding: '10px 16px', borderRadius: '12px',
                        border: '1px solid var(--border-color)',
                        background: isExpanded ? 'rgba(14,165,233,0.08)' : 'transparent',
                        color: isExpanded ? 'var(--primary)' : 'var(--text-secondary)',
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        cursor: 'pointer', fontWeight: 600, fontSize: '0.88rem', transition: 'all 0.2s'
                      }}
                    >
                      <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Play size={15} /> {isExpanded ? 'Hide Lessons' : 'Start Practicing'}
                      </span>
                      {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>

                    {/* Expandable lesson list */}
                    {isExpanded && (
                      <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '14px', animation: 'fadeInDown 0.25s ease' }}>
                        <style>{`@keyframes fadeInDown{from{opacity:0;transform:translateY(-8px)}to{opacity:1;transform:translateY(0)}}`}</style>
                        {course.levels?.map(level => (
                          level.lessons?.length > 0 && (
                            <div key={level.id}>
                              <div style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-muted)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <div style={{ height: '1px', background: 'var(--border-color)', flex: 1 }} />
                                {level.title}
                                <div style={{ height: '1px', background: 'var(--border-color)', flex: 1 }} />
                              </div>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
                                {level.lessons.map(lesson => (
                                  <Link
                                    key={lesson.id}
                                    to={`/test/${course.id}/${level.id}/${lesson.id}`}
                                    className="lesson-link"
                                  >
                                    <div style={{ minWidth: 0 }}>
                                      <span style={{ fontWeight: 600, display: 'block', fontSize: '0.88rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                        {lesson.title}
                                      </span>
                                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                                        {lesson.timeLimit || `${lesson.timeMinutes || '?'} min`}
                                      </span>
                                    </div>
                                    <div className="play-btn">
                                      <Play size={13} color="white" fill="white" />
                                    </div>
                                  </Link>
                                ))}
                              </div>
                            </div>
                          )
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {courses.length === 0 && (
        <div style={{ textAlign: 'center', padding: '80px 20px', color: 'var(--text-muted)' }}>
          <BookOpen size={48} style={{ marginBottom: '16px', opacity: 0.4 }} />
          <p style={{ fontSize: '1.1rem', fontWeight: 600 }}>No courses available yet.</p>
        </div>
      )}
    </div>
  );
}
