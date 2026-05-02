import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Navigate, useNavigate } from 'react-router-dom';
import { Github, AlertCircle } from 'lucide-react';
import { FloatingElementsLayer } from '../components/FloatingElements';
import { Animated } from '../components/Animated';

const AuthPage: React.FC = () => {
  const { user, signInWithGithub } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  if (user) {
    return <Navigate to="/repos" replace />;
  }

  const handleGithubSignIn = async () => {
    try {
      setError(null);
      await signInWithGithub();
      navigate('/repos');
    } catch (err: any) {
      if (err.code === 'auth/invalid-api-key') {
        setError('Firebase config missing. Please check your .env file.');
      } else if (err.code === 'auth/account-exists-with-different-credential') {
        setError('An account already exists with the same email. Please enable "Link accounts with same email" in your Firebase Auth settings, or delete your existing account in Firebase Console.');
      } else {
        setError(err.message || 'Failed to sign in with GitHub');
      }
    }
  };

  return (
    <div style={{ position: 'relative', minHeight: '85vh', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <FloatingElementsLayer variant="landing" />

      {/* ── Background Glows ── */}
      <div style={{
        position: 'fixed', top: '-10%', left: '-10%', width: '40%', height: '40%',
        background: 'radial-gradient(circle, rgba(210, 193, 182, 0.08) 0%, transparent 70%)',
        zIndex: 0, pointerEvents: 'none'
      }}></div>
      <div style={{
        position: 'fixed', bottom: '-10%', right: '-10%', width: '50%', height: '50%',
        background: 'radial-gradient(circle, rgba(16, 185, 129, 0.05) 0%, transparent 70%)',
        zIndex: 0, pointerEvents: 'none'
      }}></div>

      <div style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: '400px', padding: '0 20px' }}>
        <Animated direction="up" delay={0.1}>
          
          <div style={{ textAlign: 'center', marginBottom: '40px' }}>
             <h1 style={{ fontSize: '2.5rem', fontWeight: 900, letterSpacing: '-0.04em', marginBottom: '8px' }}>Sign In.</h1>
             <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem' }}>Access your repositories.</p>
          </div>

          {error && (
            <div className="mb-6 p-4 rounded-xl" style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', color: '#fca5a5', display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
              <AlertCircle size={20} style={{ flexShrink: 0, marginTop: '2px' }} />
              <span style={{ fontSize: '0.9rem' }}>{error}</span>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <button
              onClick={handleGithubSignIn}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px',
                width: '100%', padding: '18px 24px', fontSize: '1.1rem', fontWeight: 600,
                background: 'rgba(255, 255, 255, 0.05)', color: '#ffffff',
                border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '16px',
                cursor: 'pointer', transition: 'all 0.2s ease', backdropFilter: 'var(--glass-blur)',
                boxShadow: '0 10px 30px rgba(0,0,0,0.2)'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'; e.currentTarget.style.transform = 'translateY(0)'; }}
            >
              <Github size={22} />
              Continue with GitHub
            </button>
          </div>

        </Animated>
      </div>
    </div>
  );
};

export default AuthPage;
