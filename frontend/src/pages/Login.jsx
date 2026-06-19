import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { auth } from '../api/client.js';
import { IconWarning } from '../components/Icons.jsx';

export default function Login() {
  const navigate  = useNavigate();
  const location  = useLocation();
  const from      = location.state?.from?.pathname ?? '/';

  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [error,    setError]    = useState('');
  const [loading,  setLoading]  = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please fill in all fields.');
      return;
    }
    setError('');
    setLoading(true);

    try {
      const res  = await auth.login(email, password);
      const data = res.data;

      const token = data.access_token;
      localStorage.setItem('solvai_token', token);

      // Decode JWT payload for user info
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        localStorage.setItem('solvai_user', JSON.stringify(payload));
      } catch {
        // ignore decode errors
      }

      navigate(from, { replace: true });
    } catch (err) {
      const msg = err?.response?.data?.detail ?? err?.message ?? 'Login failed. Please try again.';
      setError(typeof msg === 'string' ? msg : JSON.stringify(msg));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      {/* Decorative background */}
      <div className="auth-bg">
        <div className="auth-bg__grid" />
      </div>

      <div className="auth-container animate-slideUp">
        {/* Logo */}
        <div className="auth-logo">
          <div className="auth-logo__mark">S</div>
          <div>
            <div className="auth-logo__name">SolvAI<span className="auth-logo__dot">.</span></div>
            <div className="auth-logo__tagline">Self-serve credit AI for freelancers</div>
          </div>
        </div>

        {/* Card */}
        <div className="auth-card card-glass">
          <div className="auth-card__header">
            <h1 className="auth-card__title">Welcome back</h1>
            <p className="auth-card__subtitle">Enter your details to access your account</p>
          </div>

          <form className="auth-form" onSubmit={handleSubmit} noValidate>
            {error && (
              <div className="error-message" role="alert" style={{ marginBottom: 'var(--space-4)' }}>
                <span><IconWarning size={16} /></span> {error}
              </div>
            )}

            <div className="form-group">
              <label className="label" htmlFor="login-email">Email address</label>
              <input
                id="login-email"
                className="input"
                type="email"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                autoFocus
                required
              />
            </div>

            <div className="form-group">
              <label className="label" htmlFor="login-password">Password</label>
              <input
                id="login-password"
                className="input"
                type="password"
                placeholder="••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
            </div>

            <button
              id="login-submit"
              type="submit"
              className="btn-primary auth-submit"
              disabled={loading}
            >
              {loading ? (
                <>
                  <div className="auth-spinner" />
                  Signing in…
                </>
              ) : (
                'Sign in →'
              )}
            </button>
          </form>

          <div className="auth-footer">
            <span className="auth-footer__text">Don't have an account?</span>
            <Link to="/register" className="auth-footer__link">Create account</Link>
          </div>
        </div>

        <p className="auth-legal">
          By signing in you agree to our{' '}
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

        /* ── Background decoration ── */
        .auth-bg {
          position: absolute;
          inset: 0;
          pointer-events: none;
        }
        .auth-bg__grid {
          position: absolute;
          inset: 0;
          background-image:
            linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px);
          background-size: 48px 48px;
        }
          position: absolute;
          inset: 0;
          background-image:
            linear-gradient(rgba(255,255,255,0.015) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.015) 1px, transparent 1px);
          background-size: 48px 48px;
        }

        /* ── Container ── */
        .auth-container {
          position: relative;
          z-index: 1;
          width: 100%;
          max-width: 400px;
          display: flex;
          flex-direction: column;
          gap: var(--space-6);
        }

        /* ── Logo ── */
        .auth-logo {
          display: flex;
          align-items: center;
          gap: 12px;
          justify-content: center;
        }
        .auth-logo__mark {
          width: 44px; height: 44px;
          background: #ffffff;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 22px;
          font-weight: 800;
          color: #000000;
          box-shadow: 0 4px 12px rgba(0,0,0,0.5);
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

        /* ── Card ── */
        .auth-card {
          padding: var(--space-8);
        }
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

        /* ── Form ── */
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
          border: 2px solid rgba(0,0,0,0.1);
          border-top-color: #000000;
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
        }

        /* ── Footer ── */
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

        /* ── Legal ── */
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
      `}</style>
    </div>
  );
}
