import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { auth } from '../api/client.js';

// Simple Eye Icons
const EyeIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
);
const EyeOffIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" y1="2" x2="22" y2="22"/></svg>
);
const WarningIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
);

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname ?? '/';
  const { t } = useTranslation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please fill in all fields.');
      return;
    }
    setError('');
    setLoading(true);

    try {
      const res = await auth.login(email, password);
      const data = res.data;

      const token = data.access_token;
      localStorage.setItem('solvai_token', token);

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
    <div 
      className="min-h-screen bg-[var(--bg-page)] dark:bg-[#0f0f0f] flex flex-col items-center justify-center p-6 transition-colors duration-200 relative py-12"
      data-force-light="true"
      style={{ background: '#ffffff', color: '#0a2540', minHeight: '100vh' }}
    >
      <div className="w-full max-w-[420px] flex flex-col items-center gap-6 relative z-10 animate-slideUp">
        {/* Header */}
        <div className="flex flex-col items-center text-center">
          <div className="flex items-center gap-3 justify-center mb-3">
            <div className="w-11 h-11 bg-white dark:bg-[#1a1a1a] rounded-xl flex items-center justify-center text-[22px] font-extrabold text-gray-900 dark:text-white shadow-sm shrink-0 border border-gray-200 dark:border-gray-800">
              S
            </div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight leading-tight">
              SolvAI<span className="text-[var(--brand-blue)]">.</span>
            </div>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">
            AI-powered financial identity for freelancers
          </p>
        </div>

        {/* Card */}
        <div className="w-full bg-white dark:bg-[#1a1a1a] rounded-2xl p-8 shadow-sm border border-gray-200 dark:border-gray-800">
          <h1 className="text-[20px] font-semibold text-gray-900 dark:text-white mb-6">Welcome back</h1>
          
          <form className="flex flex-col gap-4" onSubmit={handleSubmit} noValidate>
            {error && (
              <div className="text-[#d92d20] text-sm flex gap-2 items-center">
                <span className="shrink-0"><WarningIcon /></span> 
                <span>{error}</span>
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300" htmlFor="login-email">Email</label>
              <input
                id="login-email"
                className="h-10 px-3 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#242424] text-gray-900 dark:text-white focus:outline-none focus:border-[var(--brand-blue)] focus:ring-1 focus:ring-[var(--brand-blue)] transition-colors placeholder:text-gray-400"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                autoFocus
                required
              />
            </div>

            <div className="flex flex-col gap-1.5 relative">
              <div className="flex justify-between items-center">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300" htmlFor="login-password">Password</label>
                <a href="#" className="text-sm text-[var(--brand-blue)] hover:underline font-medium">Forgot password?</a>
              </div>
              <div className="relative">
                <input
                  id="login-password"
                  className="w-full h-10 pl-3 pr-10 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#242424] text-gray-900 dark:text-white focus:outline-none focus:border-[var(--brand-blue)] focus:ring-1 focus:ring-[var(--brand-blue)] transition-colors placeholder:text-gray-400"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 focus:outline-none"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              </div>
            </div>

            <button
              id="login-submit"
              type="submit"
              className="mt-2 w-full bg-[var(--brand-blue)] hover:bg-[var(--brand-blue-hover)] text-white font-medium h-10 rounded-md flex items-center justify-center transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
              disabled={loading}
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Signing in...
                </div>
              ) : (
                "Sign in →"
              )}
            </button>
          </form>

          <div className="my-6 flex items-center gap-3">
            <div className="flex-1 h-px bg-gray-200 dark:bg-gray-800"></div>
            <span className="text-sm text-gray-400 dark:text-gray-500 font-medium">or</span>
            <div className="flex-1 h-px bg-gray-200 dark:bg-gray-800"></div>
          </div>

          <div className="text-center text-[14px]">
            <span className="text-gray-600 dark:text-gray-400">Don&apos;t have an account? </span>
            <Link to="/register" className="font-medium text-[var(--brand-blue)] hover:underline">Create account</Link>
          </div>
        </div>

        <p className="text-center text-xs text-gray-500 dark:text-gray-500 leading-relaxed px-4">
          By signing in you agree to our{' '}
          <a href="#" className="underline hover:text-gray-700 dark:hover:text-gray-300">Terms of Service</a>
          {' '}and{' '}
          <a href="#" className="underline hover:text-gray-700 dark:hover:text-gray-300">Privacy Policy</a>.
        </p>
      </div>
    </div>
  );
}
