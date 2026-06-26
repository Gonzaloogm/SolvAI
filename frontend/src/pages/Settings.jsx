import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar.jsx';

export default function Settings() {
  const navigate = useNavigate();
  const token = localStorage.getItem('solvai_token');
  
  const [theme, setTheme] = useState(localStorage.getItem('solvai_theme') || 'dark');

  useEffect(() => {
    if (!token) {
      navigate('/login');
    }
  }, [token, navigate]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('solvai_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  return (
    <div className="page-layout">
      <Sidebar />
      <main className="page-content" style={{ padding: 'var(--space-12) var(--space-8)' }}>
        <div className="settings-container" style={{ maxWidth: '800px', margin: '0 auto' }}>
          <header className="settings-header" style={{ marginBottom: 'var(--space-8)' }}>
            <h1 className="settings-title" style={{ fontSize: '32px', fontWeight: '800', marginBottom: 'var(--space-2)' }}>Settings</h1>
            <p className="settings-subtitle" style={{ color: 'var(--color-text-secondary)' }}>Manage your application preferences and appearance.</p>
          </header>

          <div className="settings-section">
            <div className="settings-card card">
              <div className="settings-card__header" style={{ padding: 'var(--space-6)', borderBottom: '1px solid var(--color-border)' }}>
                <h2 className="settings-card__title" style={{ fontSize: '20px', fontWeight: '700', marginBottom: '4px' }}>Appearance</h2>
                <p className="settings-card__desc" style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--text-sm)' }}>Customize the look and feel of SolvAI.</p>
              </div>
              <div className="settings-card__body" style={{ padding: 'var(--space-6)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '4px' }}>Interface Theme</h3>
                  <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--text-sm)' }}>Switch between Light and Dark mode.</p>
                </div>
                <button 
                  onClick={toggleTheme}
                  className="btn-secondary"
                  style={{ padding: '8px 16px', borderRadius: 'var(--radius-md)' }}
                >
                  {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
