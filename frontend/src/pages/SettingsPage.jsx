import React, { useState } from 'react';
import {
 Sun,
 Moon,
 Monitor,
 Eye,
 EyeOff,
 Copy,
 RefreshCw,
 X,
 AlertCircle,
 Fingerprint
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { mockApi } from '../lib/mockApi';
import ConfirmModal from '../components/ConfirmModal.jsx';

const cn = (...classes) => classes.filter(Boolean).join(' ');

// Reusable Components
const Card = ({ children, className }) => (
 <div className={cn("bg-card border border-border rounded-lg", className)}>
 {children}
 </div>
);

const SectionHeader = ({ title, description, isDanger }) => (
 <div className="mb-4">
 <h2 className="text-base font-semibold text-primary">{title}</h2>
 <p className="text-sm text-muted">{description}</p>
 </div>
);

const Row = ({ label, subtext, children, noBorder }) => (
 <div className={cn("py-4 flex items-center justify-between", !noBorder && "border-b border-border")}>
 <div className="pr-4">
 <div className="text-sm font-medium text-primary">{label}</div>
 {subtext && <div className="text-sm text-muted mt-0.5">{subtext}</div>}
 </div>
 <div className="flex-shrink-0">
 {children}
 </div>
 </div>
);

const Toggle = ({ checked, onChange }) => (
 <button
 type="button"
 role="switch"
 aria-checked={checked}
 onClick={() => onChange(!checked)}
 className={cn(
 "relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none",
 checked ? "bg-[#0570de]" : "bg-[#e3e8ef] "
 )}
 >
 <span
 className={cn(
 "pointer-events-none inline-block h-4 w-4 transform rounded-full bg-card shadow ring-0 transition duration-200 ease-in-out",
 checked ? "translate-x-4" : "translate-x-0"
 )}
 />
 </button>
);

const Modal = ({ isOpen, onClose, title, children }) => {
 if (!isOpen) return null;
 return (
 <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 dark:bg-black/70 p-4">
 <div className="bg-card rounded-lg shadow-xl w-full max-w-md border border-border overflow-hidden">
 <div className="flex items-center justify-between p-4 border-b border-border">
 <h3 className="text-base font-semibold text-primary">{title}</h3>
 <button onClick={onClose} className="text-muted hover:text-primary ">
 <X className="w-5 h-5" />
 </button>
 </div>
 <div className="p-4">
 {children}
 </div>
 </div>
 </div>
 );
};

export default function SettingsPage() {
 const { theme, setTheme } = useTheme();
 const { addToast } = useToast();

 // State: Appearance
 const [density, setDensity] = useState('Comfortable');

 // State: Notifications
 const [notifications, setNotifications] = useState({
 reports: true,
 errors: true,
 digest: true,
 updates: true,
 marketing: false,
 });

 // State: Security
 const [isPasswordModalOpen, setPasswordModalOpen] = useState(false);
 const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
 const [twoFactor, setTwoFactor] = useState(false);
 const [sessions, setSessions] = useState([
 { id: 1, name: 'MacBook Pro · Madrid, Spain', current: true },
 { id: 2, name: 'iPhone 15 · Madrid, Spain', time: '2 hours ago' },
 ]);

 // State: API
 const [showApi, setShowApi] = useState(false);
 const [apiKey, setApiKey] = useState('sk-solv-a7b8c9d0e1f2g3h4i5j6k7l8m9n03f9a');
 const [webhook, setWebhook] = useState('');
 const [isSavingWebhook, setIsSavingWebhook] = useState(false);
 const [isRegeneratingKey, setIsRegeneratingKey] = useState(false);
 const [apps, setApps] = useState([
 { id: 'google', name: 'Google Workspace' },
 { id: 'slack', name: 'Slack' },
 ]);
 const [confirmApiModal, setConfirmApiModal] = useState(false);
 const [disconnectAppId, setDisconnectAppId] = useState(null);

 // State: Danger Zone
 const [isDeleteReportsModalOpen, setDeleteReportsModalOpen] = useState(false);
 const [isDeleteAccountModalOpen, setDeleteAccountModalOpen] = useState(false);
 const [deleteConfirmText, setDeleteConfirmText] = useState('');

 const handleSaveNotifications = () => {
 addToast("Notification preferences saved", "success");
 };

 const handlePasswordUpdate = async (e) => {
 e.preventDefault();
 const formData = new FormData(e.target);
 const current = formData.get('current');
 const newPass = formData.get('newPass');
 const confirm = formData.get('confirm');

 if (newPass !== confirm) {
 addToast("New passwords do not match", "error");
 return;
 }

 setIsUpdatingPassword(true);
 try {
 await mockApi.changePassword(current, newPass);
 setPasswordModalOpen(false);
 addToast("Password updated successfully", "success");
 e.target.reset();
 } catch (error) {
 addToast(error.message || "Failed to update password", "error");
 } finally {
 setIsUpdatingPassword(false);
 }
 };

 const handleRevokeSession = (id) => {
 setSessions(prev => prev.filter(s => s.id !== id));
 };

 const handleCopyApi = () => {
 navigator.clipboard.writeText(apiKey);
 addToast("API key copied", "info");
 };

 const handleRegenerateApi = async () => {
 setIsRegeneratingKey(true);
 try {
 const { key } = await mockApi.regenerateApiKey();
 setApiKey(key);
 addToast("API key regenerated", "success");
 } catch (error) {
 addToast("Failed to regenerate API key", "error");
 } finally {
 setIsRegeneratingKey(false);
 }
 };

 const handleSaveWebhook = async () => {
 if (!webhook) return;
 setIsSavingWebhook(true);
 try {
 await mockApi.saveWebhook(webhook);
 addToast("Webhook saved successfully", "success");
 } catch (error) {
 addToast("Failed to save webhook", "error");
 } finally {
 setIsSavingWebhook(false);
 }
 };

 const handleDisconnectApp = (id) => {
 setApps(prev => prev.filter(app => app.id !== id));
 addToast("Application disconnected", "success");
 };

 const handleDeleteReports = () => {
 setDeleteReportsModalOpen(false);
 setDeleteConfirmText('');
 addToast("All reports deleted", "success");
 };

 const handleDeleteAccount = () => {
 setDeleteAccountModalOpen(false);
 setDeleteConfirmText('');
 addToast("Account deletion requested — this would be processed server-side", "info");
 };

 return (
 <div className="page-enter max-w-3xl mx-auto pb-12">
 <div className="mb-6">
 <h1 className="text-xl font-semibold text-primary">Settings</h1>
 <p className="text-sm text-muted">
 Manage your account settings and preferences.
 </p>
 </div>

 <div className="flex flex-col gap-8">
 
 {/* SECTION: Appearance */}
 <section>
 <SectionHeader title="Appearance" description="Customize how SolvAI looks on your device" />
 <Card className="px-5">
 <Row label="Theme" subtext="Select your preferred color scheme">
 <div className="flex p-1 bg-page rounded-lg border border-border">
 {[
 { id: 'light', icon: Sun, label: 'Light' },
 { id: 'dark', icon: Moon, label: 'Dark' },
 { id: 'system', icon: Monitor, label: 'System' },
 ].map(opt => {
 const Icon = opt.icon;
 const isActive = theme === opt.id;
 return (
 <button
 key={opt.id}
 onClick={() => setTheme(opt.id)}
 className={cn(
 "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
 isActive 
 ? "bg-[#0570de] text-white shadow-sm" 
 : "text-muted hover:text-primary "
 )}
 >
 <Icon className="w-4 h-4" />
 {opt.label}
 </button>
 );
 })}
 </div>
 </Row>
 <Row label="Sidebar density" subtext="Adjust the sidebar navigation size" noBorder>
 <select 
 value={density}
 onChange={e => setDensity(e.target.value)}
 className="bg-card border border-border text-primary rounded-lg px-3 py-1.5 text-sm outline-none focus:border-[#0570de]"
 >
 <option>Comfortable</option>
 <option>Compact</option>
 </select>
 </Row>
 </Card>
 </section>

 {/* SECTION: Notifications */}
 <section>
 <SectionHeader title="Notifications" description="Choose what you want to be notified about" />
 <Card className="px-5">
 <Row label="Report completed" subtext="Get notified when a report finishes processing">
 <Toggle checked={notifications.reports} onChange={v => setNotifications(prev => ({...prev, reports: v}))} />
 </Row>
 <Row label="Data source errors" subtext="Alert when a connected source fails to sync">
 <Toggle checked={notifications.errors} onChange={v => setNotifications(prev => ({...prev, errors: v}))} />
 </Row>
 <Row label="Weekly digest" subtext="Receive a weekly summary of your activity">
 <Toggle checked={notifications.digest} onChange={v => setNotifications(prev => ({...prev, digest: v}))} />
 </Row>
 <Row label="Product updates" subtext="News about new features and improvements">
 <Toggle checked={notifications.updates} onChange={v => setNotifications(prev => ({...prev, updates: v}))} />
 </Row>
 <Row label="Marketing emails" subtext="Tips, tutorials and promotional content" noBorder>
 <Toggle checked={notifications.marketing} onChange={v => setNotifications(prev => ({...prev, marketing: v}))} />
 </Row>
 <div className="pb-4 pt-2">
 <button 
 onClick={handleSaveNotifications}
 className="bg-[#0570de] hover:bg-[#0462c7] text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
 >
 Save notification preferences
 </button>
 </div>
 </Card>
 </section>

 {/* SECTION: Security */}
 <section>
 <SectionHeader title="Security" description="Manage your account security settings" />
 <Card className="px-5">
 <Row label="Password" subtext="Last changed 3 months ago">
 <button 
 onClick={() => setPasswordModalOpen(true)}
 className="bg-card border border-border hover:bg-page text-primary px-4 py-1.5 rounded-lg text-sm font-medium transition-colors"
 >
 Change password
 </button>
 </Row>
 <Row label="Two-factor authentication" subtext="Add an extra layer of security to your account">
 <Toggle checked={twoFactor} onChange={setTwoFactor} />
 </Row>
 {twoFactor && (
 <div className="bg-nav-active text-nav-active text-sm p-3 rounded-lg mb-4 flex gap-2 items-center">
 <AlertCircle className="w-4 h-4" />
 2FA setup would be configured here in production
 </div>
 )}
 <Row label="Active sessions" subtext="Devices currently logged into your account" noBorder>
 {/* Empty container just to keep flex layout clean */}
 </Row>
 <div className="pb-5 pl-2 border-t border-border pt-4 -mt-4">
 <div className="flex flex-col gap-3">
 {sessions.map(s => (
 <div key={s.id} className="flex items-center justify-between">
 <div className="flex items-center gap-2">
 <div className={cn("w-2 h-2 rounded-full", s.current ? "bg-[#1a9e6e]" : "bg-[#697386] ")} />
 <span className="text-sm text-primary">{s.name}</span>
 {s.current && <span className="text-xs text-muted ml-1">· Current session</span>}
 {s.time && <span className="text-xs text-muted ml-1">· {s.time}</span>}
 </div>
 {!s.current && (
 <button onClick={() => handleRevokeSession(s.id)} className="text-xs font-medium text-[#df1b41] hover:underline">
 Revoke
 </button>
 )}
 </div>
 ))}
 </div>
 </div>
 </Card>
 </section>

 {/* SECTION: API & Integrations */}
 <section>
 <SectionHeader title="API & Integrations" description="Manage your API keys and third-party integrations" />
 <Card className="px-5">
 <Row label="API Key" subtext="Use this key to access the SolvAI API">
 <div className="flex items-center gap-2 mt-2 md:mt-0">
 <div className="font-mono text-sm bg-page border border-border px-3 py-1.5 rounded-lg text-primary">
 {showApi ? apiKey : "sk-solv-••••••••••••••••••••••3f9a"}
 </div>
 <button onClick={() => setShowApi(!showApi)} className="p-1.5 text-muted hover:text-primary " title="Toggle visibility">
 {showApi ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
 </button>
 <button onClick={handleCopyApi} className="p-1.5 text-muted hover:text-primary " title="Copy">
 <Copy className="w-4 h-4" />
 </button>
 <button onClick={() => setConfirmApiModal(true)} className="p-1.5 text-muted hover:text-[#df1b41]" title="Regenerate">
 <RefreshCw className="w-4 h-4" />
 </button>
 </div>
 </Row>
 <Row label="Webhook endpoint" subtext="Receive real-time event notifications">
 <div className="flex gap-2">
 <input 
 type="url" 
 value={webhook}
 onChange={(e) => setWebhook(e.target.value)}
 placeholder="https://your-app.com/webhook"
 className="bg-card border border-border text-primary rounded-lg px-3 py-1.5 text-sm outline-none focus:border-[#0570de] w-64 placeholder:text-gray-400"
 />
 <button 
 onClick={handleSaveWebhook}
 disabled={isSavingWebhook}
 className="bg-card border border-border hover:bg-page text-primary px-4 py-1.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
 >
 {isSavingWebhook ? 'Saving...' : 'Save'}
 </button>
 </div>
 </Row>
 <Row label="Connected applications" subtext="" noBorder>
 {/* Layout placeholder */}
 </Row>
 <div className="pb-5 pt-2 border-t border-border -mt-4">
 <div className="flex flex-col gap-3 mt-4">
 {apps.map(app => (
 <div key={app.id} className="flex items-center justify-between bg-page border border-border p-3 rounded-lg">
 <div className="flex items-center gap-3">
 <span className="text-sm font-medium text-primary">{app.name}</span>
 <span className="text-[10px] font-medium bg-[#ecfdf5] dark:bg-green-900/30 text-[#1a9e6e] dark:text-green-400 px-2 py-0.5 rounded-full">Connected</span>
 </div>
 <button 
 onClick={() => setDisconnectAppId(app.id)}
 className="text-sm font-medium text-muted hover:text-primary "
 >
 Disconnect
 </button>
 </div>
 ))}
 {apps.length === 0 && (
 <p className="text-sm text-muted">No connected applications.</p>
 )}
 </div>
 </div>
 </Card>
 </section>

 {/* SECTION: Danger Zone */}
 <section>
 <SectionHeader title="Danger zone" description="Irreversible actions" />
 <Card className="px-5 border-l-[3px] border-l-[#df1b41] bg-red-50/30 dark:bg-red-950/10">
 <Row label="Delete all reports" subtext="Permanently delete all your reports. This cannot be undone.">
 <button 
 onClick={() => setDeleteReportsModalOpen(true)}
 className="bg-transparent border border-[#df1b41] text-[#df1b41] hover:bg-red-50 dark:hover:bg-red-900/20 px-4 py-1.5 rounded-lg text-sm font-medium transition-colors"
 >
 Delete all reports
 </button>
 </Row>
 <Row label="Delete account" subtext="Permanently delete your account and all associated data." noBorder>
 <button 
 onClick={() => setDeleteAccountModalOpen(true)}
 className="bg-[#df1b41] hover:bg-[#c8183a] text-white px-4 py-1.5 rounded-lg text-sm font-medium transition-colors"
 >
 Delete account
 </button>
 </Row>
 </Card>
 </section>

 </div>

 {/* MODAL: Change Password */}
 <Modal isOpen={isPasswordModalOpen} onClose={() => setPasswordModalOpen(false)} title="Change Password">
 <form onSubmit={handlePasswordUpdate} className="flex flex-col gap-4">
 <div>
 <label className="block text-sm font-medium text-primary mb-1">Current password</label>
 <input type="password" name="current" required className="w-full bg-card border border-border rounded-lg px-3 py-2 text-sm text-primary outline-none focus:border-[#0570de]" />
 </div>
 <div>
 <label className="block text-sm font-medium text-primary mb-1">New password</label>
 <input type="password" name="newPass" required minLength={8} className="w-full bg-card border border-border rounded-lg px-3 py-2 text-sm text-primary outline-none focus:border-[#0570de]" />
 </div>
 <div>
 <label className="block text-sm font-medium text-primary mb-1">Confirm new password</label>
 <input type="password" name="confirm" required minLength={8} className="w-full bg-card border border-border rounded-lg px-3 py-2 text-sm text-primary outline-none focus:border-[#0570de]" />
 </div>
 <div className="flex justify-end gap-3 mt-2">
 <button type="button" onClick={() => setPasswordModalOpen(false)} className="px-4 py-2 text-sm font-medium text-muted hover:text-primary ">Cancel</button>
 <button type="submit" disabled={isUpdatingPassword} className="bg-[#0570de] hover:bg-[#0462c7] disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium">
 {isUpdatingPassword ? 'Updating...' : 'Update password'}
 </button>
 </div>
 </form>
 </Modal>

 {/* MODAL: Confirm Regenerate API */}
 <ConfirmModal
 isOpen={confirmApiModal}
 onClose={() => setConfirmApiModal(false)}
 title="Regenerate API Key"
 description="Are you sure you want to regenerate your API key? Your current key will stop working immediately."
 confirmLabel="Regenerate"
 confirmVariant="danger"
 onConfirm={handleRegenerateApi}
 />

 {/* MODAL: Confirm Disconnect App */}
 <ConfirmModal
 isOpen={disconnectAppId !== null}
 onClose={() => setDisconnectAppId(null)}
 title="Disconnect Application"
 description="Are you sure you want to disconnect this application? It will no longer have access to your data."
 confirmLabel="Disconnect"
 confirmVariant="danger"
 onConfirm={() => handleDisconnectApp(disconnectAppId)}
 />

 {/* MODAL: Delete Reports */}
 <Modal isOpen={isDeleteReportsModalOpen} onClose={() => { setDeleteReportsModalOpen(false); setDeleteConfirmText(''); }} title="Delete All Reports">
 <div className="flex flex-col gap-4">
 <p className="text-sm text-secondary">
 This action will permanently delete all your reports. This cannot be undone.
 </p>
 <div>
 <label className="block text-sm font-medium text-primary mb-1">Type DELETE to confirm</label>
 <input 
 type="text" 
 value={deleteConfirmText}
 onChange={(e) => setDeleteConfirmText(e.target.value)}
 className="w-full bg-card border border-border rounded-lg px-3 py-2 text-sm text-primary outline-none focus:border-[#df1b41]" 
 />
 </div>
 <div className="flex justify-end gap-3 mt-2">
 <button onClick={() => { setDeleteReportsModalOpen(false); setDeleteConfirmText(''); }} className="px-4 py-2 text-sm font-medium text-muted hover:text-primary ">Cancel</button>
 <button 
 disabled={deleteConfirmText !== 'DELETE'}
 onClick={handleDeleteReports} 
 className="bg-[#df1b41] disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#c8183a] text-white px-4 py-2 rounded-lg text-sm font-medium"
 >
 Delete reports
 </button>
 </div>
 </div>
 </Modal>

 {/* MODAL: Delete Account */}
 <Modal isOpen={isDeleteAccountModalOpen} onClose={() => { setDeleteAccountModalOpen(false); setDeleteConfirmText(''); }} title="Delete Account">
 <div className="flex flex-col gap-4">
 <div className="p-3 bg-red-50 dark:bg-red-950/30 border border-[#df1b41] rounded-lg">
 <p className="text-sm text-[#df1b41] font-medium">
 This will permanently delete your account, all reports, data sources, and cancel any active subscriptions.
 </p>
 </div>
 <div>
 <label className="block text-sm font-medium text-primary mb-1">Type DELETE to confirm</label>
 <input 
 type="text" 
 value={deleteConfirmText}
 onChange={(e) => setDeleteConfirmText(e.target.value)}
 className="w-full bg-card border border-border rounded-lg px-3 py-2 text-sm text-primary outline-none focus:border-[#df1b41]" 
 />
 </div>
 <div className="flex justify-end gap-3 mt-2">
 <button onClick={() => { setDeleteAccountModalOpen(false); setDeleteConfirmText(''); }} className="px-4 py-2 text-sm font-medium text-muted hover:text-primary ">Cancel</button>
 <button 
 disabled={deleteConfirmText !== 'DELETE'}
 onClick={handleDeleteAccount} 
 className="bg-[#df1b41] disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#c8183a] text-white px-4 py-2 rounded-lg text-sm font-medium"
 >
 Delete account
 </button>
 </div>
 </div>
 </Modal>

 </div>
 );
}
