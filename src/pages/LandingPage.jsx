import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  ArrowRight, Activity, Zap, ShieldCheck, Server, 
  ChevronDown, ChevronUp, CheckCircle, Smartphone 
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
    db.getSiteContent().then(setContent);
  }, []);

  if (!content) return null;

  return (
    <div style={{ paddingBottom: '0px' }}>
      
      {/* Hero Section */}
      <section style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        justifyContent: 'center', 
        minHeight: '80vh', 
        textAlign: 'center', 
        padding: '100px 20px 60px',
        position: 'relative'
      }}>
        <div style={{ maxWidth: '900px', zIndex: 10 }}>
          <div className="badge" style={{ marginBottom: '20px' }}>Ranked #1 Shorthand Platform</div>
          <h1 style={{ 
            fontSize: '4.5rem', 
            fontWeight: 800, 
            marginBottom: '24px', 
            lineHeight: 1.1,
            background: 'linear-gradient(to right, var(--primary), var(--secondary))', 
            WebkitBackgroundClip: 'text', 
            WebkitTextFillColor: 'transparent' 
          }}>
            {content.hero.title}
          </h1>
          
          <p style={{ fontSize: '1.4rem', color: 'var(--text-secondary)', marginBottom: '40px', lineHeight: 1.6 }}>
            {content.hero.subtitle}
          </p>

          <div style={{ display: 'flex', gap: '16px', justifyContent: 'center' }}>
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
        </div>
      </section>

      {/* Stats Section */}
      <section style={{ padding: '40px 20px', background: 'rgba(var(--primary-rgb), 0.03)', borderY: '1px solid var(--border-color)' }}>
        <div className="container" style={{ display: 'flex', justifyContent: 'space-around', flexWrap: 'wrap', gap: '30px' }}>
          {content.stats.map((stat, i) => (
            <div key={i} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '3rem', fontWeight: 700, color: 'var(--primary)' }}>{stat.value}</div>
              <div style={{ fontSize: '1rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features Grid */}
      <section style={{ padding: '100px 20px' }}>
        <div className="container text-center">
          <h2 style={{ fontSize: '3rem', marginBottom: '60px' }}>Premium Student Experience</h2>
          <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', justifyContent: 'center' }}>
            {content.features.map((feature, i) => (
              <div key={i} className="glass-card" style={{ flex: '1 1 250px', padding: '40px 30px', textAlign: 'left', transition: 'transform 0.3s ease' }}>
                <div style={{ marginBottom: '20px', color: 'var(--primary)' }}>
                  {iconMap[feature.icon] || <CheckCircle size={32} />}
                </div>
                <h3 style={{ fontSize: '1.5rem', marginBottom: '12px' }}>{feature.title}</h3>
                <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6 }}>{feature.desc}</p>
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
