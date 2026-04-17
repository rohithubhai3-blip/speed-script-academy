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
  const [timeLeft, setTimeLeft] = useState(300); // Default to 300s (5m) instead of null
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
      
      // Robust time limit parser
      let secs = 300;
      try {
        if (data.timeLimit && typeof data.timeLimit === 'string') {
          const parts = data.timeLimit.split(':').map(val => parseInt(val) || 0);
          if (parts.length === 3) {
            secs = parts[0] * 3600 + parts[1] * 60 + parts[2];
          } else if (parts.length === 2) {
            secs = parts[0] * 60 + parts[1];
          } else if (parts.length === 1) {
            secs = parts[0] * 60; // Assume as minutes if single number string
          }
        } else if (data.timeMinutes) {
          secs = parseInt(data.timeMinutes) * 60;
        }
      } catch (e) {
        console.warn("Time parsing error, using default 5m", e);
        secs = 300;
      }

      if (!secs || isNaN(secs) || secs < 0) secs = 300;
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
    // Set to ready state - timer won't start until they type first char
    setStatus("typing_ready");
    
    // Focus typing box after a short delay to allow UI to render
    setTimeout(() => {
      if(textAreaRef.current) textAreaRef.current.focus();
    }, 100);
  };

  const startTypingTest = () => {
    setStatus("running");
    setStartTime(Date.now());
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
    
    // Add rules to result for UI display
    const finalResult = { ...analysis, rules };
    setResult(finalResult);

    // Save attempt
    await db.addAttempt({
      userId: user.id,
      userName: user.name,
      courseId,
      levelId,
      lessonId,
      lessonTitle: lesson.title,
      ...finalResult,
      timestamp: Date.now()
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

              {/* SPEED SELECTOR - DROPDOWN UPGRADE */}
              <div style={{
                padding: '24px',
                background: 'var(--bg-surface-elevated)',
                borderRadius: '16px',
                border: '1px solid var(--border-color)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '20px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <Settings size={20} style={{ color: 'var(--primary)' }} />
                  <span style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>Select Dictation Speed</span>
                </div>

                <div style={{ position: 'relative', width: '200px' }}>
                  <select 
                    value={targetWpm} 
                    onChange={(e) => setTargetWpm(parseInt(e.target.value))}
                    className="input-field"
                    style={{ 
                      width: '100%', 
                      padding: '12px 20px', 
                      borderRadius: '12px', 
                      appearance: 'none', 
                      cursor: 'pointer',
                      fontWeight: 'bold',
                      color: 'var(--primary)',
                      border: '2px solid var(--primary)',
                      background: 'rgba(56, 189, 248, 0.05)'
                    }}
                  >
                    {Array.from({ length: (160 - 40) / 5 + 1 }, (_, i) => 40 + i * 5).map(speed => (
                      <option key={speed} value={speed}>{speed} WPM</option>
                    ))}
                  </select>
                  <div style={{
                    position: 'absolute',
                    right: '15px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    pointerEvents: 'none'
                  }}>
                    <ArrowRight size={18} style={{ transform: 'rotate(90deg)', color: 'var(--primary)' }} />
                  </div>
                </div>
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
        {(status === "running" || status === "typing_ready") && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', position: 'relative' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', background: 'rgba(56, 189, 248, 0.05)', borderRadius: '12px', border: '1px solid rgba(56, 189, 248, 0.1)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ 
                  background: status === "running" ? 'var(--primary)' : 'var(--text-muted)', 
                  color: 'white', 
                  padding: '8px 24px', 
                  borderRadius: 'var(--radius-full)', 
                  fontWeight: 'bold', 
                  fontSize: '1.4rem',
                  transition: 'all 0.3s'
                }}>
                  {formatTime(timeLeft)}
                </div>
                <div style={{ color: 'var(--text-secondary)' }}>
                  {status === "running" ? "Phase 2: Transcription (Active)" : "Phase 2: Transcription (Ready - Start Typing)"}
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
              onChange={(e) => {
                setTypedText(e.target.value);
                if (status === "typing_ready" && e.target.value.length > 0) {
                  startTypingTest();
                }
              }}
              onKeyDown={handleKeyDown}
              onPaste={handlePasteDisabled}
              onContextMenu={(e) => e.preventDefault()}
              className="input-field"
              placeholder={status === "typing_ready" ? "Type your first character to start the timer..." : "Type your shorthand transcription here..."}
              style={{ 
                minHeight: '400px', 
                resize: 'vertical', 
                fontSize: '1.2rem', 
                lineHeight: 1.8, 
                padding: '24px',
                border: status === 'typing_ready' ? '2px dashed var(--primary)' : '1px solid var(--border-color)'
              }}
              autoComplete="off"
              spellCheck="false"
            />
          </div>
        )}
      </div>

      {status === "finished" && result && (
        <div style={{ maxWidth: '1000px', margin: '0 auto', animation: 'fadeIn 0.5s ease-out' }}>
          
          <div className="glass-card" style={{ padding: '48px', marginBottom: '32px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
            {/* PASS/FAIL BADGE */}
            <div style={{
              position: 'absolute',
              top: '20px',
              right: '24px',
              transform: 'rotate(15deg)',
              border: `4px double ${parseFloat(result.errorPercent) <= (lesson.allowedErrorPercent || 5) ? '#22c55e' : '#ef4444'}`,
              color: parseFloat(result.errorPercent) <= (lesson.allowedErrorPercent || 5) ? '#22c55e' : '#ef4444',
              padding: '12px 24px',
              borderRadius: '8px',
              fontWeight: '900',
              fontSize: '1.5rem',
              textTransform: 'uppercase',
              background: 'rgba(255,255,255,0.05)',
              boxShadow: '0 0 20px rgba(0,0,0,0.1)',
              zIndex: 10
            }}>
              {parseFloat(result.errorPercent) <= (lesson.allowedErrorPercent || 5) ? 'Passed' : 'Not Qualified'}
            </div>

            <div style={{ marginBottom: '32px' }}>
               <h2 style={{ fontSize: '2.5rem', fontWeight: '800', marginBottom: '8px' }}>Course Completed</h2>
               <p style={{ color: 'var(--text-secondary)' }}>Detailed evaluation for <strong>{lesson.title}</strong></p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '24px', marginBottom: '40px' }}>
              
              {/* ACCURACY GAUGE */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px', background: 'rgba(255,255,255,0.03)', borderRadius: '24px' }}>
                 <div style={{ position: 'relative', width: '120px', height: '120px', marginBottom: '16px' }}>
                    <svg viewBox="0 0 36 36" style={{ width: '100%', height: '100%' }}>
                       <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#eee" strokeWidth="3" />
                       <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="var(--primary)" strokeWidth="3" strokeDasharray={`${result.accuracy}, 100`} />
                    </svg>
                    <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', fontWeight: 'bold', fontSize: '1.3rem' }}>
                      {result.accuracy}%
                    </div>
                 </div>
                 <span style={{ fontWeight: 'bold', textTransform: 'uppercase', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Accuracy Rate</span>
              </div>

              {/* NET WPM */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px', background: 'rgba(56, 189, 248, 0.05)', borderRadius: '24px', border: '1px solid rgba(56, 189, 248, 0.1)' }}>
                 <h3 style={{ fontSize: '3rem', fontWeight: '900', color: 'var(--primary)', lineHeight: 1 }}>{result.wpm}</h3>
                 <span style={{ fontWeight: 'bold', textTransform: 'uppercase', fontSize: '0.8rem', color: 'var(--primary)', marginTop: '8px' }}>Net WPM</span>
              </div>

              {/* MISTAKE TOTAL */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px', background: 'rgba(244, 63, 94, 0.05)', borderRadius: '24px', border: '1px solid rgba(244, 63, 94, 0.1)' }}>
                 <h3 style={{ fontSize: '3rem', fontWeight: '900', color: 'var(--danger)', lineHeight: 1 }}>{result.totalMistakes}</h3>
                 <span style={{ fontWeight: 'bold', textTransform: 'uppercase', fontSize: '0.8rem', color: 'var(--danger)', marginTop: '8px' }}>Total Mistakes</span>
              </div>
            </div>

            {/* ERROR CATEGORY TABLE */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '12px' }}>
               {[
                 { label: 'Full Mistakes', val: result.fullMistakes, color: 'var(--danger)' },
                 { label: 'Half Mistakes', val: result.halfMistakes, color: '#f59e0b' },
                 { label: 'Omissions', val: result.omissions, color: '#0ea5e9' },
                 { label: 'Additions', val: result.additions, color: '#ec4899' },
                 { label: 'Substitutions', val: result.substitutions, color: '#8b5cf6' }
               ].map(stat => (
                 <div key={stat.label} style={{ padding: '12px', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: stat.color }}>{stat.val}</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>{stat.label}</div>
                 </div>
               ))}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '32px', marginBottom: '40px' }}>
            
            {/* RULES APPLIED BOARD */}
            <div className="glass-panel" style={{ padding: '24px' }}>
               <h4 style={{ fontSize: '0.9rem', fontWeight: 'bold', color: 'var(--text-secondary)', marginBottom: '20px', textTransform: 'uppercase' }}>Examination Rules Applied</h4>
               <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '8px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                     <span style={{ color: 'var(--text-muted)' }}>Capitalization</span>
                     <span style={{ fontWeight: 'bold' }}>{result.rules?.capRule || 'Ignore'}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '8px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                     <span style={{ color: 'var(--text-muted)' }}>Punctuation</span>
                     <span style={{ fontWeight: 'bold' }}>{result.rules?.punctRule || 'Ignore'}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '8px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                     <span style={{ color: 'var(--text-muted)' }}>Spelling / Similar Words</span>
                     <span style={{ fontWeight: 'bold' }}>{result.rules?.similarWordRule || 'Strict'}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '8px' }}>
                     <span style={{ color: 'var(--text-muted)' }}>Allowed Error Threshold</span>
                     <span style={{ fontWeight: 'bold', color: 'var(--warning)' }}>{lesson.allowedErrorPercent || 5}%</span>
                  </div>
               </div>
            </div>

            {/* PERFORMANCE METRICS */}
            <div className="glass-panel" style={{ padding: '24px' }}>
               <h4 style={{ fontSize: '0.9rem', fontWeight: 'bold', color: 'var(--text-secondary)', marginBottom: '20px', textTransform: 'uppercase' }}>Performance Summary</h4>
               <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div style={{ textAlign: 'center' }}>
                     <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{result.totalWords}</div>
                     <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Total Words</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                     <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--primary)' }}>{result.typedWords}</div>
                     <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Typed Words</div>
                  </div>
                  <div style={{ textAlign: 'center', gridColumn: 'span 2', padding: '12px', background: 'rgba(255,255,255,0.02)', borderRadius: '12px' }}>
                     <div style={{ fontSize: '0.9rem', fontWeight: 'bold', color: 'var(--text-secondary)' }}>
                       Total Mistakes: <span style={{ color: 'var(--danger)' }}>{result.totalMistakes}</span>
                     </div>
                     <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Weighted Score</div>
                  </div>
               </div>
            </div>
          </div>

          <h3 style={{ marginBottom: '16px', color: 'var(--text-secondary)', fontSize: '1rem', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px' }}>Visual Error Breakdown</h3>
          
          <div style={{ 
            background: '#ffffff', 
            padding: '40px', 
            borderRadius: '24px', 
            lineHeight: 2.8, 
            border: '1px solid var(--border-color)', 
            color: '#334155',
            boxShadow: 'var(--shadow-premium)',
            display: 'flex',
            flexWrap: 'wrap',
            gap: '12px 6px',
            marginBottom: '48px'
          }}>
            {result.visualHTML.map((item, idx) => {
              let style = { padding: '4px 12px', borderRadius: '8px', fontSize: '1.15rem', fontWeight: '500', display: 'inline-flex', alignItems: 'center', flexWrap: 'wrap', gap: '8px' };
              
              switch(item.type) {
                case 'correct': return <span key={idx} style={{ ...style, color: '#1e293b' }}>{item.word}</span>;
                case 'missing': return <span key={idx} style={{ ...style, background: 'rgba(14, 165, 233, 0.08)', color: '#0369a1', border: '1px dashed #0ea5e9', textDecoration: 'line-through' }}>{item.word}</span>;
                case 'extra': return <span key={idx} style={{ ...style, background: 'rgba(236, 72, 153, 0.08)', color: '#be185d', border: '1px dashed #ec4899' }}>{item.word} <small style={{ fontSize: '0.6rem', opacity: 0.6 }}>(extra)</small></span>;
                case 'substitution': return (
                  <span key={idx} style={{ ...style, background: 'rgba(239, 68, 68, 0.08)', color: '#b91c1c', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                    <span style={{ textDecoration: 'line-through', opacity: 0.5 }}>{item.original}</span>
                    <ArrowRight size={14} style={{ opacity: 0.5 }} />
                    {item.word}
                  </span>
                );
                default: return <span key={idx} style={{ ...style, color: '#ef4444', textDecoration: 'underline wavy #ef4444' }}>{item.word}</span>;
              }
            })}
          </div>

          <div style={{ textAlign: 'center', marginBottom: '80px' }}>
             <button onClick={() => navigate('/courses')} className="btn btn-primary" style={{ padding: '16px 64px', fontSize: '1.2rem', boxShadow: '0 10px 25px rgba(56, 189, 248, 0.3)' }}>Back to Courses</button>
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
