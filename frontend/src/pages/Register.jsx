import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import { auth } from '../api/client.js';

// Simple Icons
const EyeIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
);
const EyeOffIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" y1="2" x2="22" y2="22"/></svg>
);
const WarningIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
);
const CheckIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
);

export default function Register() {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  
  const [showPromo, setShowPromo] = useState(false);
  const [promoCode, setPromoCode] = useState('');
  const [promoStatus, setPromoStatus] = useState(null); // 'valid', 'invalid', 'loading', null
  const [promoMessage, setPromoMessage] = useState('');

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleValidatePromo = async () => {
    if (!promoCode.trim()) return;
    setPromoStatus('loading');
    setPromoMessage('');
    try {
      const res = await auth.validatePromo(promoCode.trim());
      if (res.data.valid) {
        setPromoStatus('valid');
        setPromoMessage('Pro plan activated!');
      } else {
        setPromoStatus('invalid');
        setPromoMessage(res.data.message || 'Invalid code');
      }
    } catch (err) {
      setPromoStatus('invalid');
      setPromoMessage('Error validating code');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!fullName || !email || !password || !confirm) {
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
    if (!termsAccepted) {
      setError('You must accept the terms and conditions.');
      return;
    }
    if (showPromo && promoCode && promoStatus !== 'valid') {
      setError('Please apply a valid promo code or clear it.');
      return;
    }

    setError('');
    setLoading(true);

    try {
      // empty string for orgName so backend derives it from fullName
      const res = await auth.register(email, password, '', fullName, promoStatus === 'valid' ? promoCode : null);
      const data = res.data;

      const token = data.access_token;
      if (token) {
        localStorage.setItem('solvai_token', token);
        try {
          const payload = JSON.parse(atob(token.split('.')[1]));
          localStorage.setItem('solvai_user', JSON.stringify(payload));
        } catch { /* ignore */ }
        navigate('/', { replace: true });
      } else {
        navigate('/login', { replace: true });
      }
    } catch (err) {
      const msg = err?.response?.data?.detail ?? err?.message ?? 'Registration failed. Please try again.';
      setError(typeof msg === 'string' ? msg : JSON.stringify(msg));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f6f8fa] dark:bg-[#0f0f0f] flex flex-col items-center justify-center p-6 transition-colors duration-200 relative py-12">
      <div className="w-full max-w-[420px] flex flex-col items-center gap-6 relative z-10 animate-slideUp">
        
        {/* Header */}
        <div className="flex flex-col items-center text-center">
          <div className="flex items-center gap-3 justify-center mb-3">
            <div className="w-11 h-11 bg-white dark:bg-[#1a1a1a] rounded-xl flex items-center justify-center text-[22px] font-extrabold text-gray-900 dark:text-white shadow-sm shrink-0 border border-gray-200 dark:border-gray-800">
              S
            </div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight leading-tight">
              SolvAI<span className="text-[#0570de]">.</span>
            </div>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">
            AI-powered financial identity for freelancers
          </p>
        </div>

        {/* Card */}
        <div className="w-full bg-white dark:bg-[#1a1a1a] rounded-2xl p-8 shadow-sm border border-gray-200 dark:border-gray-800">
          <h1 className="text-[20px] font-semibold text-gray-900 dark:text-white mb-6">Create your account</h1>
          
          <form className="flex flex-col gap-4" onSubmit={handleSubmit} noValidate>
            {error && (
              <div className="text-[#d92d20] text-sm flex gap-2 items-center">
                <span className="shrink-0"><WarningIcon /></span> 
                <span>{error}</span>
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300" htmlFor="reg-name">Full name</label>
              <input
                id="reg-name"
                className="h-10 px-3 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#242424] text-gray-900 dark:text-white focus:outline-none focus:border-[#0570de] focus:ring-1 focus:ring-[#0570de] transition-colors placeholder:text-gray-400"
                type="text"
                placeholder="Jane Doe"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                autoFocus
                required
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300" htmlFor="reg-email">Email</label>
              <input
                id="reg-email"
                className="h-10 px-3 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#242424] text-gray-900 dark:text-white focus:outline-none focus:border-[#0570de] focus:ring-1 focus:ring-[#0570de] transition-colors placeholder:text-gray-400"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
              />
            </div>

            <div className="flex flex-col gap-1.5 relative">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300" htmlFor="reg-password">Password</label>
              <div className="relative">
                <input
                  id="reg-password"
                  className="w-full h-10 pl-3 pr-10 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#242424] text-gray-900 dark:text-white focus:outline-none focus:border-[#0570de] focus:ring-1 focus:ring-[#0570de] transition-colors placeholder:text-gray-400"
                  type={showPassword ? "text" : "password"}
                  placeholder="Min. 8 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
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

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300" htmlFor="reg-confirm">Confirm password</label>
              <input
                id="reg-confirm"
                className="h-10 px-3 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#242424] text-gray-900 dark:text-white focus:outline-none focus:border-[#0570de] focus:ring-1 focus:ring-[#0570de] transition-colors placeholder:text-gray-400"
                type="password"
                placeholder="Repeat password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                autoComplete="new-password"
                required
              />
            </div>

            {/* Promo code section */}
            <div className="pt-2">
              {!showPromo ? (
                <button
                  type="button"
                  className="text-sm text-[#0570de] hover:underline font-medium"
                  onClick={() => setShowPromo(true)}
                >
                  Have a promo code?
                </button>
              ) : (
                <div className="flex flex-col gap-1.5 animate-fadeIn">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300" htmlFor="reg-promo">Promo code <span className="text-gray-400 font-normal">(optional)</span></label>
                  <div className="flex gap-2">
                    <input
                      id="reg-promo"
                      className="flex-1 h-10 px-3 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#242424] text-gray-900 dark:text-white focus:outline-none focus:border-[#0570de] focus:ring-1 focus:ring-[#0570de] transition-colors uppercase"
                      type="text"
                      placeholder="e.g. EARLYBIRD"
                      value={promoCode}
                      onChange={(e) => {
                        setPromoCode(e.target.value);
                        setPromoStatus(null);
                        setPromoMessage('');
                      }}
                    />
                    <button
                      type="button"
                      className="px-4 h-10 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 font-medium rounded-md transition-colors whitespace-nowrap disabled:opacity-50"
                      onClick={handleValidatePromo}
                      disabled={!promoCode.trim() || promoStatus === 'loading'}
                    >
                      {promoStatus === 'loading' ? 'Checking...' : 'Apply'}
                    </button>
                  </div>
                  {promoStatus === 'valid' && (
                    <div className="text-sm text-green-600 dark:text-green-500 font-medium flex items-center gap-1.5 mt-1">
                      <CheckIcon /> {promoMessage}
                    </div>
                  )}
                  {promoStatus === 'invalid' && (
                    <div className="text-sm text-[#d92d20] flex items-center gap-1.5 mt-1">
                      <WarningIcon /> {promoMessage}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex items-start gap-2 mt-2">
              <input
                id="terms"
                type="checkbox"
                className="mt-1 w-4 h-4 rounded border-gray-300 text-[#0570de] focus:ring-[#0570de]"
                checked={termsAccepted}
                onChange={(e) => setTermsAccepted(e.target.checked)}
                required
              />
              <label htmlFor="terms" className="text-sm text-gray-600 dark:text-gray-400">
                I agree to the <a href="#" className="text-[#0570de] hover:underline">Terms of Service</a> and <a href="#" className="text-[#0570de] hover:underline">Privacy Policy</a>
              </label>
            </div>

            <button
              id="register-submit"
              type="submit"
              className="mt-4 w-full bg-[#0570de] hover:bg-[#0462c7] text-white font-medium h-10 rounded-md flex items-center justify-center transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
              disabled={loading}
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Creating account...
                </div>
              ) : (
                "Create account →"
              )}
            </button>
          </form>

          <div className="my-6 flex items-center gap-3">
            <div className="flex-1 h-px bg-gray-200 dark:bg-gray-800"></div>
          </div>

          <div className="text-center text-[14px]">
            <span className="text-gray-600 dark:text-gray-400">Already have an account? </span>
            <Link to="/login" className="font-medium text-[#0570de] hover:underline">Sign in</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
