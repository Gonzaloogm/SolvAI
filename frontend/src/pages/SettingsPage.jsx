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
import apiClient, { apiKeys, users } from '../api/client.js';
import { useTranslation } from 'react-i18next';
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
 checked ? "bg-[var(--brand-blue)]" : "bg-[var(--border-color)] "
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
 const { t, i18n } = useTranslation();

 // State: Appearance
 const [density, setDensity] = useState(() => localStorage.getItem('solvai_density') || 'Comfortable');

 React.useEffect(() => {
   localStorage.setItem('solvai_density', density);
   if (density === 'Compact') {
     document.documentElement.classList.add('sidebar-dense');
   } else {
     document.documentElement.classList.remove('sidebar-dense');
   }
 }, [density]);

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

 // State: API
 const [apiKeysList, setApiKeysList] = useState([]);
 const [newApiKey, setNewApiKey] = useState(null);
 const [isCreateApiModalOpen, setIsCreateApiModalOpen] = useState(false);
 const [newKeyName, setNewKeyName] = useState('');
 const [isCreatingKey, setIsCreatingKey] = useState(false);
 
 const [webhook, setWebhook] = useState('');
 const [isSavingWebhook, setIsSavingWebhook] = useState(false);
 const [apps, setApps] = useState([
 { id: 'google', name: 'Google Workspace' },
 { id: 'slack', name: 'Slack' },
 ]);
 const [disconnectAppId, setDisconnectAppId] = useState(null);

 // State: Danger Zone
 const [isDeleteReportsModalOpen, setDeleteReportsModalOpen] = useState(false);
 const [isDeleteAccountModalOpen, setDeleteAccountModalOpen] = useState(false);
 const [deleteConfirmText, setDeleteConfirmText] = useState('');

 React.useEffect(() => {
   const savedNotifications = localStorage.getItem('solvai_notifications');
   if (savedNotifications) {
      try { setNotifications(JSON.parse(savedNotifications)); } catch (e) { /* ignore */ }
   }
   const savedWebhook = localStorage.getItem('solvai_webhook');
   if (savedWebhook) setWebhook(savedWebhook);
   loadApiKeys();
 }, []);

 const loadApiKeys = async () => {
   try {
     const res = await apiKeys.getAll();
     setApiKeysList(res.data);
   } catch (error) {
     console.error("Failed to load API keys", error);
   }
 };

 const handleSaveNotifications = () => {
 localStorage.setItem('solvai_notifications', JSON.stringify(notifications));
 addToast(t('settings.saved'), "success");
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
 await apiClient.post('/auth/change-password', {
   current_password: current,
   new_password: newPass,
 });
 setPasswordModalOpen(false);
 addToast("Password updated successfully", "success");
 e.target.reset();
 } catch (error) {
 addToast(error?.response?.data?.detail || "Failed to update password", "error");
 } finally {
 setIsUpdatingPassword(false);
 }
 };

 const handleCreateApiKey = async (e) => {
   e.preventDefault();
   setIsCreatingKey(true);
   try {
     const res = await apiKeys.create({ name: newKeyName });
     setNewApiKey(res.data.key);
     setIsCreateApiModalOpen(false);
     setNewKeyName('');
     loadApiKeys();
   } catch (error) {
     addToast("Failed to create API key", "error");
   } finally {
     setIsCreatingKey(false);
   }
 };

 const handleRevokeApiKey = async (id) => {
   try {
     await apiKeys.revoke(id);
     addToast("API key revoked", "success");
     loadApiKeys();
   } catch (error) {
     addToast("Failed to revoke API key", "error");
   }
 };

 const handleSaveWebhook = async () => {
 if (!webhook) return;
 setIsSavingWebhook(true);
 try {
 await new Promise(r => setTimeout(r, 500));
 localStorage.setItem('solvai_webhook', webhook);
 addToast("Webhook saved (local only)", "success");
 } finally {
 setIsSavingWebhook(false);
 }
 };

 const handleDisconnectApp = (id) => {
 setApps(prev => prev.filter(app => app.id !== id));
 setDisconnectAppId(null);
 addToast("Application disconnected", "success");
 };

 const handleDeleteReports = () => {
 setDeleteReportsModalOpen(false);
 setDeleteConfirmText('');
 addToast("All reports deleted", "success");
 };

  const handleDeleteAccount = async () => {
    try {
      await users.deleteAccount();
      setDeleteAccountModalOpen(false);
      setDeleteConfirmText('');
      localStorage.removeItem('solvai_token');
      localStorage.removeItem('solvai_user');
      window.location.href = '/login';
    } catch (error) {
      addToast(error?.response?.data?.detail || "Failed to delete account", "error");
    }
  };

 return (
 <div className="page-enter max-w-3xl mx-auto pb-12">
 <div className="mb-6">
 <h1 className="text-xl font-semibold text-primary">{t('settings.title')}</h1>
 <p className="text-sm text-muted">
 {t('settings.subtitle')}
 </p>
 </div>

 <div className="flex flex-col gap-8">
 
 {/* SECTION: Appearance */}
 <section>
 <SectionHeader title={t('settings.appearance')} description={t('settings.appearanceDesc')} />
 <Card className="px-5">
 <Row label={t('settings.theme')} subtext={t('settings.themeDesc')}>
 <div className="flex p-1 bg-page rounded-lg border border-border">
 {[
 { id: 'light', icon: Sun, label: t('settings.themeLight') },
 { id: 'dark', icon: Moon, label: t('settings.themeDark') },
 { id: 'system', icon: Monitor, label: t('settings.themeSystem') },
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
 ? "bg-[var(--brand-blue)] text-white shadow-sm" 
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
 <Row label={t('settings.language')} subtext={t('settings.languageDesc')}>
 <select 
 value={i18n.language}
 onChange={e => {
   i18n.changeLanguage(e.target.value);
   localStorage.setItem('solvai-language', e.target.value);
 }}
 className="bg-card border border-border text-primary rounded-lg px-3 py-1.5 text-sm outline-none focus:border-[var(--brand-blue)]"
 >
 <option value="en">English</option>
 <option value="es">Español</option>
 <option value="fr">Français</option>
 <option value="de">Deutsch</option>
 <option value="it">Italiano</option>
 <option value="pt">Português</option>
 </select>
 </Row>
 <Row label={t('settings.density')} subtext={t('settings.densityDesc')} noBorder>
 <select 
 value={density}
 onChange={e => setDensity(e.target.value)}
 className="bg-card border border-border text-primary rounded-lg px-3 py-1.5 text-sm outline-none focus:border-[var(--brand-blue)]"
 >
 <option>{t('settings.densityComfortable')}</option>
 <option>{t('settings.densityCompact')}</option>
 </select>
 </Row>
 </Card>
 </section>

 {/* SECTION: Notifications */}
 <section>
 <SectionHeader title={t('settings.notifications')} description={t('settings.notificationsDesc')} />
 <Card className="px-5">
 <Row label={t('settings.notifReports')} subtext={t('settings.notifReportsDesc')}>
 <Toggle checked={notifications.reports} onChange={v => setNotifications(prev => ({...prev, reports: v}))} />
 </Row>
 <Row label={t('settings.notifErrors')} subtext={t('settings.notifErrorsDesc')}>
 <Toggle checked={notifications.errors} onChange={v => setNotifications(prev => ({...prev, errors: v}))} />
 </Row>
 <Row label={t('settings.notifDigest')} subtext={t('settings.notifDigestDesc')}>
 <Toggle checked={notifications.digest} onChange={v => setNotifications(prev => ({...prev, digest: v}))} />
 </Row>
 <Row label={t('settings.notifUpdates')} subtext={t('settings.notifUpdatesDesc')}>
 <Toggle checked={notifications.updates} onChange={v => setNotifications(prev => ({...prev, updates: v}))} />
 </Row>
 <Row label={t('settings.notifMarketing')} subtext={t('settings.notifMarketingDesc')} noBorder>
 <Toggle checked={notifications.marketing} onChange={v => setNotifications(prev => ({...prev, marketing: v}))} />
 </Row>
 <div className="pb-4 pt-2">
 <button 
 onClick={handleSaveNotifications}
 className="bg-[var(--brand-blue)] hover:bg-[var(--brand-blue-hover)] text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
 >
 {t('settings.saveNotifications')}
 </button>
 </div>
 </Card>
 </section>

 {/* SECTION: Security */}
 <section>
 <SectionHeader title={t('settings.security')} description={t('settings.securityDesc')} />
 <Card className="px-5">
 <Row label={t('settings.password')} subtext="Manage your account password.">
 <button 
 onClick={() => setPasswordModalOpen(true)}
 className="bg-card border border-border hover:bg-page text-primary px-4 py-1.5 rounded-lg text-sm font-medium transition-colors"
 >
 {t('settings.changePassword')}
 </button>
 </Row>
 <Row label={t('settings.activeSessions')} subtext={t('settings.activeSessionsDesc')} noBorder>
 {/* Empty container just to keep flex layout clean */}
 </Row>
 <div className="pb-5 pl-2 border-t border-border pt-4 -mt-4">
 <div className="flex flex-col gap-3">
 <div className="flex items-center justify-between">
 <div className="flex items-center gap-2">
 <div className="w-2 h-2 rounded-full bg-[#1a9e6e]" />
 <span className="text-sm text-primary">Current device</span>
 <span className="text-xs text-muted ml-1">· {t('settings.currentSession')}</span>
 </div>
 </div>
 </div>
 </div>
 </Card>
 </section>

 {/* SECTION: API & Integrations */}
 <section>
 <SectionHeader title={t('settings.api')} description={t('settings.apiDesc')} />
 <Card className="px-5">
 <Row label="API Keys" subtext="Manage secret keys used to authenticate API requests." noBorder>
 <button 
 onClick={() => setIsCreateApiModalOpen(true)}
 className="bg-card border border-border hover:bg-page text-primary px-4 py-1.5 rounded-lg text-sm font-medium transition-colors"
 >
 Create new secret key
 </button>
 </Row>
 <div className="pb-5 pt-2">
 {apiKeysList.length > 0 ? (
 <div className="flex flex-col gap-3">
 {apiKeysList.map(key => (
 <div key={key.id} className="flex items-center justify-between bg-page border border-border p-3 rounded-lg">
 <div>
 <div className="text-sm font-medium text-primary">{key.name}</div>
 <div className="text-xs font-mono text-muted mt-1">{key.key_prefix}...</div>
 </div>
 <button 
 onClick={() => handleRevokeApiKey(key.id)}
 className="text-sm font-medium text-[#df1b41] hover:underline"
 >
 Revoke
 </button>
 </div>
 ))}
 </div>
 ) : (
 <p className="text-sm text-muted">No API keys generated yet.</p>
 )}
 <div className="mt-4 pt-4 border-t border-border">
 <a href="/api-docs" className="text-sm font-medium text-[var(--brand-blue)] hover:underline">
 View API Documentation &rarr;
 </a>
 </div>
 </div>
 <Row label={t('settings.webhookEndpoint')} subtext={t('settings.webhookDesc')}>
 <div className="flex gap-2">
 <input 
 type="url" 
 value={webhook}
 onChange={(e) => setWebhook(e.target.value)}
 placeholder="https://your-app.com/webhook"
 className="bg-card border border-border text-primary rounded-lg px-3 py-1.5 text-sm outline-none focus:border-[var(--brand-blue)] w-64 placeholder:text-gray-400"
 />
 <button 
 onClick={handleSaveWebhook}
 disabled={isSavingWebhook}
 className="bg-card border border-border hover:bg-page text-primary px-4 py-1.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
 >
 {isSavingWebhook ? t('settings.saving') : t('settings.save')}
 </button>
 </div>
 </Row>
 <Row label={t('settings.connectedApps')} subtext="" noBorder>
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
 {t('settings.disconnect')}
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
 <SectionHeader title={t('settings.danger')} description={t('settings.dangerDesc')} />
 <Card className="px-5 border-l-[3px] border-l-[#df1b41] bg-red-50/30 dark:bg-red-950/10">
 <Row label={t('settings.deleteReports')} subtext={t('settings.deleteReportsDesc')}>
 <button 
 onClick={() => setDeleteReportsModalOpen(true)}
 className="bg-transparent border border-[#df1b41] text-[#df1b41] hover:bg-red-50 dark:hover:bg-red-900/20 px-4 py-1.5 rounded-lg text-sm font-medium transition-colors"
 >
 {t('settings.deleteReports')}
 </button>
 </Row>
 <Row label={t('settings.deleteAccount')} subtext={t('settings.deleteAccountDesc')} noBorder>
 <button 
 onClick={() => setDeleteAccountModalOpen(true)}
 className="bg-[#df1b41] hover:bg-[#c8183a] text-white px-4 py-1.5 rounded-lg text-sm font-medium transition-colors"
 >
 {t('settings.deleteAccount')}
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
 <input type="password" name="current" required className="w-full bg-card border border-border rounded-lg px-3 py-2 text-sm text-primary outline-none focus:border-[var(--brand-blue)]" />
 </div>
 <div>
 <label className="block text-sm font-medium text-primary mb-1">New password</label>
 <input type="password" name="newPass" required minLength={8} className="w-full bg-card border border-border rounded-lg px-3 py-2 text-sm text-primary outline-none focus:border-[var(--brand-blue)]" />
 </div>
 <div>
 <label className="block text-sm font-medium text-primary mb-1">Confirm new password</label>
 <input type="password" name="confirm" required minLength={8} className="w-full bg-card border border-border rounded-lg px-3 py-2 text-sm text-primary outline-none focus:border-[var(--brand-blue)]" />
 </div>
 <div className="flex justify-end gap-3 mt-2">
 <button type="button" onClick={() => setPasswordModalOpen(false)} className="px-4 py-2 text-sm font-medium text-muted hover:text-primary ">Cancel</button>
 <button type="submit" disabled={isUpdatingPassword} className="bg-[var(--brand-blue)] hover:bg-[var(--brand-blue-hover)] disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium">
 {isUpdatingPassword ? 'Updating...' : 'Update password'}
 </button>
 </div>
 </form>
 </Modal>

 {/* MODAL: Create API Key */}
 <Modal isOpen={isCreateApiModalOpen} onClose={() => setIsCreateApiModalOpen(false)} title="Create new API Key">
 <form onSubmit={handleCreateApiKey} className="flex flex-col gap-4">
 <div>
 <label className="block text-sm font-medium text-primary mb-1">Key Name</label>
 <input type="text" value={newKeyName} onChange={(e) => setNewKeyName(e.target.value)} required placeholder="e.g. Production Key" className="w-full bg-card border border-border rounded-lg px-3 py-2 text-sm text-primary outline-none focus:border-[var(--brand-blue)]" />
 </div>
 <div className="flex justify-end gap-3 mt-2">
 <button type="button" onClick={() => setIsCreateApiModalOpen(false)} className="px-4 py-2 text-sm font-medium text-muted hover:text-primary ">Cancel</button>
 <button type="submit" disabled={isCreatingKey} className="bg-[var(--brand-blue)] hover:bg-[var(--brand-blue-hover)] disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium">
 {isCreatingKey ? 'Creating...' : 'Create key'}
 </button>
 </div>
 </form>
 </Modal>

 {/* MODAL: New API Key Result */}
 <Modal isOpen={!!newApiKey} onClose={() => setNewApiKey(null)} title="API Key Created">
 <div className="flex flex-col gap-4">
 <p className="text-sm text-primary">
 Please copy this key and save it somewhere safe. For security reasons, <strong>you will not be able to view it again</strong>.
 </p>
 <div className="bg-page border border-border p-3 rounded-lg flex items-center justify-between">
 <code className="text-sm font-mono text-primary break-all">{newApiKey}</code>
 <button onClick={() => { navigator.clipboard.writeText(newApiKey); addToast("Copied to clipboard", "success"); }} className="p-2 text-muted hover:text-primary shrink-0 ml-2">
 <Copy className="w-4 h-4" />
 </button>
 </div>
 <div className="flex justify-end mt-2">
 <button onClick={() => setNewApiKey(null)} className="bg-[var(--brand-blue)] hover:bg-[var(--brand-blue-hover)] text-white px-4 py-2 rounded-lg text-sm font-medium">
 I&apos;ve saved it
 </button>
 </div>
 </div>
 </Modal>

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
