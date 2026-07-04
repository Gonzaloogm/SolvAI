import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, CreditCard, AlertTriangle, Zap, ArrowUpRight, X, Loader2 } from 'lucide-react';
import { users, billing, auth } from '../api/client.js';
import { useTheme } from '../context/ThemeContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import ConfirmModal from '../components/ConfirmModal.jsx';

const cn = (...classes) => classes.filter(Boolean).join(' ');

export default function AccountPage() {
 const { theme, setTheme } = useTheme();
 const { addToast } = useToast();
 const { t } = useTranslation();

 const [currentPlan, setCurrentPlan] = useState('Free');
 const [realPlan, setRealPlan] = useState(null);
 const [loading, setLoading] = useState(true);

 useEffect(() => {
   const fetchData = async () => {
     try {
       const subRes = await billing.getSubscription().catch(() => ({ data: { plan: 'free' } }));
       const plan = subRes.data?.plan || 'free';
       setCurrentPlan(plan.charAt(0).toUpperCase() + plan.slice(1));
       setRealPlan(subRes.data);
     } catch (err) {
       console.error('Account fetch error:', err);
     } finally {
       setLoading(false);
     }
   };

   const params = new URLSearchParams(window.location.search);
   const checkout = params.get('checkout');
   if (checkout === 'success') {
     addToast("Subscription activated!", "success");
     window.history.replaceState({}, document.title, window.location.pathname);
   } else if (checkout === 'cancelled') {
     addToast("Checkout cancelled", "info");
     window.history.replaceState({}, document.title, window.location.pathname);
   }

   fetchData();
 }, []);

 const [upgrading, setUpgrading] = useState(null);
 
 const [showContactModal, setShowContactModal] = useState(false);
 const [showDeleteModal, setShowDeleteModal] = useState(false);
 const [showRemoveCardModal, setShowRemoveCardModal] = useState(false);
 const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
 const [deletingAccount, setDeletingAccount] = useState(false);

 // Password State
 const [currentPassword, setCurrentPassword] = useState('');
 const [newPassword, setNewPassword] = useState('');
 const [confirmPassword, setConfirmPassword] = useState('');
 const [changingPassword, setChangingPassword] = useState(false);

 const [promoCode, setPromoCode] = useState('');
 const [applyingPromo, setApplyingPromo] = useState(false);

 const handleApplyPromo = async (e) => {
   e.preventDefault();
   if (!promoCode.trim()) return;
   setApplyingPromo(true);
   try {
     const res = await billing.applyPromo(promoCode.trim());
     addToast(res.data.message || "Promo code applied successfully", "success");
     setPromoCode('');
     // Refresh subscription
     const subRes = await billing.getSubscription().catch(() => ({ data: { plan: 'free' } }));
     const plan = subRes.data?.plan || 'free';
     setCurrentPlan(plan.charAt(0).toUpperCase() + plan.slice(1));
     setRealPlan(subRes.data);
   } catch (error) {
     addToast(error.response?.data?.detail || "Invalid or expired promo code", "error");
   } finally {
     setApplyingPromo(false);
   }
 };

 const handleChangePassword = async (e) => {
   e.preventDefault();
   if (newPassword !== confirmPassword) {
     addToast("New passwords do not match", "error");
     return;
   }
   if (newPassword.length < 8) {
     addToast("Password must be at least 8 characters long", "error");
     return;
   }
   setChangingPassword(true);
   try {
     await auth.changePassword(currentPassword, newPassword);
     addToast("Password changed successfully", "success");
     setShowChangePasswordModal(false);
     setCurrentPassword('');
     setNewPassword('');
     setConfirmPassword('');
   } catch (error) {
     addToast(error.response?.data?.detail || "Failed to change password", "error");
   } finally {
     setChangingPassword(false);
   }
 };

 // Billing State
 const [paymentMethod, setPaymentMethod] = useState(null);

 // Contact Modal Form State
 const [contactName, setContactName] = useState('');
 const [contactCompany, setContactCompany] = useState('');
 const [contactEmail, setContactEmail] = useState('');
 const [contactMessage, setContactMessage] = useState('');

 // Delete Modal Form State
 const [deleteConfirm, setDeleteConfirm] = useState('');


 const [prefEmail, setPrefEmail] = useState(true);

 // Tooltip State
 const [showReportsTooltip, setShowReportsTooltip] = useState(false);
 const [showApiTooltip, setShowApiTooltip] = useState(false);

 const getUsageColor = (percentage) => {
 if (percentage < 70) return 'bg-[var(--brand-blue)]';
 if (percentage <= 90) return 'bg-[#f59e0b]';
 return 'bg-[#ef4444]';
 };

 // Text colors
 const textPrimary = "text-primary";
 const textSecondary = "text-muted";
 const textMuted = "text-secondary";

 const inputClasses = "w-full bg-card border border-border rounded-lg px-3 py-2 text-sm text-primary placeholder-[#697386] dark:placeholder-[#666666] focus:outline-none focus:border-[var(--brand-blue)] disabled:opacity-50";

 const handleUpgrade = async (plan) => {
 setUpgrading(plan);
 try {
 const res = await billing.createCheckoutSession(plan);
 window.location.href = res.data.checkout_url;
 } catch (error) {
 addToast("An error occurred starting checkout", "error");
 setUpgrading(null);
 }
 };

 const handleAddCard = async () => {
 addToast("Please upgrade to add a payment method", "info");
 };

 const handleRemoveCard = () => {
 setPaymentMethod(null);
 addToast("Payment method removed", "success");
 };

 return (
 <div className="page-enter">
 {/* ── 1. PAGE HEADER ── */}
 <div>
 <h1 className={`text-xl font-semibold ${textPrimary}`}>{t('account.title')}</h1>
 <p className={`text-sm ${textSecondary} mt-1`}>{t('settings.subtitle')}</p>
 </div>

 {/* ── 2. CURRENT PLAN CARD ── */}
 <div className="bg-card border border-border rounded-lg p-6 mt-6">
 <div className="flex items-center justify-between">
 <div className="flex items-center gap-3">
 <span className="bg-[#f0f2f5] text-primary text-base font-semibold px-4 py-1.5 rounded-full transition-colors">
 {currentPlan}
 </span>
 <span className="flex items-center gap-1.5">
 <span className="w-2 h-2 rounded-full bg-[#1a9e6e] inline-block" />
 <span className="text-sm text-[#1a9e6e] font-medium">Active</span>
 </span>
 </div>

 <div className={`flex items-center gap-0 text-sm ${textMuted}`}>
 {currentPlan === 'Pro' 
 ? '1,000 reports/mo · 10 data sources · Priority support' 
 : '100 reports/mo · 1 data source · Community support'}
 </div>

 {currentPlan !== 'Pro' && (
 <button 
 onClick={() => handleUpgrade('pro')}
 disabled={upgrading === 'pro'}
 className="bg-[var(--brand-blue)] text-white rounded-lg px-4 py-2.5 text-sm font-medium hover:bg-[var(--brand-blue-hover)] transition-colors flex items-center justify-center gap-2"
 >
 {upgrading === 'pro' && <Loader2 className="w-4 h-4 animate-spin" />}
 {t('account.upgrade')}
 </button>
 )}
 </div>

 <div className="mt-5 pt-5 border-t border-border">
 <div className="grid grid-cols-2 gap-6">
 <div>
 <div className="flex justify-between text-sm mb-1.5">
 <span className={textMuted}>Reports</span>
 <span className={textSecondary}>23/100</span>
 </div>
 <div 
 className="h-1.5 bg-[var(--border-color)] rounded-full relative cursor-pointer"
 onMouseEnter={() => setShowReportsTooltip(true)}
 onMouseLeave={() => setShowReportsTooltip(false)}
 onClick={() => setShowReportsTooltip(!showReportsTooltip)}
 >
 <div className={`w-[23%] ${getUsageColor(23)} rounded-full h-full transition-colors`} />
 {showReportsTooltip && (
 <div className="absolute -top-8 left-[23%] -translate-x-1/2 bg-[var(--text-primary)] dark:bg-card text-white dark:text-primary text-xs px-2 py-1 rounded shadow-lg whitespace-nowrap z-10">
 Exact numbers: 23 / 100
 <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-[#0a2540] dark:border-t-white" />
 </div>
 )}
 </div>
 </div>

 <div>
 <div className="flex justify-between text-sm mb-1.5">
 <span className={textMuted}>API Calls</span>
 <span className={textSecondary}>1,240/10,000</span>
 </div>
 <div 
 className="h-1.5 bg-[var(--border-color)] rounded-full relative cursor-pointer"
 onMouseEnter={() => setShowApiTooltip(true)}
 onMouseLeave={() => setShowApiTooltip(false)}
 onClick={() => setShowApiTooltip(!showApiTooltip)}
 >
 <div className={`w-[12.4%] ${getUsageColor(12.4)} rounded-full h-full transition-colors`} />
 {showApiTooltip && (
 <div className="absolute -top-8 left-[12.4%] -translate-x-1/2 bg-[var(--text-primary)] dark:bg-card text-white dark:text-primary text-xs px-2 py-1 rounded shadow-lg whitespace-nowrap z-10">
 Exact numbers: 1,240 / 10,000
 <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-[#0a2540] dark:border-t-white" />
 </div>
 )}
 </div>
 </div>
 </div>
 </div>
 </div>

 {/* ── 3. PLANS COMPARISON ── */}
 <div className="mt-8">
 <h2 className={`text-base font-semibold ${textPrimary} mb-4`}>{t('account.choosePlan')}</h2>

 <div className="grid grid-cols-3 gap-6">
 <div className="bg-card border border-border rounded-lg p-6 flex flex-col">
 <p className={`text-lg font-semibold ${textPrimary}`}>{t('account.free')}</p>
 <div className="mt-2">
 <span className={`text-3xl font-bold ${textPrimary}`}>€0</span>
 <span className={`text-sm ${textSecondary} ml-1`}>/month</span>
 </div>

 <ul className="mt-6 space-y-3 flex-1">
 <li className="flex items-center gap-2.5">
 <Check className="w-4 h-4 text-[#1a9e6e]" />
 <span className={`text-sm ${textMuted}`}>100 reports/month</span>
 </li>
 <li className="flex items-center gap-2.5">
 <Check className="w-4 h-4 text-[#1a9e6e]" />
 <span className={`text-sm ${textMuted}`}>1 data source</span>
 </li>
 <li className="flex items-center gap-2.5">
 <Check className="w-4 h-4 text-[#1a9e6e]" />
 <span className={`text-sm ${textMuted}`}>Community support</span>
 </li>
 <li className="flex items-center gap-2.5">
 <Check className="w-4 h-4 text-[#1a9e6e]" />
 <span className={`text-sm ${textMuted}`}>Basic analytics</span>
 </li>
 </ul>

 <div className={`mt-6 w-full ${currentPlan === 'Free' ? 'bg-[#f0f2f5] text-muted cursor-not-allowed' : 'bg-card border border-border text-primary hover:bg-page cursor-pointer'} rounded-lg px-4 py-2.5 text-sm font-medium text-center transition-colors`}>
 {currentPlan === 'Free' ? t('account.currentPlan') : 'Downgrade to Free'}
 </div>
 </div>

 <div className="relative flex flex-col">
 <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[var(--brand-blue)] text-white text-xs font-medium px-3 py-1 rounded-full whitespace-nowrap z-10">
 Most popular
 </span>
 <div className="bg-card border-2 border-[var(--brand-blue)] rounded-lg p-6 relative h-full flex flex-col">
 <p className={`text-lg font-semibold ${textPrimary}`}>{t('account.pro')}</p>
 <div className="mt-2">
 <span className={`text-3xl font-bold ${textPrimary}`}>€29</span>
 <span className={`text-sm ${textSecondary} ml-1`}>/month</span>
 </div>
 <p className={`text-xs ${textSecondary} mt-1`}>prod_Um5HdQslaAVfSH</p>

 <ul className="mt-6 space-y-3 flex-1">
 <li className="flex items-center gap-2.5">
 <Check className="w-4 h-4 text-[#1a9e6e]" />
 <span className={`text-sm ${textMuted}`}>1,000 reports/month</span>
 </li>
 <li className="flex items-center gap-2.5">
 <Check className="w-4 h-4 text-[#1a9e6e]" />
 <span className={`text-sm ${textMuted}`}>10 data sources</span>
 </li>
 <li className="flex items-center gap-2.5">
 <Check className="w-4 h-4 text-[#1a9e6e]" />
 <span className={`text-sm ${textMuted}`}>Priority support</span>
 </li>
 <li className="flex items-center gap-2.5">
 <Check className="w-4 h-4 text-[#1a9e6e]" />
 <span className={`text-sm ${textMuted}`}>Advanced analytics</span>
 </li>
 <li className="flex items-center gap-2.5">
 <Check className="w-4 h-4 text-[#1a9e6e]" />
 <span className={`text-sm ${textMuted}`}>Custom branding</span>
 </li>
 </ul>

 {currentPlan === 'Pro' ? (
 <div className="mt-6 w-full bg-[#f0f2f5] text-muted cursor-not-allowed rounded-lg px-4 py-2.5 text-sm font-medium text-center transition-colors">
 {t('account.currentPlan')}
 </div>
 ) : (
 <button 
 onClick={() => handleUpgrade('pro')}
 disabled={upgrading === 'pro'}
 className="mt-6 w-full bg-[var(--brand-blue)] text-white hover:bg-[var(--brand-blue-hover)] rounded-lg px-4 py-2.5 text-sm font-medium text-center transition-colors flex items-center justify-center gap-2"
 >
 {upgrading === 'pro' && <Loader2 className="w-4 h-4 animate-spin" />}
 Upgrade to Pro
 </button>
 )}
 </div>
 </div>

 <div className="bg-card border border-border rounded-lg p-6 flex flex-col">
 <p className={`text-lg font-semibold ${textPrimary}`}>{t('account.business')}</p>
 <div className="mt-2">
 <span className={`text-3xl font-bold ${textPrimary}`}>€99</span>
 <span className={`text-sm ${textSecondary} ml-1`}>/month</span>
 </div>
 <p className={`text-xs ${textSecondary} mt-1`}>prod_Um5JyQcX6PpBnb</p>

 <ul className="mt-6 space-y-3 flex-1">
 <li className="flex items-center gap-2.5">
 <Check className="w-4 h-4 text-[#1a9e6e]" />
 <span className={`text-sm ${textMuted}`}>Unlimited reports</span>
 </li>
 <li className="flex items-center gap-2.5">
 <Check className="w-4 h-4 text-[#1a9e6e]" />
 <span className={`text-sm ${textMuted}`}>Unlimited data sources</span>
 </li>
 <li className="flex items-center gap-2.5">
 <Check className="w-4 h-4 text-[#1a9e6e]" />
 <span className={`text-sm ${textMuted}`}>Dedicated support + SLA</span>
 </li>
 <li className="flex items-center gap-2.5">
 <Check className="w-4 h-4 text-[#1a9e6e]" />
 <span className={`text-sm ${textMuted}`}>Custom integrations</span>
 </li>
 <li className="flex items-center gap-2.5">
 <Check className="w-4 h-4 text-[#1a9e6e]" />
 <span className={`text-sm ${textMuted}`}>SSO / SAML</span>
 </li>
 </ul>

 <button 
 onClick={() => handleUpgrade('business')}
 disabled={upgrading === 'business'}
 className="mt-6 w-full bg-card border border-border text-secondary hover:bg-page hover:text-primary rounded-lg px-4 py-2.5 text-sm font-medium text-center transition-colors flex items-center justify-center gap-2"
 >
 {upgrading === 'business' && <Loader2 className="w-4 h-4 animate-spin" />}
 Upgrade to Business
 </button>
 </div>
 </div>
 </div>

 {/* ── 4. BILLING CARD ── */}
 <div className="bg-card border border-border rounded-lg p-6 mt-8">
 <h2 className={`text-base font-semibold ${textPrimary} mb-4`}>{t('account.billing')}</h2>

 {/* Payment method */}
 {paymentMethod ? (
 <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border border-border rounded-lg gap-4">
 <div className="flex items-center gap-3">
 <div className="bg-[#f0f2f5] p-2 rounded-md">
 <CreditCard className={`w-6 h-6 ${textSecondary}`} />
 </div>
 <div>
 <p className={`text-sm font-medium ${textPrimary} flex items-center gap-2`}>
 •••• •••• •••• {paymentMethod.last4}
 <span className="text-xs bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded font-semibold text-gray-600 dark:text-gray-300">
 {paymentMethod.brand}
 </span>
 </p>
 <p className={`text-xs ${textSecondary} mt-0.5`}>Expires {paymentMethod.expiry}</p>
 </div>
 </div>
 <button 
 onClick={() => setShowRemoveCardModal(true)}
 className="text-sm font-medium text-[#df1b41] hover:text-[#c8183a] bg-[#fef2f2] /10 px-3 py-1.5 rounded-md transition-colors"
 >
 Remove
 </button>
 </div>
 ) : (
 <div className="flex flex-col items-center py-8">
 <CreditCard className="w-10 h-10 text-[#d0d5dd] " />
 <p className={`text-sm font-medium ${textPrimary} mt-3`}>{t('account.noPayment')}</p>
 <p className={`text-xs ${textSecondary} mt-1`}>Add a card to enable automatic billing</p>
 <button 
 onClick={handleAddCard}
 className="mt-3 text-sm font-medium text-[var(--brand-blue)] border border-border dark:hover:border-[var(--brand-blue)] rounded-lg px-4 py-2 hover:bg-page /10 transition-colors"
 >
 {t('account.addCard')}
 </button>
 </div>
 )}

 {/* Invoices */}
 <div className="mt-6 pt-6 border-t border-border">
 <h3 className={`text-sm font-semibold ${textPrimary} mb-4`}>{t('account.invoices')}</h3>
 
 {currentPlan === 'Pro' ? (
 <div className="flex items-center justify-between py-3 border border-border px-4 rounded-lg">
 <div>
 <p className={`text-sm font-medium ${textPrimary}`}>INV-2026-001</p>
 <p className={`text-xs ${textSecondary}`}>Jun 1, 2026</p>
 </div>
 <div className="flex items-center gap-4">
 <span className={`text-sm font-medium ${textPrimary}`}>€29.00</span>
 <button 
 onClick={async () => {
 try {
 const res = await billing.createPortalSession?.();
 if (res?.data?.url) { window.location.href = res.data.url; }
 else { addToast("Invoice download is available in your Stripe billing portal. Please contact support@solvai.com", "info"); }
 } catch {
 addToast("To download invoices, contact support@solvai.com with your registered email.", "info");
 }
 }}
 className="text-sm font-medium text-[var(--brand-blue)] hover:text-[#0462c7]"
 >
 Download PDF
 </button>
 </div>
 </div>
 ) : (
 <div className="text-center py-8">
 <p className={`text-sm ${textSecondary}`}>{t('account.noInvoices')}</p>
 </div>
 )}
 </div>
 </div>

 {/* ── 5. PREFERENCES SECTION ── */}
 <div className="bg-card border border-border rounded-lg p-6 mt-8">
 <h2 className={`text-base font-semibold ${textPrimary} mb-4`}>Preferences</h2>
 
 <div className="space-y-6">

 <div className="flex items-center justify-between">
 <div>
 <p className={`text-sm font-medium ${textPrimary}`}>Email notifications</p>
 <p className={`text-xs ${textSecondary}`}>Receive product updates and news</p>
 </div>
 <label className="relative inline-flex items-center cursor-pointer">
 <input 
 type="checkbox" 
 className="sr-only peer" 
 checked={prefEmail} 
 onChange={(e) => setPrefEmail(e.target.checked)} 
 />
 <div className="w-11 h-6 bg-[var(--border-color)] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-card after:border-border after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--brand-blue)]"></div>
 </label>
 </div>
 
 <div className="pt-4 border-t border-border">
 <button 
 onClick={() => addToast("Preferences saved", "success")}
 className="bg-[var(--text-primary)] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[var(--text-primary)]/90 /90 transition-colors"
 >
 Save preferences
 </button>
 </div>
 </div>
 </div>

 {/* ── 6. SECURITY ── */}
 <div className="bg-card border border-border rounded-lg p-6 mt-8">
   <h2 className={`text-base font-semibold ${textPrimary} mb-4`}>Security</h2>
   <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
     <div>
       <p className={`text-sm font-medium ${textPrimary}`}>Change Password</p>
       <p className={`text-xs ${textSecondary} mt-1 max-w-md`}>Ensure your account is using a long, random password to stay secure.</p>
     </div>
     <button 
       onClick={() => setShowChangePasswordModal(true)}
       className="bg-card border border-border text-primary hover:bg-page rounded-lg px-4 py-2 text-sm font-medium transition-colors w-full sm:w-auto"
     >
       Change Password
     </button>
   </div>
 </div>

 {/* ── 7. DANGER ZONE ── */}
 <div className="bg-card border border-border border-l-[3px] border-l-[#df1b41] dark:border-l-[#df1b41] rounded-lg p-6 mt-8">
 <h2 className="text-base font-semibold text-[#df1b41]">Danger zone</h2>

 <div className="mt-3 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
 <div>
 <p className={`text-sm font-medium ${textPrimary}`}>{t('settings.deleteAccount')}</p>
 <p className={`text-xs ${textSecondary} mt-1 max-w-md`}>
 {t('settings.deleteAccountDesc')}
 </p>
 </div>

 <button 
 onClick={() => setShowDeleteModal(true)}
 className="bg-card border border-[#fca5a5] /30 text-[#df1b41] rounded-lg px-4 py-2 text-sm font-medium hover:bg-[#fef2f2] /10 whitespace-nowrap flex items-center justify-center gap-2 transition-colors w-full sm:w-auto"
 >
 <AlertTriangle className="w-4 h-4" />
 {t('settings.deleteAccount')}
 </button>
 </div>
 </div>

 {/* ── MODALS ── */}

 {/* Payment / Upgrade Modal logic removed */}

 {/* Contact Sales Modal */}
 {showContactModal && (
 <div className="fixed inset-0 bg-[var(--text-primary)]/20 dark:bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
 <div className="bg-card border border-border rounded-xl shadow-xl w-full max-w-md p-6 relative">
 <button 
 onClick={() => setShowContactModal(false)} 
 className="absolute top-4 right-4 text-muted hover:text-primary "
 >
 <X className="w-5 h-5"/>
 </button>
 <h2 className={`text-xl font-semibold ${textPrimary} mb-2`}>Contact sales</h2>
 <p className={`text-sm ${textSecondary} mb-6`}>Tell us about your needs and we&apos;ll get back to you shortly.</p>

 <form onSubmit={(e) => {
 e.preventDefault();
 setShowContactModal(false);
 addToast("Message sent!", 'success');
 setContactName('');
 setContactCompany('');
 setContactEmail('');
 setContactMessage('');
 }}>
 <div className="space-y-4">
 <div>
 <label className={`block text-sm font-medium ${textPrimary} mb-1`}>Name</label>
 <input 
 type="text"
 required
 className={inputClasses}
 value={contactName}
 onChange={(e) => setContactName(e.target.value)}
 />
 </div>
 <div>
 <label className={`block text-sm font-medium ${textPrimary} mb-1`}>Company</label>
 <input 
 type="text"
 className={inputClasses}
 value={contactCompany}
 onChange={(e) => setContactCompany(e.target.value)}
 />
 </div>
 <div>
 <label className={`block text-sm font-medium ${textPrimary} mb-1`}>Email</label>
 <input 
 type="email"
 required
 className={inputClasses}
 value={contactEmail}
 onChange={(e) => setContactEmail(e.target.value)}
 />
 </div>
 <div>
 <label className={`block text-sm font-medium ${textPrimary} mb-1`}>Message</label>
 <textarea 
 required
 rows={4}
 className={inputClasses}
 value={contactMessage}
 onChange={(e) => setContactMessage(e.target.value)}
 />
 </div>
 </div>

 <div className="mt-6 flex items-center justify-end gap-3">
 <button 
 type="button" 
 onClick={() => setShowContactModal(false)}
 className={`px-4 py-2 text-sm font-medium ${textPrimary} hover:bg-[#f0f2f5] rounded-lg transition-colors`}
 >
 Cancel
 </button>
 <button 
 type="submit"
 className="px-4 py-2 text-sm font-medium text-white bg-[var(--brand-blue)] hover:bg-[var(--brand-blue-hover)] rounded-lg transition-colors"
 >
 Send message
 </button>
 </div>
 </form>
 </div>
 </div>
 )}

 {/* Delete Account Modal */}
 {showDeleteModal && (
 <div className="fixed inset-0 bg-[var(--text-primary)]/20 dark:bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
 <div className="bg-card border border-border rounded-xl shadow-xl w-full max-w-md p-6 relative">
 <button 
 onClick={() => setShowDeleteModal(false)} 
 className="absolute top-4 right-4 text-muted hover:text-primary "
 >
 <X className="w-5 h-5"/>
 </button>
 <div className="flex items-center gap-3 mb-4">
 <div className="w-10 h-10 rounded-full bg-[#fef2f2] /10 flex items-center justify-center text-[#df1b41]">
 <AlertTriangle className="w-5 h-5" />
 </div>
 <h2 className={`text-xl font-semibold ${textPrimary}`}>Delete account</h2>
 </div>
 <p className={`text-sm ${textSecondary} mb-4`}>
 This action cannot be undone. All your data, reports, and settings will be permanently removed.
 </p>
 
 <p className={`text-sm font-medium ${textPrimary} mb-2`}>
 Type <span className="font-bold text-[#df1b41]">DELETE</span> to confirm.
 </p>

 <form onSubmit={async (e) => {
 e.preventDefault();
 if (deleteConfirm !== 'DELETE') return;
 try {
 setDeletingAccount(true);
 await users.deleteAccount();
 localStorage.clear();
 window.location.href = '/login?deleted=true';
 } catch (err) {
 addToast('Failed to delete account. Please try again.', 'error');
 setDeletingAccount(false);
 }
 }}>
 <input 
 type="text"
 required
 className={inputClasses}
 value={deleteConfirm}
 onChange={(e) => setDeleteConfirm(e.target.value)}
 placeholder="DELETE"
 />

 <div className="mt-6 flex items-center justify-end gap-3">
 <button 
 type="button" 
 onClick={() => setShowDeleteModal(false)}
 className={`px-4 py-2 text-sm font-medium ${textPrimary} hover:bg-[#f0f2f5] rounded-lg transition-colors`}
 >
 Cancel
 </button>
 <button 
 type="submit"
 disabled={deleteConfirm !== 'DELETE' || deletingAccount}
 className="px-4 py-2 text-sm font-medium text-white bg-[#df1b41] hover:bg-[#b91c1c] disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
 >
 {deletingAccount ? 'Deleting...' : 'Delete account'}
 </button>
 </div>
 </form>
 </div>
 </div>
 )}

 {/* Change Password Modal */}
 {showChangePasswordModal && (
   <div className="fixed inset-0 bg-[var(--text-primary)]/20 dark:bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
     <div className="bg-card border border-border rounded-xl shadow-xl w-full max-w-md p-6 relative">
       <button 
         onClick={() => setShowChangePasswordModal(false)} 
         className="absolute top-4 right-4 text-muted hover:text-primary"
       >
         <X className="w-5 h-5"/>
       </button>
       <h2 className={`text-xl font-semibold ${textPrimary} mb-2`}>Change Password</h2>
       <p className={`text-sm ${textSecondary} mb-6`}>Update your password to keep your account secure.</p>
       
       <form onSubmit={handleChangePassword}>
         <div className="space-y-4">
           <div>
             <label className={`block text-sm font-medium ${textPrimary} mb-1`}>Current Password</label>
             <input 
               type="password"
               required
               className={inputClasses}
               value={currentPassword}
               onChange={(e) => setCurrentPassword(e.target.value)}
             />
           </div>
           <div>
             <label className={`block text-sm font-medium ${textPrimary} mb-1`}>New Password</label>
             <input 
               type="password"
               required
               className={inputClasses}
               value={newPassword}
               onChange={(e) => setNewPassword(e.target.value)}
             />
           </div>
           <div>
             <label className={`block text-sm font-medium ${textPrimary} mb-1`}>Confirm New Password</label>
             <input 
               type="password"
               required
               className={inputClasses}
               value={confirmPassword}
               onChange={(e) => setConfirmPassword(e.target.value)}
             />
           </div>
         </div>
         
         <div className="mt-6 flex items-center justify-end gap-3">
           <button 
             type="button" 
             onClick={() => setShowChangePasswordModal(false)}
             className={`px-4 py-2 text-sm font-medium ${textPrimary} hover:bg-[#f0f2f5] rounded-lg transition-colors`}
           >
             Cancel
           </button>
           <button 
             type="submit"
             disabled={changingPassword}
             className="px-4 py-2 text-sm font-medium text-white bg-[var(--brand-blue)] hover:bg-[var(--brand-blue-hover)] disabled:opacity-50 flex items-center gap-2 rounded-lg transition-colors"
           >
             {changingPassword && <Loader2 className="w-4 h-4 animate-spin" />}
             Save Password
           </button>
         </div>
       </form>
     </div>
   </div>
 )}

 {/* Remove Card Confirm Modal */}
 <ConfirmModal 
 isOpen={showRemoveCardModal}
 onClose={() => setShowRemoveCardModal(false)}
 title="Remove payment method?"
 description="Are you sure you want to remove this card? Any active subscriptions may be affected."
 confirmLabel="Remove"
 confirmVariant="danger"
 onConfirm={handleRemoveCard}
 />
 </div>
 );
}
