import { lazy, Suspense, useState, useEffect } from 'react';
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
} from 'lucide-react';
import { users as usersApi } from './api/client.js';

/* ── Contexts ──────────────────────────────────────────────────────────────── */
import { ThemeProvider, useTheme } from './context/ThemeContext.jsx';
import { ToastProvider } from './context/ToastContext.jsx';
import { ReportGenerationProvider } from './context/ReportGenerationContext.jsx';

/* ── Lazy-load pages ───────────────────────────────────────────────────────── */
// Each page is its own chunk, so the landing page does not download the dashboard's charts
const DashboardPage = lazy(() => import('./pages/DashboardPage.jsx'));
const ReportsPage = lazy(() => import('./pages/ReportsPage.jsx'));
const DataSourcesPage = lazy(() => import('./pages/DataSourcesPage.jsx'));
const WhatIfPage = lazy(() => import('./pages/WhatIfPage.jsx'));
const AccountPage = lazy(() => import('./pages/AccountPage.jsx'));
const SettingsPage = lazy(() => import('./pages/SettingsPage.jsx'));
const Login = lazy(() => import('./pages/Login.jsx'));
const Register = lazy(() => import('./pages/Register.jsx'));
const PublicReport = lazy(() => import('./pages/PublicReport.jsx'));
const ApiDocs = lazy(() => import('./pages/ApiDocs.jsx'));
const LandingPage = lazy(() => import('./pages/LandingPage.jsx'));
const Privacy = lazy(() => import('./pages/Privacy.jsx'));
const Terms = lazy(() => import('./pages/Terms.jsx'));

const PageFallback = () => <div className="min-h-[40vh]" />;
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';

/* ── Utility ───────────────────────────────────────────────────────────────── */
const cn = (...classes) => classes.filter(Boolean).join(' ');

/* ── Navigation items ──────────────────────────────────────────────────────── */
const NAV_ITEMS = [
 { id: 'dashboard', tKey: 'nav.dashboard', icon: LayoutDashboard },
 { id: 'reports', tKey: 'nav.reports', icon: FileText },
 { id: 'data-sources', tKey: 'nav.dataSources', icon: Database },
 { id: 'simulator', tKey: 'nav.simulator', icon: BarChart2 },
 { id: 'account', tKey: 'nav.account', icon: User },
 { id: 'settings', tKey: 'nav.settings', icon: Settings },
];

/* ── Page map ──────────────────────────────────────────────────────────────── */
const PAGES = {
 dashboard: DashboardPage,
 reports: ReportsPage,
 'data-sources': DataSourcesPage,
 simulator: WhatIfPage,
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
 const { t } = useTranslation();
 const [userProfile, setUserProfile] = useState(null);

 useEffect(() => {
   const density = localStorage.getItem('solvai_density');
   if (density === 'Compact') {
     document.documentElement.classList.add('sidebar-dense');
   }
 }, []);

 useEffect(() => {
   usersApi.me().then(res => {
     setUserProfile(res.data);
     try { localStorage.setItem('solvai_user', JSON.stringify(res.data)); } catch (e) { /* ignore */ }
   }).catch(() => {
     localStorage.removeItem('solvai_token');
     localStorage.removeItem('solvai_user');
     navigate('/login', { replace: true });
   });
 }, []);

 // The Account page announces plan changes (promo code, PayPal) so the badge stays current
 useEffect(() => {
   const refreshPlan = () => usersApi.me().then(res => setUserProfile(res.data)).catch(() => {});
   window.addEventListener('solvai:plan-changed', refreshPlan);
   return () => window.removeEventListener('solvai:plan-changed', refreshPlan);
 }, []);

 const handleLogout = () => {
   localStorage.removeItem('solvai_token');
   localStorage.removeItem('solvai_user');
   navigate('/login');
 };
 
 const email = userProfile?.email ?? 'Loading...';
 const plan = userProfile?.organization?.plan ?? userProfile?.plan ?? 'free';
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
 <p className="text-xs text-muted truncate">{plan} plan</p>
 </div>
 </div>
 
 <button onClick={handleLogout} className="w-full flex items-center gap-3 px-3 h-9 rounded-lg text-sm transition-colors duration-150 font-medium text-secondary hover:bg-page hover:text-primary mt-1">
   <User className="w-[18px] h-[18px] flex-shrink-0" />
   <span className="flex-1 text-left">{t('nav.logout')}</span>
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

function PublicRoute({ children }) {
  const token = localStorage.getItem('solvai_token');
  if (token) {
    return <Navigate to="/dashboard" replace />;
  }
  return children;
}

export default function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <ReportGenerationProvider>
          <Suspense fallback={<PageFallback />}>
          <Routes>
            <Route path="/" element={<PublicRoute><LandingPage /></PublicRoute>} />
            <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
            <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/r/:token" element={<PublicReport />} />
            <Route path="/*" element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            } />
          </Routes>
          </Suspense>
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
 <Suspense fallback={<PageFallback />}>
 <PageComponent key={activePage} onNavigate={(id) => navigate(`/${id}`)} />
 </Suspense>
 </div>
 </div>
 </main>
 </div>
 );
}
