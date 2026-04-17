import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PlayCircle, ShieldAlert, CheckCircle, ArrowRight, Music, Settings } from 'lucide-react';
import { db } from '../data/db';
import useStore from '../store/useStore';
import { analyzeTestResult } from '../utils/engine';
import ModernModal from '../components/ModernModal';

export default function TestPage() {
  const { courseId, levelId, lessonId } = useParams();
  const navigate = useNavigate();
  const user = useStore(state => state.user);

  const [lesson, setLesson] = useState(null);
  const [typedText, setTypedText] = useState("");
  const [status, setStatus] = useState("ready"); // ready -> starting -> running -> finished
  const [result, setResult] = useState(null);
  const [warnings, setWarnings] = useState(0);
  const [startTime, setStartTime] = useState(null);
  const [timeLeft, setTimeLeft] = useState(null); // in seconds
  const [targetWpm, setTargetWpm] = useState(80);
  const [baseWpm, setBaseWpm] = useState(80);
  const [lastLockedIndex, setLastLockedIndex] = useState(0);
  const [showLockWarning, setShowLockWarning] = useState(false);
  const [leaderboard, setLeaderboard] = useState([]);
  const [history, setHistory] = useState([]);
  
  const [countdown, setCountdown] = useState(0);
  const [modal, setModal] = useState({ isOpen: false, title: '', message: '' });
  
  const mediaRef = useRef(null);
  const textAreaRef = useRef(null);
  const canvasRef = useRef(null);
  const audioCtxRef = useRef(null);
  const analyserRef = useRef(null);
  const animationRef = useRef(null);
  const sourceConnectedRef = useRef(false);

  useEffect(() => {
    async function load() {
      const data = await db.getLesson(courseId, levelId, lessonId);
      if (!data) return navigate('/courses');
      setLesson(data);
      
      // Initialize time limit
      let secs = 300; // default 5m
      if (data.timeLimit) {
        const parts = data.timeLimit.split(':').map(Number);
        if (parts.length === 3) {
           secs = parts[0] * 3600 + parts[1] * 60 + parts[2];
        } else if (parts.length === 2) {
           secs = parts[0] * 60 + parts[1];
        } else if (parts.length === 1) {
           secs = parts[0];
        }
      } else if (data.timeMinutes) {
        secs = data.timeMinutes * 60;
      }
      setTimeLeft(secs);
      
      // Initialize WPM
      const bw = data.baseWpm || 80;
      setBaseWpm(bw);
      setTargetWpm(bw);
    }
    load();
  }, [courseId, levelId, lessonId, navigate]);

  // Timer Effect
  useEffect(() => {
    let interval = null;
    if (status === "running" && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft(prev => prev - 1);
      }, 1000);
    } else if (timeLeft === 0 && status === "running") {
      handleSubmit();
    }
    return () => clearInterval(interval);
  }, [status, timeLeft]);

  // Countdown Effect
  useEffect(() => {
    let interval = null;
    if (status === "starting" && countdown > 0) {
      interval = setInterval(() => {
        setCountdown(prev => prev - 1);
      }, 1000);
    } else if (status === "starting" && countdown === 0) {
      handleStartTest();
    }
    return () => clearInterval(interval);
  }, [status, countdown]);

  // Playback Rate Effect
  useEffect(() => {
    if (mediaRef.current && lesson) {
      const rate = targetWpm / baseWpm;
      mediaRef.current.playbackRate = rate;
    }
  }, [targetWpm, baseWpm, lesson]);

  // Anti-cheat visibility listener
  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden && status === "running") {
        setWarnings(prev => prev + 1);
        setModal({
          isOpen: true,
          title: "Anti-Cheat Warning",
          message: "Warning: Tab switching is tracked during active tests! This instance has been logged."
        });
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [status]);

  const handleStartListening = () => {
    if (mediaRef.current) {
      mediaRef.current.playbackRate = targetWpm / baseWpm;
    }
  };

  const handleStartTest = () => {
    // Phase transition: Stop audio and show typing box
    if (mediaRef.current) {
      mediaRef.current.pause();
      mediaRef.current.currentTime = 0; // Reset
    }
    setStatus("running");
    setStartTime(Date.now());
    
    // Focus typing box after a short delay to allow UI to render
    setTimeout(() => {
      if(textAreaRef.current) textAreaRef.current.focus();
    }, 100);
  };

  const formatTime = (secs) => {
    if (secs === null || isNaN(secs)) return "00:00";
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    return `${h > 0 ? h.toString().padStart(2, '0') + ':' : ''}${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleSubmit = async () => {
    setStatus("finished");
    if (mediaRef.current) {
      mediaRef.current.pause();
    }

    const timeTakenMs = Date.now() - startTime;
    let timeTakenMin = timeTakenMs / 60000;
    
    if(timeTakenMin < 0.01) timeTakenMin = 1; 

    const rules = {
      capRule: lesson.capRule || "Ignore",
      punctRule: lesson.punctRule || "Ignore",
      similarWordRule: lesson.similarWordRule || "Strict"
    };

    const analysis = analyzeTestResult(lesson.passage, typedText, timeTakenMin, rules);
    setResult(analysis);
    
    await db.saveAttempt(user.id, {
      courseId,
      levelId,
      lessonId,
      wpm: analysis.wpm,
      accuracy: analysis.accuracy,
      mistakes: analysis.totalMistakes,
      cheatingWarnings: warnings
    });

    loadAnalytics();
  };

  const loadAnalytics = async () => {
    const all = await db.getAllAttempts();
    const lessonAttempts = all.filter(a => a.lessonId === lessonId);
    
    const users = await db.getAllUsers();
    const withNames = lessonAttempts.map(a => ({
      ...a,
      userName: users.find(u => u.id === a.userId)?.name || "Guest"
    }));
    
    const top = withNames.sort((a,b) => b.wpm - a.wpm || b.accuracy - a.accuracy).slice(0, 5);
    setLeaderboard(top);

    const myHistory = await db.getUserAttempts(user.id);
    const lessonHistory = myHistory.filter(a => a.lessonId === lessonId).reverse();
    setHistory(lessonHistory);
  };

  const startVisualizer = () => {
    try {
      // Safety check: Visualizer requires CORS. If external link, this MIGHT fail.
      // We wrap it in try-catch so the AUDIO still plays even if bars don't move.
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') ctx.resume();

      if (!analyserRef.current && !sourceConnectedRef.current) {
        // This is where CORS issues usually happen
        const source = ctx.createMediaElementSource(mediaRef.current);
        analyserRef.current = ctx.createAnalyser();
        analyserRef.current.fftSize = 256;
        source.connect(analyserRef.current);
        analyserRef.current.connect(ctx.destination);
        sourceConnectedRef.current = true;
      }

      draw();
    } catch (err) {
      console.warn("Visualizer bars disabled due to security/CORS on this link. Audio will still play normally.", err);
    }
  };

  const draw = () => {
    if (!canvasRef.current || !analyserRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const analyser = analyserRef.current;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const renderFrame = () => {
      animationRef.current = requestAnimationFrame(renderFrame);
      analyser.getByteFrequencyData(dataArray);

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const barWidth = (canvas.width / bufferLength) * 2.5;
      let barHeight;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        barHeight = dataArray[i] / 2;
        ctx.fillStyle = `rgba(14, 165, 233, ${0.3 + (dataArray[i]/255) * 0.7})`;
        ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);
        x += barWidth + 1;
      }
    };
    renderFrame();
  };

  useEffect(() => {
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      if (audioCtxRef.current) audioCtxRef.current.close();
    };
  }, []);

  const handleMediaEnd = () => {
    if (status === "running") {
      handleSubmit();
    }
  };

  const handleReset = () => {
    setTypedText("");
    setStatus("ready");
    setResult(null);
    setWarnings(0);
    setStartTime(null);
    setLastLockedIndex(0);
    if (mediaRef.current) {
      mediaRef.current.currentTime = 0;
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handlePasteDisabled = (e) => {
    e.preventDefault();
    setModal({
      isOpen: true,
      title: "Action Restricted",
      message: "Copying and pasting is strictly disabled during examinations to ensure integrity."
    });
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Backspace') {
      // If administrative rule locks backspace (Standard Shorthand Practice)
      if (!lesson.isBackspaceAllowed) {
        const { selectionStart, selectionEnd } = e.target;
        // If user tries to backspace into locked content (past the last space)
        if (selectionStart <= lastLockedIndex || selectionEnd <= lastLockedIndex) {
          e.preventDefault();
          setShowLockWarning(true);
          setTimeout(() => setShowLockWarning(false), 2000);
        }
      }
    }
    
    if (e.key === ' ' && !lesson.isBackspaceAllowed) {
      // Lock the word after space ONLY if backspace is restricted
      setLastLockedIndex(typedText.length + 1);
    }
  };

  if (!lesson) return <div style={{ padding: '40px', textAlign: 'center' }}>Loading test environment...</div>;

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', width: '100%', paddingBottom: '40px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '2rem', marginBottom: '4px' }}>{lesson.title}</h1>
          <p style={{ color: 'var(--text-secondary)' }}>
            Time: {lesson.timeLimit || (lesson.timeMinutes + ' Minutes')} | {lesson.mediaType === 'video' ? 'Video' : 'Audio'} Dictation
          </p>
        </div>
        {warnings > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--danger)', background: 'rgba(244, 63, 94, 0.1)', padding: '8px 16px', borderRadius: 'var(--radius-full)' }}>
            <ShieldAlert size={18} />
            Focus Loss Warnings: {warnings}
          </div>
        )}
      </div>

      <div className="glass-panel" style={{ padding: '24px', marginBottom: '24px' }}>
        
        {/* PHASE 1: LISTENING UI */}
        {status === "ready" && (
           <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div className="premium-player-container" style={{
                background: 'var(--bg-surface-elevated)',
                borderRadius: '16px',
                border: '1px solid var(--border-color)',
                padding: '32px',
                boxShadow: 'var(--shadow-drop)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '24px', marginBottom: '24px' }}>
                  <div style={{ background: 'var(--primary)', color: 'white', padding: '16px', borderRadius: '12px' }}>
                    <Music size={32} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 'bold' }}>Phase 1: Dictation Listening</p>
                    <h3 style={{ fontSize: '1.2rem', margin: '4px 0' }}>Listen and take notes carefully.</h3>
                  </div>
                </div>

                <audio 
                  ref={mediaRef} 
                  src={lesson.mediaUrl || lesson.audioUrl} 
                  onEnded={handleMediaEnd} 
                  controls={true}
                  onPlay={handleStartListening}
                  style={{ width: '100%', height: '40px', filter: 'invert(0.1)' }}
                />
              </div>

              {/* SPEED SELECTOR */}
              <div style={{
                padding: '24px',
                background: 'var(--bg-surface-elevated)',
                borderRadius: '16px',
                border: '1px solid var(--border-color)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                  <span style={{ fontWeight: 'bold' }}>Set Dictation Speed (WPM)</span>
                  <div style={{ background: 'var(--primary)', color: 'white', padding: '4px 12px', borderRadius: '20px', fontWeight: 'bold' }}>
                    {targetWpm} WPM
                  </div>
                </div>
                <input 
                  type="range" 
                  min="40" 
                  max="140" 
                  step="5" 
                  value={targetWpm} 
                  onChange={(e) => setTargetWpm(parseInt(e.target.value))}
                  style={{ width: '100%', accentColor: 'var(--primary)', cursor: 'pointer' }}
                />
              </div>

              <div style={{ textAlign: 'center', padding: '20px' }}>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '16px' }}>Ready to transcribe? After clicking the button below, the audio will stop and the timer will start.</p>
                <button className="btn btn-primary" onClick={handleStartTest} style={{ padding: '16px 48px', fontSize: '1.2rem', borderRadius: 'var(--radius-full)' }}>
                   Start Test
                </button>
              </div>
           </div>
        )}

        {/* PHASE 2: TRANSCRIPTION UI */}
        {(status === "running") && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', position: 'relative' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', background: 'rgba(56, 189, 248, 0.05)', borderRadius: '12px', border: '1px solid rgba(56, 189, 248, 0.1)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ background: 'var(--primary)', color: 'white', padding: '8px 24px', borderRadius: 'var(--radius-full)', fontWeight: 'bold', fontSize: '1.4rem' }}>
                  {formatTime(timeLeft)}
                </div>
                <div style={{ color: 'var(--text-secondary)' }}>
                  Phase 2: Typing / Transcription
                </div>
              </div>
              <button 
                className="btn" 
                onClick={handleSubmit} 
                style={{ 
                  background: 'rgba(244, 63, 94, 0.1)', 
                  color: 'var(--danger)', 
                  border: '1px solid var(--danger)',
                  padding: '8px 24px' 
                }}
              >
                End Test
              </button>
            </div>

            <textarea 
              ref={textAreaRef}
              value={typedText}
              onChange={(e) => setTypedText(e.target.value)}
              onKeyDown={handleKeyDown}
              onPaste={handlePasteDisabled}
              onContextMenu={(e) => e.preventDefault()}
              className="input-field"
              placeholder="Type your shorthand transcription here..."
              style={{ minHeight: '400px', resize: 'vertical', fontSize: '1.2rem', lineHeight: 1.8, padding: '24px' }}
              autoComplete="off"
              spellCheck="false"
            />
          </div>
        )}
      </div>

      {status === "finished" && result && (
        <div className="glass-card" style={{ padding: '32px', animation: 'fadeIn 0.5s ease-out' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px', color: 'var(--success)' }}>
            <CheckCircle size={32} />
            <h2 style={{ fontSize: '2rem' }}>Test Completed</h2>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '16px', marginBottom: '32px' }}>
            <div style={{ background: 'rgba(56, 189, 248, 0.05)', border: '1px solid rgba(56, 189, 248, 0.1)', padding: '16px', borderRadius: 'var(--radius-sm)', textAlign: 'center' }}>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginBottom: '4px', textTransform: 'uppercase' }}>Net WPM</p>
              <h3 style={{ fontSize: '1.8rem', color: 'var(--primary)' }}>{result.wpm}</h3>
            </div>
            <div style={{ background: 'rgba(16, 185, 129, 0.05)', border: '1px solid rgba(16, 185, 129, 0.1)', padding: '16px', borderRadius: 'var(--radius-sm)', textAlign: 'center' }}>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginBottom: '4px', textTransform: 'uppercase' }}>Accuracy</p>
              <h3 style={{ fontSize: '1.8rem', color: parseFloat(result.accuracy) > (100 - (lesson.allowedErrorPercent || 5)) ? 'var(--success)' : 'var(--danger)' }}>{result.accuracy}%</h3>
            </div>
            <div style={{ background: 'rgba(244, 63, 94, 0.05)', border: '1px solid rgba(244, 63, 94, 0.1)', padding: '16px', borderRadius: 'var(--radius-sm)', textAlign: 'center' }}>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginBottom: '4px', textTransform: 'uppercase' }}>Mistakes</p>
              <h3 style={{ fontSize: '1.8rem', color: 'var(--danger)' }}>{result.totalMistakes}</h3>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.05)', padding: '16px', borderRadius: 'var(--radius-sm)', textAlign: 'center' }}>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginBottom: '4px', textTransform: 'uppercase' }}>Errors (F/H)</p>
              <h3 style={{ fontSize: '1.5rem', color: 'var(--text-primary)' }}>{result.fullMistakes} / {result.halfMistakes}</h3>
            </div>
            {warnings > 0 && (
              <div style={{ background: 'rgba(245, 158, 11, 0.05)', border: '1px solid rgba(245, 158, 11, 0.1)', padding: '16px', borderRadius: 'var(--radius-sm)', textAlign: 'center' }}>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginBottom: '4px', textTransform: 'uppercase' }}>Warnings</p>
                <h3 style={{ fontSize: '1.8rem', color: 'var(--warning)' }}>{warnings}</h3>
              </div>
            )}
          </div>

          {/* Analytics Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '24px', marginBottom: '40px' }}>
            
            {/* Leaderboard Card */}
            <div className="glass-panel" style={{ padding: '24px' }}>
              <h4 style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '1px' }}>Global Leaderboard</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {leaderboard.map((a, i) => (
                  <div key={a.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: i === 0 ? 'rgba(56, 189, 248, 0.1)' : 'rgba(255,255,255,0.02)', borderRadius: '6px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>#{i+1}</span>
                      <span style={{ fontWeight: i === 0 ? 'bold' : 'normal' }}>{a.userName}</span>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: 'bold', color: 'var(--primary)' }}>{a.wpm} WPM</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{a.accuracy}% Acc</div>
                    </div>
                  </div>
                ))}
                {leaderboard.length === 0 && <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No attempts yet.</p>}
              </div>
            </div>

            {/* Performance Graph Card */}
            <div className="glass-panel" style={{ padding: '24px' }}>
              <h4 style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '1px' }}>WPM Progress</h4>
              {history.length > 1 ? (
                <div style={{ height: '120px', width: '100%', position: 'relative' }}>
                  <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
                    <polyline
                      fill="none"
                      stroke="var(--primary)"
                      strokeWidth="2"
                      points={history.map((h, i) => `${(i / (history.length - 1)) * 100},${100 - (h.wpm / 120) * 100}`).join(' ')}
                    />
                    {history.map((h, i) => (
                      <circle key={i} cx={(i / (history.length - 1)) * 100} cy={100 - (h.wpm / 120) * 100} r="2" fill="var(--primary)" />
                    ))}
                  </svg>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px', fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                    <span>First Attempt</span>
                    <span>Latest</span>
                  </div>
                </div>
              ) : (
                <div style={{ height: '120px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                  More attempts needed for progress graph.
                </div>
              )}
            </div>
          </div>

          <h3 style={{ marginBottom: '16px', color: 'var(--text-secondary)', fontSize: '1rem', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px' }}>Visual Text Analysis</h3>
          
          {/* Mistake Legend */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', marginBottom: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem' }}><div style={{ width: 12, height: 12, background: '#22c55e', borderRadius: '2px' }}></div> Correct</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem' }}><div style={{ width: 12, height: 12, background: '#ef4444', borderRadius: '2px' }}></div> Mistake / Addition</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem' }}><div style={{ width: 12, height: 12, background: '#0ea5e9', borderRadius: '2px' }}></div> Omission</div>
          </div>

          <div style={{ 
            background: '#f8fafc', 
            padding: '24px', 
            borderRadius: 'var(--radius-sm)', 
            lineHeight: 2.2, 
            border: '1px solid var(--border-color)', 
            color: '#334155',
            display: 'flex',
            flexWrap: 'wrap',
            gap: '8px 4px'
          }}>
            {result.visualHTML.map((item, idx) => {
              let style = { padding: '4px 8px', borderRadius: '4px', transition: 'all 0.2s', fontWeight: '500', display: 'inline-flex', alignItems: 'center', gap: '4px' };
              let tooltip = "";
              let isMistake = item.original && item.type !== 'correct';
              
              switch(item.type) {
                case 'correct':
                  style = { ...style, background: '#dcfce7', color: '#166534', borderBottom: '2px solid #22c55e' };
                  break;
                case 'extra':
                case 'substitution':
                case 'spelling':
                case 'capitalization':
                case 'punctuation':
                  style = { ...style, background: '#fee2e2', color: '#991b1b', borderBottom: '2px solid #ef4444' };
                  tooltip = item.type.charAt(0).toUpperCase() + item.type.slice(1) + " Mistake";
                  break;
                case 'missing':
                  style = { ...style, background: '#e0f2fe', color: '#0369a1', borderBottom: '2px solid #0ea5e9' };
                  tooltip = "Omission (Missing word)";
                  break;
                default:
                  style = { ...style, opacity: 0.5 };
              }

              return (
                <span key={idx} style={style} title={tooltip}>
                  {item.word}
                  {isMistake && (
                    <span style={{ 
                      fontSize: '0.8em', 
                      opacity: 0.7, 
                      fontWeight: 'normal',
                      paddingLeft: '4px',
                      borderLeft: '1px solid rgba(153, 27, 27, 0.2)',
                      marginLeft: '4px'
                    }}>
                      ({item.original})
                    </span>
                  )}
                </span>
              );
            })}
          </div>

          <div style={{ marginTop: '32px', display: 'flex', justifyContent: 'flex-end', gap: '16px' }}>
            <button className="btn btn-outline" onClick={handleReset}>
              Try Again
            </button>
            <button className="btn btn-primary" onClick={() => navigate('/dashboard')}>
              Go to Dashboard <ArrowRight size={20} />
            </button>
          </div>
        </div>
      )}

      <ModernModal 
        isOpen={modal.isOpen} 
        onClose={() => setModal({ ...modal, isOpen: false })}
        title={modal.title}
        message={modal.message}
      />

      {status === "starting" && (
        <div style={{
          position: 'fixed',
          top: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'var(--bg-surface)',
          border: '1px solid var(--primary)',
          padding: '12px 24px',
          borderRadius: 'var(--radius-full)',
          boxShadow: '0 10px 30px rgba(0,0,0,0.1)',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          zIndex: 2000,
          animation: 'slideInTop 0.4s ease-out'
        }}>
          <div style={{
            background: 'var(--primary)',
            color: 'white',
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 'bold',
            fontSize: '1.2rem',
            animation: 'countdownScale 1s infinite'
          }}>
            {countdown === 0 ? "!" : countdown}
          </div>
          <div style={{ fontWeight: '600' }}>
            {countdown === 0 ? "GO! Start Typing" : `Prepare... Dictation starts in ${countdown}s`}
          </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{__html: `
        @keyframes pulse {
          0% { box-shadow: 0 0 0 0 rgba(56, 189, 248, 0.7); }
          70% { box-shadow: 0 0 0 10px rgba(56, 189, 248, 0); }
          100% { box-shadow: 0 0 0 0 rgba(56, 189, 248, 0); }
        }
        @keyframes fadeInOut {
          0% { opacity: 0; transform: translate(-50%, 10px); }
          15% { opacity: 1; transform: translate(-50%, 0); }
          85% { opacity: 1; transform: translate(-50%, 0); }
          100% { opacity: 0; transform: translate(-50%, -10px); }
        }
        @keyframes countdownScale {
          0% { transform: scale(0.8); }
          50% { transform: scale(1.1); }
          100% { transform: scale(1); }
        }
        @keyframes slideInTop {
          from { transform: translate(-50%, -40px); opacity: 0; }
          to { transform: translate(-50%, 0); opacity: 1; }
        }
      `}} />
    </div>
  );
}
