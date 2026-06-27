import React, { useState } from 'react';
import { Check, CreditCard, AlertTriangle, Zap, ArrowUpRight, X, Loader2 } from 'lucide-react';
import { useTheme } from '../context/ThemeContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import ConfirmModal from '../components/ConfirmModal.jsx';

const cn = (...classes) => classes.filter(Boolean).join(' ');

export default function AccountPage() {
 const { theme, setTheme } = useTheme();
 const { addToast } = useToast();

 const [currentPlan, setCurrentPlan] = useState('Free');

 // Modal states
 const [showPaymentModal, setShowPaymentModal] = useState(false);
 const [paymentModalMode, setPaymentModalMode] = useState('upgrade'); // 'upgrade' | 'addCard'
 const [paymentSuccess, setPaymentSuccess] = useState(false);
 const [isSubmitting, setIsSubmitting] = useState(false);
 
 const [showContactModal, setShowContactModal] = useState(false);
 const [showDeleteModal, setShowDeleteModal] = useState(false);
 const [showRemoveCardModal, setShowRemoveCardModal] = useState(false);

 // Billing State
 const [paymentMethod, setPaymentMethod] = useState(null);

 // Payment Form State
 const [cardInput, setCardInput] = useState('');
 const [expiry, setExpiry] = useState('');
 const [cvc, setCvc] = useState('');
 const [nameOnCard, setNameOnCard] = useState('');

 // Contact Modal Form State
 const [contactName, setContactName] = useState('');
 const [contactCompany, setContactCompany] = useState('');
 const [contactEmail, setContactEmail] = useState('');
 const [contactMessage, setContactMessage] = useState('');

 // Delete Modal Form State
 const [deleteConfirm, setDeleteConfirm] = useState('');

 // Preferences State
 const [prefLang, setPrefLang] = useState('English');
 const [prefEmail, setPrefEmail] = useState(true);

 // Tooltip State
 const [showReportsTooltip, setShowReportsTooltip] = useState(false);
 const [showApiTooltip, setShowApiTooltip] = useState(false);

 const formatCardNumber = (val) => {
 const digits = val.replace(/\D/g, '');
 const matches = digits.match(/.{1,4}/g);
 return matches ? matches.join(' ').substring(0, 19) : '';
 };
 
 const formatExpiry = (val) => {
 const digits = val.replace(/\D/g, '');
 if (digits.length >= 3) {
 return `${digits.substring(0, 2)}/${digits.substring(2, 4)}`;
 }
 return digits;
 };

 const detectCardBrand = (number) => {
 if (number.startsWith('4')) return 'Visa';
 if (/^5[1-5]/.test(number)) return 'Mastercard';
 if (/^3[47]/.test(number)) return 'Amex';
 return 'Card';
 };

 const getUsageColor = (percentage) => {
 if (percentage < 70) return 'bg-[#0570de]';
 if (percentage <= 90) return 'bg-[#f59e0b]';
 return 'bg-[#ef4444]';
 };

 // Text colors
 const textPrimary = "text-primary";
 const textSecondary = "text-muted";
 const textMuted = "text-secondary";

 const inputClasses = "w-full bg-card border border-border rounded-lg px-3 py-2 text-sm text-primary placeholder-[#697386] dark:placeholder-[#666666] focus:outline-none focus:border-[#0570de] disabled:opacity-50";

 const isPaymentFormValid = cardInput.length === 19 && expiry.length === 5 && cvc.length >= 3 && nameOnCard.trim().length > 0;

 const handlePaymentSubmit = async (e) => {
 e.preventDefault();
 if (!isPaymentFormValid) return;
 
 setIsSubmitting(true);
 try {
 if (paymentModalMode === 'upgrade') {
 await window.createSubscription('pro');
 setCurrentPlan('Pro');
 setPaymentSuccess(true);
 addToast("Welcome to SolvAI Pro!", "success");
 } else {
 const cardData = await window.addPaymentMethod({ 
 number: cardInput, 
 expiry: expiry 
 });
 setPaymentMethod(cardData);
 setPaymentSuccess(true);
 addToast("Card added successfully", "success");
 }
 } catch (error) {
 addToast("An error occurred", "error");
 } finally {
 setIsSubmitting(false);
 }
 };

 const openUpgradeModal = () => {
 setPaymentModalMode('upgrade');
 setPaymentSuccess(false);
 setCardInput('');
 setExpiry('');
 setCvc('');
 setNameOnCard('');
 setShowPaymentModal(true);
 };

 const openAddCardModal = () => {
 setPaymentModalMode('addCard');
 setPaymentSuccess(false);
 setCardInput('');
 setExpiry('');
 setCvc('');
 setNameOnCard('');
 setShowPaymentModal(true);
 };

 const handleRemoveCard = () => {
 setPaymentMethod(null);
 addToast("Payment method removed", "success");
 };

 return (
 <div className="page-enter">
 {/* ── 1. PAGE HEADER ── */}
 <div>
 <h1 className={`text-xl font-semibold ${textPrimary}`}>Account settings</h1>
 <p className={`text-sm ${textSecondary} mt-1`}>Manage your subscription and billing</p>
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
 onClick={openUpgradeModal}
 className="bg-[#0570de] text-white rounded-lg px-4 py-2.5 text-sm font-medium hover:bg-[#0462c7] transition-colors"
 >
 Upgrade plan
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
 className="h-1.5 bg-[#e3e8ef] rounded-full relative cursor-pointer"
 onMouseEnter={() => setShowReportsTooltip(true)}
 onMouseLeave={() => setShowReportsTooltip(false)}
 onClick={() => setShowReportsTooltip(!showReportsTooltip)}
 >
 <div className={`w-[23%] ${getUsageColor(23)} rounded-full h-full transition-colors`} />
 {showReportsTooltip && (
 <div className="absolute -top-8 left-[23%] -translate-x-1/2 bg-[#0a2540] dark:bg-card text-white dark:text-primary text-xs px-2 py-1 rounded shadow-lg whitespace-nowrap z-10">
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
 className="h-1.5 bg-[#e3e8ef] rounded-full relative cursor-pointer"
 onMouseEnter={() => setShowApiTooltip(true)}
 onMouseLeave={() => setShowApiTooltip(false)}
 onClick={() => setShowApiTooltip(!showApiTooltip)}
 >
 <div className={`w-[12.4%] ${getUsageColor(12.4)} rounded-full h-full transition-colors`} />
 {showApiTooltip && (
 <div className="absolute -top-8 left-[12.4%] -translate-x-1/2 bg-[#0a2540] dark:bg-card text-white dark:text-primary text-xs px-2 py-1 rounded shadow-lg whitespace-nowrap z-10">
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
 <h2 className={`text-base font-semibold ${textPrimary} mb-4`}>Choose a plan</h2>

 <div className="grid grid-cols-3 gap-6">
 <div className="bg-card border border-border rounded-lg p-6 flex flex-col">
 <p className={`text-lg font-semibold ${textPrimary}`}>Free</p>
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
 {currentPlan === 'Free' ? 'Current plan' : 'Downgrade to Free'}
 </div>
 </div>

 <div className="relative flex flex-col">
 <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#0570de] text-white text-xs font-medium px-3 py-1 rounded-full whitespace-nowrap z-10">
 Most popular
 </span>
 <div className="bg-card border-2 border-[#0570de] rounded-lg p-6 relative h-full flex flex-col">
 <p className={`text-lg font-semibold ${textPrimary}`}>Pro</p>
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
 Current plan
 </div>
 ) : (
 <button 
 onClick={openUpgradeModal}
 className="mt-6 w-full bg-[#0570de] text-white hover:bg-[#0462c7] rounded-lg px-4 py-2.5 text-sm font-medium text-center transition-colors"
 >
 Upgrade to Pro
 </button>
 )}
 </div>
 </div>

 <div className="bg-card border border-border rounded-lg p-6 flex flex-col">
 <p className={`text-lg font-semibold ${textPrimary}`}>Business</p>
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
 onClick={() => setShowContactModal(true)}
 className="mt-6 w-full bg-card border border-border text-secondary hover:bg-page hover:text-primary rounded-lg px-4 py-2.5 text-sm font-medium text-center transition-colors"
 >
 Contact sales
 </button>
 </div>
 </div>
 </div>

 {/* ── 4. BILLING CARD ── */}
 <div className="bg-card border border-border rounded-lg p-6 mt-8">
 <h2 className={`text-base font-semibold ${textPrimary} mb-4`}>Billing</h2>

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
 <p className={`text-sm font-medium ${textPrimary} mt-3`}>No payment method</p>
 <p className={`text-xs ${textSecondary} mt-1`}>Add a card to enable automatic billing</p>
 <button 
 onClick={openAddCardModal}
 className="mt-3 text-sm font-medium text-[#0570de] border border-border dark:hover:border-[#0570de] rounded-lg px-4 py-2 hover:bg-page /10 transition-colors"
 >
 + Add card
 </button>
 </div>
 )}

 {/* Invoices */}
 <div className="mt-6 pt-6 border-t border-border">
 <h3 className={`text-sm font-semibold ${textPrimary} mb-4`}>Invoices</h3>
 
 {currentPlan === 'Pro' ? (
 <div className="flex items-center justify-between py-3 border border-border px-4 rounded-lg">
 <div>
 <p className={`text-sm font-medium ${textPrimary}`}>INV-2026-001</p>
 <p className={`text-xs ${textSecondary}`}>Jun 1, 2026</p>
 </div>
 <div className="flex items-center gap-4">
 <span className={`text-sm font-medium ${textPrimary}`}>€29.00</span>
 <button 
 onClick={() => addToast("Downloading invoice...", "info")}
 className="text-sm font-medium text-[#0570de] hover:text-[#0462c7]"
 >
 Download PDF
 </button>
 </div>
 </div>
 ) : (
 <div className="text-center py-8">
 <p className={`text-sm ${textSecondary}`}>No invoices yet</p>
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
 <p className={`text-sm font-medium ${textPrimary}`}>Language</p>
 <p className={`text-xs ${textSecondary}`}>Select your preferred language</p>
 </div>
 <select 
 value={prefLang}
 onChange={(e) => setPrefLang(e.target.value)}
 className="bg-card border border-border rounded-lg px-3 py-2 text-sm text-primary focus:outline-none focus:border-[#0570de]"
 >
 <option value="English">English</option>
 <option value="Spanish">Spanish</option>
 <option value="French">French</option>
 </select>
 </div>

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
 <div className="w-11 h-6 bg-[#e3e8ef] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-card after:border-border after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#0570de]"></div>
 </label>
 </div>
 
 <div className="pt-4 border-t border-border">
 <button 
 onClick={() => addToast("Preferences saved", "success")}
 className="bg-[#0a2540] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#0a2540]/90 /90 transition-colors"
 >
 Save preferences
 </button>
 </div>
 </div>
 </div>

 {/* ── 6. DANGER ZONE ── */}
 <div className="bg-card border border-border border-l-[3px] border-l-[#df1b41] dark:border-l-[#df1b41] rounded-lg p-6 mt-8">
 <h2 className="text-base font-semibold text-[#df1b41]">Danger zone</h2>

 <div className="mt-3 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
 <div>
 <p className={`text-sm font-medium ${textPrimary}`}>Delete account</p>
 <p className={`text-xs ${textSecondary} mt-1 max-w-md`}>
 Permanently delete your account and all associated data. This action cannot be undone.
 </p>
 </div>

 <button 
 onClick={() => setShowDeleteModal(true)}
 className="bg-card border border-[#fca5a5] /30 text-[#df1b41] rounded-lg px-4 py-2 text-sm font-medium hover:bg-[#fef2f2] /10 whitespace-nowrap flex items-center justify-center gap-2 transition-colors w-full sm:w-auto"
 >
 <AlertTriangle className="w-4 h-4" />
 Delete account
 </button>
 </div>
 </div>

 {/* ── MODALS ── */}

 {/* Payment / Upgrade Modal */}
 {showPaymentModal && (
 <div className="fixed inset-0 bg-[#0a2540]/20 dark:bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
 <div className="bg-card border border-border rounded-xl shadow-xl w-full max-w-md p-6 relative">
 <button 
 onClick={() => !isSubmitting && setShowPaymentModal(false)} 
 className="absolute top-4 right-4 text-muted hover:text-primary "
 disabled={isSubmitting}
 >
 <X className="w-5 h-5"/>
 </button>

 {paymentSuccess ? (
 <div className="flex flex-col items-center justify-center py-6 text-center">
 <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-500 rounded-full flex items-center justify-center mb-4">
 <Check className="w-6 h-6" />
 </div>
 <h2 className={`text-xl font-semibold ${textPrimary} mb-2`}>
 {paymentModalMode === 'upgrade' ? "You're now on Pro! 🎉" : "Card added successfully!"}
 </h2>
 <button 
 onClick={() => setShowPaymentModal(false)}
 className="mt-4 px-6 py-2 text-sm font-medium text-white bg-[#0570de] hover:bg-[#0462c7] rounded-lg transition-colors"
 >
 Continue
 </button>
 </div>
 ) : (
 <>
 <h2 className={`text-xl font-semibold ${textPrimary} mb-2`}>
 {paymentModalMode === 'upgrade' ? 'Upgrade to Pro' : 'Add Payment Method'}
 </h2>
 <p className={`text-sm ${textSecondary} mb-6`}>
 {paymentModalMode === 'upgrade' 
 ? 'Get access to 1,000 reports/mo, 10 data sources, and more.' 
 : 'Add a card for automatic billing.'}
 </p>

 <form onSubmit={handlePaymentSubmit}>
 <div className="space-y-4">
 <div>
 <label className={`block text-sm font-medium ${textPrimary} mb-1 flex justify-between`}>
 <span>Card number</span>
 {cardInput && (
 <span className="text-xs font-semibold text-[#0570de]">
 {detectCardBrand(cardInput)}
 </span>
 )}
 </label>
 <div className="relative">
 <CreditCard className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${textSecondary}`} />
 <input 
 type="text"
 required
 disabled={isSubmitting}
 className={`${inputClasses} pl-10`}
 placeholder="0000 0000 0000 0000"
 value={cardInput}
 onChange={(e) => setCardInput(formatCardNumber(e.target.value))}
 />
 </div>
 </div>
 <div className="grid grid-cols-2 gap-4">
 <div>
 <label className={`block text-sm font-medium ${textPrimary} mb-1`}>Expiry</label>
 <input 
 type="text"
 required
 disabled={isSubmitting}
 className={inputClasses}
 placeholder="MM/YY"
 value={expiry}
 onChange={(e) => setExpiry(formatExpiry(e.target.value))}
 />
 </div>
 <div>
 <label className={`block text-sm font-medium ${textPrimary} mb-1`}>CVC</label>
 <input 
 type="text"
 required
 disabled={isSubmitting}
 maxLength={4}
 className={inputClasses}
 placeholder="123"
 value={cvc}
 onChange={(e) => setCvc(e.target.value.replace(/\D/g, ''))}
 />
 </div>
 </div>
 <div>
 <label className={`block text-sm font-medium ${textPrimary} mb-1`}>Name on card</label>
 <input 
 type="text"
 required
 disabled={isSubmitting}
 className={inputClasses}
 placeholder="Jane Doe"
 value={nameOnCard}
 onChange={(e) => setNameOnCard(e.target.value)}
 />
 </div>
 </div>

 <div className="mt-6 flex items-center justify-end gap-3">
 <button 
 type="button" 
 onClick={() => setShowPaymentModal(false)}
 disabled={isSubmitting}
 className={`px-4 py-2 text-sm font-medium ${textPrimary} hover:bg-[#f0f2f5] disabled:opacity-50 rounded-lg transition-colors`}
 >
 Cancel
 </button>
 <button 
 type="submit"
 disabled={isSubmitting || !isPaymentFormValid}
 className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[#0570de] hover:bg-[#0462c7] disabled:opacity-70 disabled:cursor-not-allowed rounded-lg transition-colors"
 >
 {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
 {paymentModalMode === 'upgrade' ? 'Subscribe - €29/mo' : 'Save card'}
 </button>
 </div>
 </form>
 </>
 )}
 </div>
 </div>
 )}

 {/* Contact Sales Modal */}
 {showContactModal && (
 <div className="fixed inset-0 bg-[#0a2540]/20 dark:bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
 <div className="bg-card border border-border rounded-xl shadow-xl w-full max-w-md p-6 relative">
 <button 
 onClick={() => setShowContactModal(false)} 
 className="absolute top-4 right-4 text-muted hover:text-primary "
 >
 <X className="w-5 h-5"/>
 </button>
 <h2 className={`text-xl font-semibold ${textPrimary} mb-2`}>Contact sales</h2>
 <p className={`text-sm ${textSecondary} mb-6`}>Tell us about your needs and we'll get back to you shortly.</p>

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
 className="px-4 py-2 text-sm font-medium text-white bg-[#0570de] hover:bg-[#0462c7] rounded-lg transition-colors"
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
 <div className="fixed inset-0 bg-[#0a2540]/20 dark:bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
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

 <form onSubmit={(e) => {
 e.preventDefault();
 if (deleteConfirm === 'DELETE') {
 setShowDeleteModal(false);
 addToast("Account deleted", "success");
 setDeleteConfirm('');
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
 disabled={deleteConfirm !== 'DELETE'}
 className="px-4 py-2 text-sm font-medium text-white bg-[#df1b41] hover:bg-[#b91c1c] disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
 >
 Delete account
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
