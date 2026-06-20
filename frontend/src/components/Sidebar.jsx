import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';

/* ── Icon SVGs ──────────────────────────────────────────────────────────── */
const IconDashboard = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="7" height="7" rx="1.5"/>
    <rect x="14" y="3" width="7" height="7" rx="1.5"/>
    <rect x="3" y="14" width="7" height="7" rx="1.5"/>
    <rect x="14" y="14" width="7" height="7" rx="1.5"/>
  </svg>
);

const IconReports = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
    <polyline points="14 2 14 8 20 8"/>
    <line x1="16" y1="13" x2="8" y2="13"/>
    <line x1="16" y1="17" x2="8" y2="17"/>
    <line x1="10" y1="9" x2="8" y2="9"/>
  </svg>
);

const IconDataSources = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <ellipse cx="12" cy="5" rx="9" ry="3"/>
    <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/>
    <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/>
  </svg>
);

const IconSettings = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3"/>
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
  </svg>
);

const IconLogout = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
    <polyline points="16 17 21 12 16 7"/>
    <line x1="21" y1="12" x2="9" y2="12"/>
  </svg>
);

/* ── Helpers ─────────────────────────────────────────────────────────────── */
function getUserInfo() {
  try {
    const raw = localStorage.getItem('solvai_user');
    if (raw) return JSON.parse(raw);

    // Fall back: decode JWT payload
    const token = localStorage.getItem('solvai_token');
    if (!token) return null;
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload;
  } catch {
    return null;
  }
}

/* ── Navigation items ────────────────────────────────────────────────────── */
const NAV_ITEMS = [
  { label: 'Dashboard',    to: '/',             icon: <IconDashboard />,   exact: true  },
  { label: 'Reports',      to: '/reports',      icon: <IconReports />,     exact: false },
  { label: 'Data Sources', to: '/data-sources', icon: <IconDataSources />, exact: false },
  { label: 'Demo Comparison', to: '/demo',      icon: <IconDashboard />,   exact: false },
  { label: 'Settings',     to: '/settings',     icon: <IconSettings />,    exact: false, disabled: true },
];

