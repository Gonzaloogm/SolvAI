import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import Sidebar from '../components/Sidebar.jsx';
import LoadingSpinner from '../components/LoadingSpinner.jsx';
import { IconCreditCard, IconLock, IconActivity, IconFolder, IconClock } from '../components/Icons.jsx';

export default function Account() {
 const navigate = useNavigate();
 const token = localStorage.getItem('solvai_token');
 
 // Subscription State
 const [subscription, setSubscription] = useState(null);
 const [loading, setLoading] = useState(true);
 const [portalLoading, setPortalLoading] = useState(false);

 // Password State
 const [currentPassword, setCurrentPassword] = useState('');
 const [newPassword, setNewPassword] = useState('');
 const [passwordLoading, setPasswordLoading] = useState(false);
 const [passwordError, setPasswordError] = useState('');
 const [passwordSuccess, setPasswordSuccess] = useState('');

 // Usage History State
 const [reports, setReports] = useState([]);
 const [reportsLoading, setReportsLoading] = useState(true);

 useEffect(() => {
 if (!token) {
 navigate('/login');
 return;
 }
 
 const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
 
 // Fetch Subscription
 fetch(`${baseUrl}/billing/subscription`, {
 headers: { Authorization: `Bearer ${token}` }
 })
 .then(res => {
 if (!res.ok) throw new Error('Failed to fetch subscription');
 return res.json();
 })
 .then(data => {
 setSubscription(data);
 setLoading(false);
 })
 .catch(err => {
 console.error(err);
 setLoading(false);
 });
 
 // Fetch Reports
 fetch(`${baseUrl}/solvency-reports/`, {
 headers: { Authorization: `Bearer ${token}` }
 })
 .then(res => {
 if (!res.ok) throw new Error('Failed to fetch reports');
 return res.json();
 })
 .then(data => {
 setReports(data.slice(0, 5)); // Last 5 reports
 setReportsLoading(false);
 })
 .catch(err => {
 console.error(err);
 setReportsLoading(false);
 });
 }, [token, navigate]);

 const handleManageBilling = async () => {
 setPortalLoading(true);
 try {
 const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
 const res = await fetch(`${baseUrl}/billing/create-portal-session`, {
 method: 'POST',
 headers: { Authorization: `Bearer ${token}` }
 });
 if (!res.ok) throw new Error('Failed to create portal session');
 const data = await res.json();
 window.location.href = data.url;
 } catch (err) {
 console.error(err);
 console.error('Error redirecting to billing portal.');
 setPortalLoading(false);
 }
 };
 
 const handleChangePassword = async (e) => {
 e.preventDefault();
 setPasswordError('');
 setPasswordSuccess('');
 
 if (newPassword.length < 8) {
 setPasswordError('New password must be at least 8 characters long.');
 return;
 }
 
 setPasswordLoading(true);
 try {
 const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
 const res = await fetch(`${baseUrl}/auth/change-password`, {
 method: 'POST',
 headers: { 
 Authorization: `Bearer ${token}`,
 'Content-Type': 'application/json'
 },
 body: JSON.stringify({ current_password: currentPassword, new_password: newPassword })
 });
 
 const data = await res.json();
 if (!res.ok) {
 throw new Error(data.detail || 'Failed to change password');
 }
 
 setPasswordSuccess('Password changed successfully.');
 setCurrentPassword('');
 setNewPassword('');
 } catch (err) {
 setPasswordError(err.message);
 } finally {
 setPasswordLoading(false);
 }
 };

 const isFree = !subscription || subscription.plan === 'free';
 const planName = isFree ? 'Free' : subscription.plan;
 const planColor = isFree ? 'var(--color-text-secondary)' : 'var(--color-accent-primary)';

 if (loading) {
 return (
 <div className="page-layout">
 <Sidebar />
 <main className="page-content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
 <LoadingSpinner size={32} />
 </main>
 </div>
 );
 }

 return (
 <div className="page-layout">
 <Sidebar />
 <main className="page-content" style={{ padding: 'var(--space-12) var(--space-8)' }}>
 <div className="account-container">
 <header className="account-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
 <div>
 <h1 className="account-title">Account Settings</h1>
 <p className="account-subtitle">Manage your subscription, security, and preferences.</p>
 </div>
 </header>

 <div className="account-section">
 {/* Subscription Card */}
 <div className="account-card">
 <div className="account-card__header">
 <div className="account-card__icon">
 <IconCreditCard size={24} />
 </div>
 <div>
 <h2 className="account-card__title">Subscription Plan</h2>
 <p className="account-card__desc">Your current SolvAI access level.</p>
 </div>
 </div>
 
 <div className="account-card__body">
 <div className="plan-details">
 <div className="plan-name" style={{ color: planColor }}>
 {planName.toUpperCase()}
 </div>
 
 {!isFree && subscription?.status && (
 <div className="plan-status">
 <span className="status-dot" style={{ 
 backgroundColor: subscription.status === 'active' ? 'var(--color-status-success)' : 'var(--color-status-warning)'
 }}></span>
 {subscription.status}
 </div>
 )}

 {!isFree && subscription?.current_period_end && (
 <div className="plan-date">
 Renews on {new Date(subscription.current_period_end).toLocaleDateString()}
 </div>
 )}
 
 {isFree && (
 <div className="plan-date">
 1 free report included
 </div>
 )}
 </div>

 <div className="plan-actions">
 {isFree ? (
 <button 
 className="btn-primary" 
 onClick={() => navigate('/pricing')}
 style={{ padding: '10px 24px', fontSize: 'var(--text-sm)' }}
 >
 Upgrade Plan
 </button>
 ) : (
 <button 
 className="btn-secondary" 
 onClick={handleManageBilling}
 disabled={portalLoading}
 style={{ padding: '10px 24px', fontSize: 'var(--text-sm)', display: 'flex', alignItems: 'center', gap: '8px' }}
 >
 {portalLoading && <LoadingSpinner size={14} inline />}
 {portalLoading ? 'Redirecting...' : 'Manage Billing'}
 </button>
 )}
 </div>
 </div>
 </div>

 {/* Security Card */}
 <div className="account-card">
 <div className="account-card__header">
 <div className="account-card__icon">
 <IconLock size={24} />
 </div>
 <div>
 <h2 className="account-card__title">Security & Login</h2>
 <p className="account-card__desc">Change your password and secure your account.</p>
 </div>
 </div>
 <div className="account-card__body" style={{ flexDirection: 'column', alignItems: 'flex-start' }}>
 <form onSubmit={handleChangePassword} style={{ width: '100%', maxWidth: '400px', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
 {passwordError && (
 <div style={{ padding: '12px', background: 'var(--color-status-error-bg)', color: 'var(--color-status-error)', borderRadius: 'var(--radius-sm)', fontSize: 'var(--text-sm)' }}>
 {passwordError}
 </div>
 )}
 {passwordSuccess && (
 <div style={{ padding: '12px', background: 'var(--color-status-success-bg)', color: 'var(--color-status-success)', borderRadius: 'var(--radius-sm)', fontSize: 'var(--text-sm)' }}>
 {passwordSuccess}
 </div>
 )}
 <div className="input-group">
 <label className="input-label" htmlFor="currentPassword">Current Password</label>
 <input 
 type="password" 
 id="currentPassword"
 className="input-field" 
 value={currentPassword}
 onChange={e => setCurrentPassword(e.target.value)}
 required
 />
 </div>
 <div className="input-group">
 <label className="input-label" htmlFor="newPassword">New Password</label>
 <input 
 type="password" 
 id="newPassword"
 className="input-field" 
 value={newPassword}
 onChange={e => setNewPassword(e.target.value)}
 required
 />
 </div>
 <button type="submit" className="btn-secondary" disabled={passwordLoading} style={{ padding: '10px', marginTop: 'var(--space-2)' }}>
 {passwordLoading ? <LoadingSpinner size={16} inline /> : 'Update Password'}
 </button>
 </form>
 </div>
 </div>

 {/* Usage History Card */}
 <div className="account-card">
 <div className="account-card__header">
 <div className="account-card__icon">
 <IconActivity size={24} />
 </div>
 <div>
 <h2 className="account-card__title">Usage History</h2>
 <p className="account-card__desc">Your recently generated solvency reports.</p>
 </div>
 </div>
 <div className="account-card__body" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
 {reportsLoading ? (
 <div style={{ display: 'flex', justifyContent: 'center', padding: 'var(--space-4)' }}><LoadingSpinner size={24} /></div>
 ) : reports.length === 0 ? (
 <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--text-sm)' }}>No reports generated yet.</p>
 ) : (
 <div className="report-history-list">
 {reports.map(report => (
 <div key={report.id} className="report-history-item">
 <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
 <div className="report-history-icon"><IconFolder size={16} /></div>
 <div>
 <Link to={`/reports/${report.id}`} className="report-history-link">Report {report.id.split('-')[0]}</Link>
 <div className="report-history-meta">
 <IconClock size={12} /> {new Date(report.created_at).toLocaleDateString()}
 </div>
 </div>
 </div>
 <div className="report-history-score" style={{ 
 color: report.final_score >= 70 ? 'var(--color-status-success)' : report.final_score >= 40 ? 'var(--color-status-warning)' : 'var(--color-status-error)'
 }}>
 {report.final_score}/100
 </div>
 </div>
 ))}
 </div>
 )}
 </div>
 </div>

 </div>
 </div>
 </main>

 <style>{`
 /* Previous CSS variables omitted, reusing existing global CSS where possible */
 .account-container {
 max-width: 800px;
 margin: 0 auto;
 display: flex;
 flex-direction: column;
 gap: var(--space-8);
 }

 .account-header {
 margin-bottom: var(--space-4);
 }
 .account-title {
 font-size: 32px;
 font-weight: 700;
 letter-spacing: -0.02em;
 margin-bottom: var(--space-2);
 color: var(--color-text-primary);
 }
 .account-subtitle {
 font-size: var(--text-md);
 color: var(--color-text-secondary);
 }

 .account-section {
 display: flex;
 flex-direction: column;
 gap: var(--space-6);
 }

 .account-card {
 background: var(--color-surface);
 border: 1px solid var(--color-border);
 border-radius: var(--radius-lg);
 padding: var(--space-6);
 display: flex;
 flex-direction: column;
 gap: var(--space-6);
 transition: border-color 0.2s ease;
 }
 .account-card:hover {
 border-color: var(--color-border-subtle);
 }

 .account-card__header {
 display: flex;
 align-items: center;
 gap: var(--space-4);
 }

 .account-card__icon {
 display: flex;
 align-items: center;
 justify-content: center;
 width: 48px;
 height: 48px;
 background: var(--color-surface-elevated);
 border-radius: var(--radius-md);
 color: var(--color-text-primary);
 border: 1px solid var(--color-border);
 }

 .account-card__title {
 font-size: var(--text-lg);
 font-weight: 600;
 color: var(--color-text-primary);
 margin-bottom: 2px;
 }
 .account-card__desc {
 font-size: var(--text-sm);
 color: var(--color-text-secondary);
 }

 .account-card__body {
 display: flex;
 flex-direction: column;
 gap: var(--space-6);
 padding-top: var(--space-4);
 border-top: 1px solid var(--color-border);
 }

 @media (min-width: 600px) {
 .account-card__body {
 flex-direction: row;
 align-items: center;
 justify-content: space-between;
 }
 }

 .plan-details {
 display: flex;
 flex-direction: column;
 gap: var(--space-1);
 }
 .plan-name {
 font-size: 24px;
 font-weight: 700;
 letter-spacing: 0.02em;
 }
 .plan-status {
 display: flex;
 align-items: center;
 gap: 6px;
 font-size: var(--text-sm);
 color: var(--color-text-secondary);
 text-transform: capitalize;
 }
 .status-dot {
 width: 8px;
 height: 8px;
 border-radius: 50%;
 }
 .plan-date {
 font-size: var(--text-sm);
 color: var(--color-text-disabled);
 margin-top: 2px;
 }

 .plan-actions {
 display: flex;
 }

 .btn-primary {
 background: var(--color-accent-primary);
 color: var(--color-on-primary);
 border-radius: var(--radius-md);
 font-weight: 600;
 border: none;
 cursor: pointer;
 transition: filter 0.2s;
 }
 .btn-primary:hover {
 filter: brightness(1.1);
 }

 .btn-secondary {
 background: transparent;
 color: var(--color-text-primary);
 border: 1px solid var(--color-border);
 border-radius: var(--radius-md);
 font-weight: 600;
 cursor: pointer;
 transition: background 0.2s;
 }
 .btn-secondary:hover {
 background: rgba(128,128,128,0.1);
 }
 
 .input-group {
 display: flex;
 flex-direction: column;
 gap: 6px;
 }
 
 .input-label {
 font-size: var(--text-sm);
 color: var(--color-text-secondary);
 font-weight: 500;
 }
 
 .input-field {
 background: var(--color-surface-elevated);
 border: 1px solid var(--color-border);
 padding: 10px 12px;
 border-radius: var(--radius-sm);
 color: var(--color-text-primary);
 font-family: inherit;
 }
 
 .input-field:focus {
 outline: none;
 border-color: var(--color-accent-primary);
 }
 
 .report-history-list {
 display: flex;
 flex-direction: column;
 gap: 12px;
 width: 100%;
 }
 
 .report-history-item {
 display: flex;
 align-items: center;
 justify-content: space-between;
 padding: 12px;
 background: var(--color-surface-elevated);
 border: 1px solid var(--color-border-subtle);
 border-radius: var(--radius-sm);
 }
 
 .report-history-icon {
 color: var(--color-text-tertiary);
 }
 
 .report-history-link {
 color: var(--color-text-primary);
 font-weight: 600;
 text-decoration: none;
 font-size: var(--text-sm);
 }
 
 .report-history-link:hover {
 text-decoration: underline;
 }
 
 .report-history-meta {
 display: flex;
 align-items: center;
 gap: 4px;
 color: var(--color-text-tertiary);
 font-size: var(--text-xs);
 margin-top: 4px;
 }
 
 .report-history-score {
 font-weight: 700;
 font-size: var(--text-sm);
 }
 `}</style>
 </div>
 );
}
