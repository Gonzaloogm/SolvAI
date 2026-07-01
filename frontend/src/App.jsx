import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
 LayoutDashboard,
 FileText,
 Database,
 BarChart2,
 User,
 Settings,
 Menu,
 X,
 Sun,
 Moon,
} from 'lucide-react';

/* ── Contexts ──────────────────────────────────────────────────────────────── */
import { ThemeProvider, useTheme } from './context/ThemeContext.jsx';
import { ToastProvider } from './context/ToastContext.jsx';
import { ReportGenerationProvider } from './context/ReportGenerationContext.jsx';

/* ── Lazy-load pages ───────────────────────────────────────────────────────── */
import DashboardPage from './pages/DashboardPage.jsx';
import ReportsPage from './pages/ReportsPage.jsx';
import DataSourcesPage from './pages/DataSourcesPage.jsx';
import DemoComparisonPage from './pages/DemoComparisonPage.jsx';
import AccountPage from './pages/AccountPage.jsx';
import SettingsPage from './pages/SettingsPage.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import PublicReport from './pages/PublicReport.jsx';
import ApiDocs from './pages/ApiDocs.jsx';
import VerifyPortal from './pages/verify/VerifyPortal.jsx';
import VerifyAuthorize from './pages/verify/VerifyAuthorize.jsx';
import VerifyTrack from './pages/verify/VerifyTrack.jsx';
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';

/* ── Utility ───────────────────────────────────────────────────────────────── */
const cn = (...classes) => classes.filter(Boolean).join(' ');

/* ── Navigation items ──────────────────────────────────────────────────────── */
const NAV_ITEMS = [
 { id: 'dashboard', tKey: 'nav.dashboard', icon: LayoutDashboard },
 { id: 'reports', tKey: 'nav.reports', icon: FileText },
 { id: 'data-sources', tKey: 'nav.dataSources', icon: Database },
 { id: 'demo', tKey: 'nav.demo', icon: BarChart2 },
 { id: 'account', tKey: 'nav.account', icon: User },
 { id: 'settings', tKey: 'nav.settings', icon: Settings },
];

/* ── Page map ──────────────────────────────────────────────────────────────── */
const PAGES = {
 dashboard: DashboardPage,
 reports: ReportsPage,
 'data-sources': DataSourcesPage,
 demo: DemoComparisonPage,
 account: AccountPage,
 settings: SettingsPage,
 'api-docs': ApiDocs,
};

/* ══════════════════════════════════════════════════════════════════════════════
 Sidebar Component
 ══════════════════════════════════════════════════════════════════════════════ */