/* ── Component ───────────────────────────────────────────────────────────── */
export default function Sidebar() {
  const navigate  = useNavigate();
  const userInfo  = getUserInfo();

  const handleLogout = () => {
    localStorage.removeItem('solvai_token');
    localStorage.removeItem('solvai_user');
    navigate('/login', { replace: true });
  };

  const userEmail = userInfo?.email ?? userInfo?.sub ?? 'Account';
  const userInitial = userEmail.charAt(0).toUpperCase();

  return (
    <aside className="sidebar">
      {/* ── Logo ── */}
      <div className="sidebar__logo">
        <div className="sidebar__logo-mark">
          <span className="sidebar__logo-s">S</span>
        </div>
        <span className="sidebar__logo-text">
          SolvAI<span className="sidebar__logo-dot">.</span>
        </span>
      </div>

      {/* ── Nav ── */}
      <nav className="sidebar__nav" aria-label="Main navigation">
        <ul className="sidebar__nav-list">
          {NAV_ITEMS.map((item) => (
            <li key={item.label + item.to}>
              {item.disabled ? (
                <span className="sidebar__nav-item sidebar__nav-item--disabled">
                  <span className="sidebar__nav-icon">{item.icon}</span>
                  <span className="sidebar__nav-label">{item.label}</span>
                  <span className="sidebar__nav-soon">soon</span>
                </span>
              ) : (
                <NavLink
                  to={item.to}
                  end={item.exact}
                  className={({ isActive }) =>
                    `sidebar__nav-item${isActive ? ' sidebar__nav-item--active' : ''}`
                  }
                >
                  <span className="sidebar__nav-icon">{item.icon}</span>
                  <span className="sidebar__nav-label">{item.label}</span>
                </NavLink>
              )}
            </li>
          ))}
        </ul>
      </nav>

      {/* ── Bottom: user + logout ── */}
      <div className="sidebar__footer">
        <div className="sidebar__user">
          <div className="sidebar__avatar">{userInitial}</div>
          <div className="sidebar__user-info">
            <span className="sidebar__user-email" title={userEmail}>
              {userEmail}
            </span>
          </div>
        </div>
        <button
          className="sidebar__logout"
          onClick={handleLogout}
          title="Sign out"
          aria-label="Sign out"
        >
          <IconLogout />
        </button>
      </div>

      <style>{`
        .sidebar {
          width: var(--sidebar-width);
          min-width: var(--sidebar-width);
          height: 100vh;
          position: sticky;
          top: 0;
          display: flex;
          flex-direction: column;
          background: rgba(9,9,11,0.95);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border-right: 1px solid var(--color-border);
          z-index: 50;
          overflow: hidden;
        }

        /* ── Logo ── */
        .sidebar__logo {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 28px 20px 20px;
          border-bottom: 1px solid var(--color-border-subtle);
        }
        .sidebar__logo-mark {
          width: 32px;
          height: 32px;
          background: #ffffff;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 2px 4px rgba(0,0,0,0.3);
          flex-shrink: 0;
        }
        .sidebar__logo-s {
          font-family: var(--font-body);
          font-weight: 800;
          font-size: 16px;
          color: #000000;
          line-height: 1;
        }
        .sidebar__logo-text {
          font-size: 18px;
          font-weight: 700;
          color: var(--color-text-primary);
          letter-spacing: -0.03em;
        }
        .sidebar__logo-dot {
          color: var(--color-accent-primary);
        }

        /* ── Nav ── */
        .sidebar__nav {
          flex: 1;
          padding: var(--space-4) var(--space-3);
          overflow-y: auto;
        }
        .sidebar__nav-list {
          list-style: none;
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .sidebar__nav-item {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 9px 12px;
          border-radius: var(--radius-md);
          text-decoration: none;
          color: var(--color-text-secondary);
          font-size: var(--text-md);
          font-weight: 500;
          transition: all var(--transition-fast);
          border-left: 2px solid transparent;
          cursor: pointer;
        }
        .sidebar__nav-item:hover:not(.sidebar__nav-item--disabled) {
          background: rgba(255,255,255,0.04);
          color: var(--color-text-primary);
        }
        .sidebar__nav-item--active {
          background: var(--color-surface-elevated);
          color: var(--color-text-primary) !important;
          border-left-color: var(--color-text-primary);
        }
        .sidebar__nav-item--disabled {
          opacity: 0.35;
          cursor: not-allowed;
        }
        .sidebar__nav-icon {
          display: flex;
          align-items: center;
          flex-shrink: 0;
          opacity: 0.85;
        }
        .sidebar__nav-label {
          flex: 1;
        }
        .sidebar__nav-soon {
          font-size: var(--text-xs);
          background: var(--color-surface-elevated);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-sm);
          padding: 1px 5px;
          letter-spacing: 0.05em;
          color: var(--color-text-disabled);
        }

        /* ── Footer ── */
        .sidebar__footer {
          display: flex;
          align-items: center;
          gap: var(--space-2);
          padding: var(--space-4) var(--space-3);
          border-top: 1px solid var(--color-border-subtle);
        }
        .sidebar__user {
          display: flex;
          align-items: center;
          gap: 10px;
          flex: 1;
          min-width: 0;
        }
        .sidebar__avatar {
          width: 30px;
          height: 30px;
          background: var(--color-surface-elevated);
          border: 1px solid var(--color-border);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: var(--text-sm);
          font-weight: 600;
          color: var(--color-text-primary);
          flex-shrink: 0;
        }
        .sidebar__user-info {
          flex: 1;
          min-width: 0;
        }
        .sidebar__user-email {
          display: block;
          font-size: var(--text-sm);
          color: var(--color-text-secondary);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .sidebar__logout {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 30px;
          height: 30px;
          border: none;
          border-radius: var(--radius-sm);
          background: transparent;
          color: var(--color-text-disabled);
          cursor: pointer;
          transition: all var(--transition-fast);
          flex-shrink: 0;
        }
        .sidebar__logout:hover {
          background: rgba(239,68,68,0.1);
          color: var(--color-status-error);
        }
      `}</style>
    </aside>
  );
}
