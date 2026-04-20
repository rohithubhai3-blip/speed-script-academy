import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  ArrowRight, Activity, Zap, ShieldCheck, Server, 
  ChevronDown, ChevronUp, CheckCircle, Smartphone,
  PlayCircle, Send, MessageCircle, Star 
} from 'lucide-react';
import useStore from '../store/useStore';
import { db } from '../data/db';

const iconMap = {
  Activity: <Activity size={32} />,
  Zap: <Zap size={32} />,
  ShieldCheck: <ShieldCheck size={32} />,
  Server: <Server size={32} />,
  Smartphone: <Smartphone size={32} />
};

export default function LandingPage() {
  const user = useStore(state => state.user);
  const [content, setContent] = useState(null);
  const [openFaq, setOpenFaq] = useState(null);

  useEffect(() => {
    db.getSiteContent().then(res => {
      setContent(res);
      // 🔥 Dynamic SEO Injection
      if (res.seo) {
        document.title = res.seo.title || "Speed Script Academy";
        let metaDesc = document.querySelector('meta[name="description"]');
        if (!metaDesc) {
           metaDesc = document.createElement('meta');
           metaDesc.name = "description";
           document.head.appendChild(metaDesc);
        }
        metaDesc.content = res.seo.description || "";

        let metaKw = document.querySelector('meta[name="keywords"]');
        if (!metaKw) {
           metaKw = document.createElement('meta');
           metaKw.name = "keywords";
           document.head.appendChild(metaKw);
        }
        metaKw.content = res.seo.keywords || "";
      }
    });
  }, []);

  if (!content) return (
    <div style={{ padding: '100px 20px', textAlign: 'center', minHeight: '80vh', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
      <h2 className="animate-pulse">Loading Academy Experience...</h2>
      <p style={{ color: 'var(--text-secondary)' }}>Preparing your seat in the classroom.</p>
    </div>
  );

  return (
    <div style={{ paddingBottom: '0px' }}>
      
      {/* Announcement Banner */}
      {content.banner?.enabled && (
        <div style={{ 
          background: 'linear-gradient(90deg, var(--primary), var(--secondary))', 
          color: 'white', 
          padding: '10px 20px', 
          textAlign: 'center', 
          fontWeight: 700, 
          fontSize: '0.9rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '12px',
          position: 'sticky',
          top: 0,
          zIndex: 100
        }}>
          <span>{content.banner.text}</span>
          {content.banner.link && (
            <a href={content.banner.link} className="btn" style={{ padding: '4px 12px', fontSize: '0.75rem', background: 'white', color: 'var(--primary)' }}>
              Check Now
            </a>
          )}
        </div>
      )}

      {/* Hero Section */}
      <section style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        justifyContent: 'center', 
        minHeight: '85vh', 
        textAlign: 'center', 
        padding: '120px 20px 80px',
        position: 'relative'
      }}>
        <div style={{ maxWidth: '900px', zIndex: 10 }}>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginBottom: '24px', flexWrap: 'wrap' }}>
            <div className="badge animate-fade-in" style={{ background: 'rgba(59, 130, 246, 0.1)', color: 'var(--primary)', border: '1px solid rgba(59, 130, 246, 0.2)', padding: '8px 16px', borderRadius: 'var(--radius-full)', fontWeight: 600, fontSize: '0.9rem' }}>✨ Ranked #1 Shorthand Platform</div>
            {content.promoBadge?.enabled && (
              <div className="badge animate-fade-in" style={{ animationDelay: '0.1s', background: 'rgba(34, 197, 94, 0.1)', color: '#22c55e', border: '1px solid rgba(34, 197, 94, 0.2)', padding: '8px 16px', borderRadius: 'var(--radius-full)', fontWeight: 700, fontSize: '0.9rem', boxShadow: '0 0 15px rgba(34, 197, 94, 0.2)' }}>
                {content.promoBadge.text}
              </div>
            )}
          </div>
          <h1 className="animate-fade-in" style={{ 
            fontSize: 'clamp(3rem, 6vw, 5.5rem)', 
            fontWeight: 800, 
            marginBottom: '24px', 
            lineHeight: 1.1,
            animationDelay: '0.1s'
          }}>
            Master Shorthand with <br />
            <span className="text-gradient glow-text" style={{ paddingBottom: '10px' }}>AI-Powered Precision</span>
          </h1>
          
          <p className="animate-fade-in" style={{ fontSize: '1.4rem', color: 'var(--text-secondary)', marginBottom: '40px', lineHeight: 1.6, animationDelay: '0.2s', maxWidth: '700px', margin: '0 auto 40px' }}>
            {content.hero.subtitle}
          </p>

          <div className="animate-fade-in" style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap', animationDelay: '0.3s' }}>
            {user ? (
              <Link to={user.role === 'admin' ? '/admin' : '/dashboard'} className="btn btn-primary" style={{ padding: '16px 40px', fontSize: '1.1rem' }}>
                Go to Dashboard <ArrowRight size={20} />
              </Link>
            ) : (
              <>
                <Link to="/register" className="btn btn-primary" style={{ padding: '16px 40px', fontSize: '1.1rem' }}>
                  Start Free Trial <ArrowRight size={20} />
                </Link>
                <Link to="/login" className="btn btn-outline" style={{ padding: '16px 40px', fontSize: '1.1rem' }}>
                  Login
                </Link>
              </>
            )}
          </div>

          {/* Dynamic 3D Social Buttons */}
          {(content.socials?.youtube || content.socials?.telegram || content.socials?.whatsapp) && (
            <div className="animate-fade-in" style={{ display: 'flex', gap: '20px', justifyContent: 'center', marginTop: '48px', animationDelay: '0.5s', flexWrap: 'wrap' }}>
              {content.socials.youtube && (
                <a href={content.socials.youtube} target="_blank" rel="noopener noreferrer" className="social-btn-3d youtube">
                  <PlayCircle size={20} /> <span>YouTube</span>
                  <div className="btn-glow"></div>
                </a>
              )}
              {content.socials.telegram && (
                <a href={content.socials.telegram} target="_blank" rel="noopener noreferrer" className="social-btn-3d telegram">
                  <Send size={20} /> <span>Telegram</span>
                  <div className="btn-glow"></div>
                </a>
              )}
              {content.socials.whatsapp && (
                <a href={`https://wa.me/${content.socials.whatsapp}`} target="_blank" rel="noopener noreferrer" className="social-btn-3d whatsapp">
                  <MessageCircle size={20} /> <span>WhatsApp</span>
                  <div className="btn-glow"></div>
                </a>
              )}
            </div>
          )}
        </div>
      </section>

      {/* Stats Section */}
      <section style={{ padding: '60px 20px', position: 'relative' }}>
        <div style={{ position: 'absolute', top: 0, left: '10%', right: '10%', height: '1px', background: 'linear-gradient(90deg, transparent, var(--border-color), transparent)' }} />
        <div className="container" style={{ display: 'flex', justifyContent: 'space-around', flexWrap: 'wrap', gap: '30px', maxWidth: '1000px', margin: '0 auto' }}>
          {content.stats.map((stat, i) => (
            <div key={i} style={{ textAlign: 'center', padding: '20px' }}>
              <div className="text-gradient" style={{ fontSize: '3.5rem', fontWeight: 800, marginBottom: '8px' }}>{stat.value}</div>
              <div style={{ fontSize: '0.95rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '2px', fontWeight: 600 }}>{stat.label}</div>
            </div>
          ))}
        </div>
        <div style={{ position: 'absolute', bottom: 0, left: '10%', right: '10%', height: '1px', background: 'linear-gradient(90deg, transparent, var(--border-color), transparent)' }} />
      </section>

      {/* Features Bento Grid */}
      <section style={{ padding: '120px 20px' }}>
        <div className="container" style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '80px' }}>
            <h2 style={{ fontSize: 'clamp(2.5rem, 5vw, 3.5rem)', marginBottom: '16px' }}>Premium <span className="text-gradient">Student Experience</span></h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '1.2rem', maxWidth: '600px', margin: '0 auto' }}>Everything you need to master English shorthand speed and accuracy.</p>
          </div>
          
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', 
            gap: '24px' 
          }}>
            {content.features.map((feature, i) => (
              <div key={i} className="glass-card" style={{ 
                padding: '40px', 
                display: 'flex', 
                flexDirection: 'column',
                gridColumn: i === 0 || i === 3 ? 'span 2' : 'span 1' /* Bento Grid sizing */
              }}>
                <div style={{ 
                  marginBottom: '24px', 
                  color: 'var(--primary)', 
                  background: 'rgba(59, 130, 246, 0.1)', 
                  width: '64px', height: '64px', 
                  borderRadius: '16px', 
                  display: 'flex', alignItems: 'center', justifyContent: 'center' 
                }}>
                  {iconMap[feature.icon] || <CheckCircle size={32} />}
                </div>
                <h3 style={{ fontSize: '1.8rem', marginBottom: '16px' }}>{feature.title}</h3>
                <p style={{ color: 'var(--text-secondary)', lineHeight: 1.7, fontSize: '1.1rem' }}>{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section style={{ padding: '100px 20px', background: 'var(--bg-surface)' }}>
        <div className="container">
          <div style={{ textAlign: 'center', marginBottom: '60px' }}>
            <h2 style={{ fontSize: '3rem' }}>How It Works</h2>
            <p className="text-secondary">Get started in 4 simple steps</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '30px' }}>
            {content.howItWorks.map((step, i) => (
              <div key={i} style={{ position: 'relative', padding: '20px' }}>
                 <div style={{ 
                   width: '40px', height: '40px', background: 'var(--primary)', color: 'white', borderRadius: '50%', 
                   display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', fontWeight: 'bold',
                   marginBottom: '20px'
                 }}>{i+1}</div>
                 <h4 style={{ marginBottom: '10px' }}>{step.title}</h4>
                 <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>{step.desc}</p>
                 {i < 3 && <div className="hide-mobile" style={{ position: 'absolute', top: '40px', right: '-20px', width: '40px', height: '2px', background: 'var(--border-color)' }}></div>}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section style={{ padding: '100px 20px' }}>
        <div className="container" style={{ maxWidth: '800px' }}>
           <h2 className="text-center" style={{ marginBottom: '60px', fontSize: '3rem' }}>Frequently Asked Questions</h2>
           <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {content.faq.map((item, i) => (
                <div key={i} className="glass-panel" style={{ cursor: 'pointer', padding: '0' }}>
                  <div 
                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                    style={{ padding: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                  >
                    <h4 style={{ margin: 0 }}>{item.q}</h4>
                    {openFaq === i ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                  </div>
                  {openFaq === i && (
                    <div style={{ padding: '0 24px 24px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                      {item.a}
                    </div>
                  )}
                </div>
              ))}
           </div>
        </div>
      </section>

      {/* Wall of Love (Student Reviews) */}
      {content.reviews && content.reviews.length > 0 && (
        <section style={{ padding: '100px 20px', background: 'var(--bg-surface-elevated)' }}>
          <div className="container" style={{ maxWidth: '1200px', margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: '80px' }}>
              <h2 style={{ fontSize: '3rem', marginBottom: '16px' }}>Wall of <span className="text-gradient">Student Success</span></h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '1.2rem', maxWidth: '600px', margin: '0 auto' }}>Don't just take our word for it. See what our selections say.</p>
            </div>
            
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', 
              gap: '24px' 
            }}>
              {content.reviews.map((review, i) => (
                <div key={i} className="glass-card" style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ display: 'flex', gap: '4px', color: '#F59E0B' }}>
                    {[...Array(review.stars || 5)].map((_, sIdx) => <Star key={sIdx} size={20} fill="currentColor" />)}
                  </div>
                  <p style={{ fontSize: '1.1rem', lineHeight: 1.6, flex: 1 }}>"{review.text}"</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--border-color)' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--primary), var(--secondary))', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold' }}>
                      {review.name.charAt(0)}
                    </div>
                    <div>
                      <h4 style={{ margin: 0, fontSize: '1rem' }}>{review.name}</h4>
                      <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--primary)' }}>{review.role}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Bottom CTA */}
      <section style={{ padding: '100px 20px', textAlign: 'center' }}>
        <div className="glass-panel" style={{ padding: '80px 40px', background: 'linear-gradient(135deg, rgba(var(--primary-rgb), 0.1), rgba(var(--secondary-rgb), 0.1))' }}>
          <h2 style={{ fontSize: '3.5rem', marginBottom: '24px' }}>Ready to Scale Your Speed?</h2>
          <p style={{ fontSize: '1.2rem', marginBottom: '32px' }}>Join 1,200+ students already mastering shorthand with us.</p>
          <Link to="/register" className="btn btn-primary btn-lg">Join the Academy Now</Link>
        </div>
      </section>

    </div>
  );
}