function Sidebar({ activePage, onNavigate, mobileOpen, onClose }) {
 const { actualTheme, toggleTheme } = useTheme();
 const navigate = useNavigate();
 const { t, i18n } = useTranslation();

 useEffect(() => {
   const density = localStorage.getItem('solvai_density');
   if (density === 'Compact') {
     document.documentElement.classList.add('sidebar-dense');
   }
 }, []);

 const LANGUAGES = [
   { code: 'en', label: 'EN' },
   { code: 'es', label: 'ES' },
   { code: 'fr', label: 'FR' },
   { code: 'de', label: 'DE' },
   { code: 'it', label: 'IT' },
   { code: 'pt', label: 'PT' }
 ];

 const cycleLanguage = () => {
   const currentIndex = LANGUAGES.findIndex(l => l.code === i18n.language);
   const nextIndex = (currentIndex + 1) % LANGUAGES.length;
   const nextLang = LANGUAGES[nextIndex].code;
   i18n.changeLanguage(nextLang);
   localStorage.setItem('solvai-language', nextLang);
 };

 const currentLangLabel = LANGUAGES.find(l => l.code === i18n.language)?.label || 'EN';

 const handleLogout = () => {
   localStorage.removeItem('solvai_token');
   localStorage.removeItem('solvai_user');
   navigate('/login');
 };
 
 const userStr = localStorage.getItem('solvai_user');
 const user = userStr ? JSON.parse(userStr) : null;
 const email = user?.email || 'demo@solvai.com';
 const initial = email.charAt(0).toUpperCase();

 return (
 <>
 {/* Mobile overlay */}
 {mobileOpen && (
 <div
 className="fixed inset-0 bg-black/20 z-40 lg:hidden"
 onClick={onClose}
 />
 )}

 <aside
 className={cn(
 'fixed top-0 left-0 h-full w-[220px] z-50 flex flex-col transition-all duration-200 ease-in-out',
 'bg-card border-r border-border',
 'lg:translate-x-0',
 mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
 )}
 >
 {/* Logo */}
 <div className="px-5 h-16 shrink-0 flex items-center justify-between border-b border-border">
 <img src="/SolvAI-logo.png" alt="SolvAI Logo" className="h-7 w-auto object-contain" />
 <button
 className="lg:hidden p-1 rounded-md hover:bg-page "
 onClick={onClose}
 >
 <X className="w-5 h-5 text-muted" />
 </button>
 </div>

 {/* Navigation */}
 <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
 {NAV_ITEMS.map((item) => {
 const Icon = item.icon;
 const isActive = activePage === item.id;
 const isDisabled = item.disabled;

 return (
 <button
 key={item.id}
 onClick={() => {
 if (!isDisabled) {
 onNavigate(item.id);
 onClose();
 }
 }}
 disabled={isDisabled}
 className={cn(
 'w-full flex items-center gap-3 px-3 h-9 rounded-lg text-sm transition-colors duration-150 font-medium',
 isActive && 'bg-[#eff6ff] dark:bg-[#0d1f3c] text-[#0570de] dark:text-[#60a5fa]',
 !isActive && !isDisabled && 'text-secondary hover:bg-page hover:text-primary ',
 isDisabled && 'text-[#d0d5dd] cursor-not-allowed'
 )}
 >
 <Icon className="w-[18px] h-[18px] flex-shrink-0" />
 <span className="flex-1 text-left">{t(item.tKey)}</span>
 {item.badge && (
 <span className="text-[10px] font-medium bg-[#f0f2f5] text-muted px-2 py-0.5 rounded-full">
 {item.badge}
 </span>
 )}
 </button>
 );
 })}
 </nav>

 {/* Theme Toggle & User info */}
 <div className="border-t border-border p-3 flex flex-col gap-2 shrink-0">


 <div className="flex items-center gap-3 px-3 py-2">
 <div className="w-8 h-8 rounded-full bg-[#0570de] flex items-center justify-center text-white text-xs font-semibold flex-shrink-0">
 {initial}
 </div>
 <div className="flex-1 min-w-0">
 <p className="text-sm font-medium text-primary truncate">
 {email}
 </p>
 <p className="text-xs text-muted truncate">{user?.subscription_plan || 'free'} plan</p>
 </div>
 </div>
 
 <button onClick={handleLogout} className="w-full flex items-center gap-3 px-3 h-9 rounded-lg text-sm transition-colors duration-150 font-medium text-secondary hover:bg-page hover:text-primary mt-1">
   <User className="w-[18px] h-[18px] flex-shrink-0" />
   <span className="flex-1 text-left">{t('nav.logout')}</span>
 </button>

 <button onClick={cycleLanguage} className="w-full flex items-center justify-center gap-2 px-3 h-8 rounded-lg text-xs transition-colors duration-150 font-medium text-muted hover:bg-page hover:text-primary mt-2">
   {currentLangLabel}
 </button>
 </div>
 </aside>
 </>
 );
}

/* ══════════════════════════════════════════════════════════════════════════════
 App Component
 ══════════════════════════════════════════════════════════════════════════════ */
function ProtectedRoute({ children }) {
  const token = localStorage.getItem('solvai_token');
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

export default function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <ReportGenerationProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/r/:token" element={<PublicReport />} />
            <Route path="/verify" element={<VerifyPortal />} />
            <Route path="/verify/authorize/:token" element={<VerifyAuthorize />} />
            <Route path="/verify/track/:id" element={<VerifyTrack />} />
            <Route path="/*" element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            } />
          </Routes>
        </ReportGenerationProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}

function AppLayout() {
 const location = useLocation();
 const navigate = useNavigate();
 const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

 const path = location.pathname.slice(1);
 const activePage = PAGES[path] ? path : 'dashboard';

 const PageComponent = PAGES[activePage];

 return (
 <div className="min-h-screen bg-page transition-colors duration-200">
 {/* Sidebar */}
 <Sidebar
 activePage={activePage}
 onNavigate={(id) => navigate(`/${id}`)}
 mobileOpen={mobileMenuOpen}
 onClose={() => setMobileMenuOpen(false)}
 />

 {/* Main content */}
 <main className="lg:ml-[220px] min-h-screen">
 {/* Mobile header */}
 <div className="lg:hidden sticky top-0 z-30 h-14 bg-card border-b border-border flex items-center px-4 transition-colors duration-200">
 <button
 onClick={() => setMobileMenuOpen(true)}
 className="p-2 rounded-lg hover:bg-page "
 >
 <Menu className="w-5 h-5 text-secondary" />
 </button>
 <img src="/SolvAI-logo.png" alt="SolvAI Logo" className="ml-3 h-5 w-auto object-contain" />
 </div>

 {/* Page content */}
 <div className="px-6 py-8 lg:px-10 lg:py-8">
 <div className="max-w-[1100px] mx-auto">
 <PageComponent key={activePage} onNavigate={(id) => navigate(`/${id}`)} />
 </div>
 </div>
 </main>
 </div>
 );
}
