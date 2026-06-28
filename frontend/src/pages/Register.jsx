import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { auth } from '../api/client.js';
import { IconWarning } from '../components/Icons.jsx';

export default function Register() {
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [orgName, setOrgName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

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
      const res = await auth.register(email, password, orgName);
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
    if (password.length >= 8) s++;
    if (/[A-Z]/.test(password)) s++;
    if (/[0-9]/.test(password)) s++;
    if (/[^A-Za-z0-9]/.test(password)) s++;
    return s;
  })();

  const strengthLabel = ['', 'Weak', 'Fair', 'Good', 'Strong'][strengthScore];
  const strengthColor = ['', '#ef4444', '#f59e0b', '#3b82f6', '#22c55e'][strengthScore];

  return (
    <div className="min-h-screen bg-[#f6f8fa] flex items-center justify-center p-6 relative">
      <div className="w-full max-w-[420px] flex flex-col gap-6 relative z-10 animate-slideUp">
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
            <h1 className="text-2xl font-bold text-[#0a2540] mb-1">Create an Account</h1>
            <p className="text-[#425466]">Get the same explainable credit analysis used by large banks</p>
          </div>

          <form className="flex flex-col gap-4" onSubmit={handleSubmit} noValidate>
            {error && (
              <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm flex gap-2 items-center border border-red-100">
                <span className="shrink-0"><IconWarning size={16} /></span> 
                <span>{error}</span>
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-[#425466]" htmlFor="reg-org">Organisation name</label>
              <input
                id="reg-org"
                className="h-10 px-3 rounded-md border border-[#e3e8ef] bg-white text-[#0a2540] focus:outline-none focus:border-[#0570de] focus:ring-1 focus:ring-[#0570de] transition-shadow placeholder:text-gray-400"
                type="text"
                placeholder="Acme Consulting Ltd."
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                autoFocus
                required
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-[#425466]" htmlFor="reg-email">Email address</label>
              <input
                id="reg-email"
                className="h-10 px-3 rounded-md border border-[#e3e8ef] bg-white text-[#0a2540] focus:outline-none focus:border-[#0570de] focus:ring-1 focus:ring-[#0570de] transition-shadow placeholder:text-gray-400"
                type="email"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-[#425466]" htmlFor="reg-password">Password</label>
              <input
                id="reg-password"
                className="h-10 px-3 rounded-md border border-[#e3e8ef] bg-white text-[#0a2540] focus:outline-none focus:border-[#0570de] focus:ring-1 focus:ring-[#0570de] transition-shadow placeholder:text-gray-400"
                type="password"
                placeholder="Min. 8 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                required
              />
              {password.length > 0 && (
                <div className="flex items-center gap-1 mt-1">
                  {[1, 2, 3, 4].map((i) => (
                    <div
                      key={i}
                      className="flex-1 h-1 rounded-sm"
                      style={{
                        background: i <= strengthScore ? strengthColor : '#e3e8ef',
                        transition: 'background 0.3s ease',
                      }}
                    />
                  ))}
                  <span className="text-xs font-semibold tracking-wide ml-1 min-w-[40px] text-right" style={{ color: strengthColor }}>
                    {strengthLabel}
                  </span>
                </div>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-[#425466]" htmlFor="reg-confirm">Confirm password</label>
              <input
                id="reg-confirm"
                className="h-10 px-3 rounded-md border border-[#e3e8ef] bg-white text-[#0a2540] focus:outline-none focus:border-[#0570de] focus:ring-1 focus:ring-[#0570de] transition-shadow placeholder:text-gray-400"
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
              className="mt-2 w-full bg-[#0570de] hover:bg-[#0462c7] text-white font-medium h-11 rounded-lg flex items-center justify-center transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
              disabled={loading}
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                  Creating account…
                </>
              ) : (
                'Create account →'
              )}
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-[#e3e8ef] flex items-center justify-center gap-2 text-[14px]">
            <span className="text-[#425466]">Already have an account?</span>
            <Link to="/login" className="font-medium text-[#0570de] hover:text-[#0462c7]">Sign in</Link>
          </div>
        </div>

        <p className="text-center text-xs text-[#697386] leading-relaxed px-4">
          By creating an account you agree to our{' '}
          <a href="#" className="underline text-[#425466] hover:text-[#0a2540]">Terms of Service</a>
          {' '}and{' '}
          <a href="#" className="underline text-[#425466] hover:text-[#0a2540]">Privacy Policy</a>.
        </p>
      </div>
    </div>
  );
}
