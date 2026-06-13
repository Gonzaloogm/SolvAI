import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { auth } from '../api/client.js';

export default function Register() {
  const navigate = useNavigate();

  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [confirm,  setConfirm]  = useState('');
  const [orgName,  setOrgName]  = useState('');
  const [error,    setError]    = useState('');
  const [loading,  setLoading]  = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!email || !password || !confirm || !orgName) {
      setError('Please fill in all fields.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const res  = await auth.register(email, password, orgName);
      const data = res.data;

      // Backend may return token directly on register
      const token = data.access_token;
      if (token) {
        localStorage.setItem('solvai_token', token);
        try {
          const payload = JSON.parse(atob(token.split('.')[1]));
          localStorage.setItem('solvai_user', JSON.stringify(payload));
        } catch { /* ignore */ }
        navigate('/', { replace: true });
      } else {
        // Registration without auto-login — redirect to login
        navigate('/login', { replace: true });
      }
    } catch (err) {
      const msg = err?.response?.data?.detail ?? err?.message ?? 'Registration failed. Please try again.';
      setError(typeof msg === 'string' ? msg : JSON.stringify(msg));
    } finally {
      setLoading(false);
    }
  };

  // Password strength indicator
  const strengthScore = (() => {
    let s = 0;
    if (password.length >= 8)  s++;
    if (/[A-Z]/.test(password)) s++;
    if (/[0-9]/.test(password)) s++;
    if (/[^A-Za-z0-9]/.test(password)) s++;
    return s;
  })();

  const strengthLabel = ['', 'Weak', 'Fair', 'Good', 'Strong'][strengthScore];
  const strengthColor = ['', '#ef4444', '#f59e0b', '#3b82f6', '#22c55e'][strengthScore];

  return (
    <div className="auth-page">
      {/* Background decoration */}
      <div className="auth-bg">
        <div className="auth-bg__glow auth-bg__glow--1" />
        <div className="auth-bg__glow auth-bg__glow--2" />
        <div className="auth-bg__grid" />
      </div>

      <div className="auth-container animate-slideUp">
        {/* Logo */}
        <div className="auth-logo">
          <div className="auth-logo__mark">S</div>
          <div>
            <div className="auth-logo__name">SolvAI<span className="auth-logo__dot">.</span></div>
            <div className="auth-logo__tagline">Bank-grade credit AI, directly in your hands</div>
          </div>
        </div>

        {/* Card */}
        <div className="auth-card card-glass">
          <div className="auth-card__header">
            <h1 className="auth-card__title">Create account</h1>
            <p className="auth-card__subtitle">Get the same transparent credit analysis used by large banks, built for the Stripe ecosystem</p>
          </div>

          <form className="auth-form" onSubmit={handleSubmit} noValidate>
            {error && (
              <div className="error-message" role="alert">
                <span>⚠</span> {error}
              </div>
            )}

            <div className="form-group">
              <label className="label" htmlFor="reg-org">Organisation name</label>
              <input
                id="reg-org"
                className="input"
                type="text"
                placeholder="Acme Consulting Ltd."
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                autoFocus
                required
              />
            </div>

            <div className="form-group">
              <label className="label" htmlFor="reg-email">Email address</label>
              <input
                id="reg-email"
                className="input"
                type="email"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
              />
            </div>

            <div className="form-group">
              <label className="label" htmlFor="reg-password">Password</label>
              <input
                id="reg-password"
                className="input"
                type="password"
                placeholder="Min. 8 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                required
              />
              {password.length > 0 && (
                <div className="strength-bar">
                  {[1, 2, 3, 4].map((i) => (
                    <div
                      key={i}
                      className="strength-bar__segment"
                      style={{
                        background: i <= strengthScore ? strengthColor : 'rgba(255,255,255,0.06)',
                        transition: 'background 0.3s ease',
                      }}
                    />
                  ))}
                  <span className="strength-bar__label" style={{ color: strengthColor }}>
                    {strengthLabel}
                  </span>
                </div>
              )}
            </div>

            <div className="form-group">
              <label className="label" htmlFor="reg-confirm">Confirm password</label>
              <input
                id="reg-confirm"
                className="input"
                type="password"
                placeholder="Repeat password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                autoComplete="new-password"
                required
                style={{
                  borderColor: confirm && confirm !== password
                    ? 'rgba(239,68,68,0.4)'
                    : confirm && confirm === password
                    ? 'rgba(34,197,94,0.4)'
                    : undefined,
                }}
              />
            </div>

            <button
              id="register-submit"
              type="submit"
              className="btn-primary auth-submit"
              disabled={loading}
            >
              {loading ? (
                <>
                  <div className="auth-spinner" />
                  Creating account…
                </>
              ) : (
                'Create account →'
              )}
            </button>
          </form>

          <div className="auth-footer">
            <span className="auth-footer__text">Already have an account?</span>
            <Link to="/login" className="auth-footer__link">Sign in</Link>
          </div>
        </div>

        <p className="auth-legal">
          By creating an account you agree to our{' '}
          <a href="#" className="auth-legal__link">Terms of Service</a>
          {' '}and{' '}
          <a href="#" className="auth-legal__link">Privacy Policy</a>.
        </p>
      </div>

      <style>{`
        .auth-page {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--color-background);
          position: relative;
          overflow: hidden;
          padding: var(--space-6);
        }
        .auth-bg {
          position: absolute;
          inset: 0;
          pointer-events: none;
        }
        .auth-bg__glow {
          position: absolute;
          border-radius: 50%;
          filter: blur(80px);
          opacity: 0.08;
        }
        .auth-bg__glow--1 {
          width: 600px; height: 600px;
          background: var(--color-accent-primary);
          top: -200px; left: -200px;
        }
        .auth-bg__glow--2 {
          width: 400px; height: 400px;
          background: #7c3aed;
          bottom: -100px; right: -100px;
        }
        .auth-bg__grid {
          position: absolute;
          inset: 0;
          background-image:
            linear-gradient(rgba(255,255,255,0.015) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.015) 1px, transparent 1px);
          background-size: 48px 48px;
        }
        .auth-container {
          position: relative;
          z-index: 1;
          width: 100%;
          max-width: 420px;
          display: flex;
          flex-direction: column;
          gap: var(--space-6);
        }
        .auth-logo {
          display: flex;
          align-items: center;
          gap: 12px;
          justify-content: center;
        }
        .auth-logo__mark {
          width: 44px; height: 44px;
          background: linear-gradient(135deg, var(--color-accent-primary), #00b8cc);
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 22px;
          font-weight: 800;
          color: #030303;
          box-shadow: var(--glow-cyan);
          flex-shrink: 0;
        }
        .auth-logo__name {
          font-size: var(--text-2xl);
          font-weight: 700;
          color: var(--color-text-primary);
          letter-spacing: -0.04em;
          line-height: 1.1;
        }
        .auth-logo__dot { color: var(--color-accent-primary); }
        .auth-logo__tagline {
          font-size: var(--text-xs);
          color: var(--color-text-secondary);
          letter-spacing: 0.06em;
          text-transform: uppercase;
        }
        .auth-card { padding: var(--space-8); }
        .auth-card__header {
          margin-bottom: var(--space-6);
          text-align: center;
        }
        .auth-card__title {
          font-size: var(--text-2xl);
          font-weight: 700;
          letter-spacing: -0.03em;
          margin-bottom: var(--space-1);
        }
        .auth-card__subtitle {
          font-size: var(--text-md);
          color: var(--color-text-secondary);
        }
        .auth-form {
          display: flex;
          flex-direction: column;
          gap: var(--space-4);
        }
        .auth-submit {
          width: 100%;
          justify-content: center;
          padding: 12px var(--space-5);
          font-size: var(--text-md);
          margin-top: var(--space-2);
        }
        .auth-spinner {
          width: 16px; height: 16px;
          border: 2px solid rgba(3,3,3,0.3);
          border-top-color: #030303;
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
        }
        .auth-footer {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: var(--space-2);
          margin-top: var(--space-5);
          padding-top: var(--space-5);
          border-top: 1px solid var(--color-border-subtle);
        }
        .auth-footer__text {
          font-size: var(--text-md);
          color: var(--color-text-secondary);
        }
        .auth-footer__link {
          font-size: var(--text-md);
          font-weight: 500;
          color: var(--color-accent-primary);
        }
        .auth-legal {
          text-align: center;
          font-size: var(--text-xs);
          color: var(--color-text-disabled);
          line-height: 1.6;
        }
        .auth-legal__link {
          color: var(--color-text-tertiary);
          text-decoration: underline;
          text-underline-offset: 2px;
        }

        /* Strength bar */
        .strength-bar {
          display: flex;
          align-items: center;
          gap: 4px;
          margin-top: 4px;
        }
        .strength-bar__segment {
          flex: 1;
          height: 3px;
          border-radius: 2px;
        }
        .strength-bar__label {
          font-size: var(--text-xs);
          font-weight: 600;
          letter-spacing: 0.04em;
          margin-left: 4px;
          min-width: 40px;
          text-align: right;
        }
      `}</style>
    </div>
  );
}
