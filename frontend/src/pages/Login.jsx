import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { auth } from '../api/client.js';
import { IconWarning } from '../components/Icons.jsx';

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname ?? '/';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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
    <div className="min-h-screen bg-[#f6f8fa] flex items-center justify-center p-6 relative">
      <div className="w-full max-w-[400px] flex flex-col gap-6 relative z-10 animate-slideUp">
        {/* Logo */}
        <div className="flex items-center gap-3 justify-center">
          <div className="w-11 h-11 bg-white rounded-xl flex items-center justify-center text-[22px] font-extrabold text-black shadow-[0_4px_12px_rgba(0,0,0,0.1)] shrink-0">
            S
          </div>
          <div>
            <div className="text-2xl font-bold text-[#0a2540] tracking-tight leading-tight">
              SolvAI<span className="text-[#0570de]">.</span>
            </div>
            <div className="text-[10px] sm:text-xs text-[#697386] tracking-wider uppercase font-medium mt-0.5">
              Self-serve credit AI for freelancers
            </div>
          </div>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl p-8 shadow-sm border border-[#e3e8ef]">
          <div className="mb-6 text-center">
            <h1 className="text-2xl font-bold text-[#0a2540] mb-1">Welcome back</h1>
            <p className="text-[#425466]">Enter your details to access your account</p>
          </div>

          <form className="flex flex-col gap-4" onSubmit={handleSubmit} noValidate>
            {error && (
              <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm flex gap-2 items-center border border-red-100">
                <span className="shrink-0"><IconWarning size={16} /></span> 
                <span>{error}</span>
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-[#425466]" htmlFor="login-email">Email address</label>
              <input
                id="login-email"
                className="h-10 px-3 rounded-md border border-[#e3e8ef] bg-white text-[#0a2540] focus:outline-none focus:border-[#0570de] focus:ring-1 focus:ring-[#0570de] transition-shadow placeholder:text-gray-400"
                type="email"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                autoFocus
                required
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-[#425466]" htmlFor="login-password">Password</label>
              <input
                id="login-password"
                className="h-10 px-3 rounded-md border border-[#e3e8ef] bg-white text-[#0a2540] focus:outline-none focus:border-[#0570de] focus:ring-1 focus:ring-[#0570de] transition-shadow placeholder:text-gray-400"
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
              className="mt-2 w-full bg-[#0570de] hover:bg-[#0462c7] text-white font-medium h-11 rounded-lg flex items-center justify-center transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
              disabled={loading}
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                  Signing in…
                </>
              ) : (
                'Sign in →'
              )}
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-[#e3e8ef] flex items-center justify-center gap-2 text-[14px]">
            <span className="text-[#425466]">Don't have an account?</span>
            <Link to="/register" className="font-medium text-[#0570de] hover:text-[#0462c7]">Create account</Link>
          </div>
        </div>

        <p className="text-center text-xs text-[#697386] leading-relaxed px-4">
          By signing in you agree to our{' '}
          <a href="#" className="underline text-[#425466] hover:text-[#0a2540]">Terms of Service</a>
          {' '}and{' '}
          <a href="#" className="underline text-[#425466] hover:text-[#0a2540]">Privacy Policy</a>.
        </p>
      </div>
    </div>
  );
}
