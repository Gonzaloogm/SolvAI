import React, { useState } from 'react';
import {
 LayoutGrid,
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

/* ── Lazy-load pages ───────────────────────────────────────────────────────── */
import DashboardPage from './pages/DashboardPage.jsx';
import ReportsPage from './pages/ReportsPage.jsx';
import DataSourcesPage from './pages/DataSourcesPage.jsx';
import DemoComparisonPage from './pages/DemoComparisonPage.jsx';
import AccountPage from './pages/AccountPage.jsx';
import SettingsPage from './pages/SettingsPage.jsx';

/* ── Utility ───────────────────────────────────────────────────────────────── */
const cn = (...classes) => classes.filter(Boolean).join(' ');

/* ── Navigation items ──────────────────────────────────────────────────────── */
const NAV_ITEMS = [
 { id: 'dashboard', label: 'Dashboard', icon: LayoutGrid },
 { id: 'reports', label: 'Reports', icon: FileText },
 { id: 'data-sources', label: 'Data Sources', icon: Database },
 { id: 'demo', label: 'Demo Comparison', icon: BarChart2 },
 { id: 'account', label: 'Account', icon: User },
 { id: 'settings', label: 'Settings', icon: Settings },
];

/* ── Page map ──────────────────────────────────────────────────────────────── */
const PAGES = {
 dashboard: DashboardPage,
 reports: ReportsPage,
 'data-sources': DataSourcesPage,
 demo: DemoComparisonPage,
 account: AccountPage,
 settings: SettingsPage,
};

/* ══════════════════════════════════════════════════════════════════════════════
 Sidebar Component
 ══════════════════════════════════════════════════════════════════════════════ */
function Sidebar({ activePage, onNavigate, mobileOpen, onClose }) {
 const { actualTheme, toggleTheme } = useTheme();

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
 <div className="px-5 h-16 flex items-center justify-between border-b border-border">
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
 'w-full flex items-center gap-3 px-3 h-9 rounded-lg text-sm font-medium transition-colors duration-150',
 isActive && 'bg-nav-active text-nav-active',
 !isActive && !isDisabled && 'text-secondary hover:bg-page hover:text-primary ',
 isDisabled && 'text-[#d0d5dd] cursor-not-allowed'
 )}
 >
 <Icon className="w-[18px] h-[18px] flex-shrink-0" />
 <span className="flex-1 text-left">{item.label}</span>
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
 <div className="border-t border-border p-3 flex flex-col gap-2">


 <div className="flex items-center gap-3 px-3 py-2">
 <div className="w-8 h-8 rounded-full bg-[#0570de] flex items-center justify-center text-white text-xs font-semibold flex-shrink-0">
 SA
 </div>
 <div className="flex-1 min-w-0">
 <p className="text-sm font-medium text-primary truncate">
 demo@solvai.com
 </p>
 <p className="text-xs text-muted truncate">Free plan</p>
 </div>
 </div>
 </div>
 </aside>
 </>
 );
}

/* ══════════════════════════════════════════════════════════════════════════════
 App Component
 ══════════════════════════════════════════════════════════════════════════════ */
export default function App() {
 const [activePage, setActivePage] = useState('dashboard');
 const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

 const PageComponent = PAGES[activePage] || DashboardPage;

 return (
 <ThemeProvider>
 <ToastProvider>
 <div className="min-h-screen bg-page transition-colors duration-200">
 {/* Sidebar */}
 <Sidebar
 activePage={activePage}
 onNavigate={setActivePage}
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
 <PageComponent key={activePage} onNavigate={setActivePage} />
 </div>
 </div>
 </main>
 </div>
 </ToastProvider>
 </ThemeProvider>
 );
}
