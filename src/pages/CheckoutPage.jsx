import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db } from '../data/db';
import useStore from '../store/useStore';
import { Lock, CheckCircle, Gift, QrCode, Copy, Send, MessageCircle } from 'lucide-react';

export default function CheckoutPage() {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const user = useStore(state => state.user);
  
  const [course, setCourse] = useState(null);
  const [settings, setSettings] = useState({ upiId: '', whatsappNumber: '', qrCodeUrl: '' });
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [promoCode, setPromoCode] = useState('');
  const [promoError, setPromoError] = useState('');
  const [hasPendingRequest, setHasPendingRequest] = useState(false);

  useEffect(() => {
    async function init() {
      try {
        const [c, s, requests] = await Promise.all([
          db.getCourseById(courseId),
          db.getGlobalSettings(),
          db.getPendingRequests()
        ]);

        if (!c) return navigate('/courses');
        if (user?.purchasedCourses?.includes(courseId)) {
          return navigate('/courses');
        }

        setCourse(c);
        setSettings(s);
        
        const pending = requests.find(r => r.userId === user.id && r.courseId === courseId);
        if (pending) setHasPendingRequest(true);
      } catch (err) {
        console.error("Checkout init failed:", err);
        navigate('/courses');
      } finally {
        setLoading(false);
      }
    }
    init();
  }, [courseId, navigate, user]);

  const handleManualPaymentSubmit = async () => {
    setProcessing(true);
    try {
      await db.submitPurchaseRequest(user.id, courseId);
      
      // WhatsApp message template
      const message = encodeURIComponent(`Hi Admin, I have paid ₹${course.price} for the course: "${course.title}". My registered email is: ${user.email}. Please find the payment screenshot attached.`);
      const whatsappUrl = `https://wa.me/${settings.whatsappNumber}?text=${message}`;
      
      // Open WhatsApp
      window.open(whatsappUrl, '_blank');
      
      setHasPendingRequest(true);
      alert("Purchase request sent! Please ensure you have sent the screenshot on WhatsApp. Access will be granted after manual verification.");
      navigate('/dashboard');
    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      setProcessing(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    alert("UPI ID Copied!");
  };

  const handleApplyPromo = async () => {
    if(!promoCode) return;
    setProcessing(true);
    setPromoError('');
    try {
      const updatedUser = await db.redeemPromoCode(user.id, promoCode);
      useStore.getState().updateUser(updatedUser);
      alert("Promo Code Applied Successfully! Course unlocked.");
      navigate('/courses');
    } catch (err) {
      setPromoError(err.message);
      setProcessing(false);
    }
  };

  if (loading) return <div style={{ padding: '40px', textAlign: 'center' }}>Loading secure checkout...</div>;

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', width: '100%', padding: '40px 20px' }}>
      <div style={{ textAlign: 'center', marginBottom: '40px' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(14, 165, 233, 0.1)', color: 'var(--primary)', width: '64px', height: '64px', borderRadius: '50%', marginBottom: '16px' }}>
          <Lock size={32} />
        </div>
        <h1 style={{ fontSize: '2.5rem', marginBottom: '8px' }}>Manual Checkout</h1>
        <p style={{ color: 'var(--text-secondary)' }}>Pay via UPI/QR and send the screenshot for manual verification.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '32px' }}>
        
        {/* PAYMENT GUIDE */}
        <div className="glass-panel" style={{ padding: '32px' }}>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <QrCode className="text-primary" /> Step 1: Scan & Pay
          </h2>

          <div style={{ background: 'var(--bg-base)', padding: '24px', borderRadius: '16px', textAlign: 'center', border: '1px solid var(--border-color)', marginBottom: '24px' }}>
            {settings.qrCodeUrl ? (
              <img src={settings.qrCodeUrl} alt="Payment QR" style={{ maxWidth: '280px', width: '100%', borderRadius: '12px', border: '8px solid white', boxShadow: 'var(--shadow-drop)' }} />
            ) : (
              <div style={{ padding: '40px', color: 'var(--text-muted)' }}>Admin has not uploaded a QR code yet. Please use UPI ID.</div>
            )}
            
            <div style={{ marginTop: '24px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>UPI ID</span>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', background: 'var(--bg-surface)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                <span style={{ fontWeight: 600, letterSpacing: '0.5px' }}>{settings.upiId || 'Not Set'}</span>
                {settings.upiId && <button onClick={() => copyToClipboard(settings.upiId)} style={{ background: 'transparent', border: 'none', color: 'var(--primary)', cursor: 'pointer' }}><Copy size={16}/></button>}
              </div>
            </div>
          </div>

          <h2 style={{ fontSize: '1.5rem', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <MessageCircle className="text-primary" /> Step 2: Verification
          </h2>
          
          <div style={{ background: 'rgba(5, 150, 105, 0.05)', border: '1px solid rgba(5, 150, 105, 0.2)', padding: '20px', borderRadius: '12px', marginBottom: '24px' }}>
            <p style={{ color: 'var(--success)', fontSize: '0.95rem', lineHeight: '1.5' }}>
              Once you have paid <strong>₹{course.price}</strong>, click the button below. It will open WhatsApp where you can send your payment receipt. Access will be granted within 2-4 hours.
            </p>
          </div>

          {hasPendingRequest ? (
            <div style={{ textAlign: 'center', padding: '20px', background: 'var(--bg-surface-elevated)', borderRadius: '12px', color: 'var(--warning)', fontWeight: 'bold' }}>
              Verification Request Already Sent. Check WhatsApp.
            </div>
          ) : (
            <button 
              onClick={handleManualPaymentSubmit} 
              className="btn btn-primary" 
              style={{ width: '100%', padding: '18px', fontSize: '1.1rem', gap: '12px' }} 
              disabled={processing || !settings.whatsappNumber}
            >
              <Send size={20} /> I've Paid - Send Screenshot on WhatsApp
            </button>
          )}
          {!settings.whatsappNumber && <p style={{ color: 'var(--danger)', fontSize: '0.8rem', marginTop: '8px', textAlign: 'center' }}>Admin WhatsApp not configured. Please contact support.</p>}
        </div>

        {/* ORDER SUMMARY */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div className="glass-panel" style={{ padding: '32px' }}>
            <h2 style={{ fontSize: '1.2rem', marginBottom: '24px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>Order Details</h2>
            
            <div style={{ marginBottom: '24px' }}>
              <h3 style={{ fontSize: '1.2rem', color: 'var(--primary)', marginBottom: '4px' }}>{course.title}</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{course.description}</p>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Amount Payable</span>
              <strong style={{ fontSize: '1.4rem', color: 'var(--primary)' }}>₹{course.price || 0}</strong>
            </div>

            <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '24px', marginTop: '12px' }}>
              <h4 style={{ fontSize: '0.9rem', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}><Gift size={16}/> Have a Promo Code?</h4>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input type="text" className="input-field" placeholder="Enter code" value={promoCode} onChange={e=>setPromoCode(e.target.value)} style={{ flex: 1 }} />
                <button className="btn btn-outline" onClick={handleApplyPromo} disabled={processing}>Apply</button>
              </div>
              {promoError && <p style={{ color: 'var(--danger)', fontSize: '0.8rem', marginTop: '8px' }}>{promoError}</p>}
            </div>
          </div>

          <div className="glass-card" style={{ padding: '24px', background: 'var(--bg-surface-elevated)', border: '1px dashed var(--primary)' }}>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', textAlign: 'center' }}>
              <Lock size={14} style={{ marginRight: '4px' }}/> Secured Manual Transaction. Your personal and payment data is handled with privacy.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
