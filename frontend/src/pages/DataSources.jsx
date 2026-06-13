import React, { useState, useEffect, useCallback } from 'react';
import Sidebar from '../components/Sidebar.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import LoadingSpinner from '../components/LoadingSpinner.jsx';
import { dataSources } from '../api/client.js';

/* ── Source Config ───────────────────────────────────────────────────────── */
const SOURCE_TYPES = [
  {
    id: 'stripe',
    label: 'Stripe',
    icon: '⚡',
    description: 'Connect your Stripe account to share payment volume and transaction data.',
    inputLabel: 'Stripe API Key',
    inputPlaceholder: 'sk_live_…',
    fieldName: 'api_key',
    color: '#635bff',
  },
  {
    id: 'xero',
    label: 'Xero',
    icon: '📊',
    description: 'Share invoicing, expenses, and balance sheet data from Xero.',
    inputLabel: 'Xero Client ID',
    inputPlaceholder: 'Enter Xero client ID',
    fieldName: 'client_id',
    color: '#00b0e0',
  },
  {
    id: 'paypal',
    label: 'PayPal',
    icon: '💳',
    description: 'Connect PayPal to analyse transaction history and cash flow.',
    inputLabel: 'PayPal API Key',
    inputPlaceholder: 'Enter PayPal API key',
    fieldName: 'api_key',
    color: '#009cde',
  },
  {
    id: 'manual',
    label: 'Manual Upload',
    icon: '📁',
    description: 'Upload bank statements or invoices directly (PDF, CSV, XLSX).',
    inputLabel: 'File',
    inputPlaceholder: null,  // file input
    fieldName: 'filename',
    color: '#71717a',
  },
];

const SOURCE_ICONS = {
  stripe: '⚡',
  xero: '📊',
  paypal: '💳',
  manual: '📁',
};

/* ── Connect Modal ───────────────────────────────────────────────────────── */
function ConnectModal({ onClose, onSuccess }) {
  const [step,     setStep]     = useState('pick');    // 'pick' | 'form'
  const [selected, setSelected] = useState(null);
  const [value,    setValue]    = useState('');
  const [file,     setFile]     = useState(null);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');

  const handleSelectSource = (src) => {
    setSelected(src);
    setStep('form');
    setValue('');
    setFile(null);
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const connectionDetails = {};
    if (selected.id === 'manual') {
      if (!file) { setError('Please select a file.'); return; }
      connectionDetails[selected.fieldName] = file.name;
    } else {
      if (!value.trim()) { setError(`Please enter your ${selected.inputLabel}.`); return; }
      connectionDetails[selected.fieldName] = value.trim();
    }

    setLoading(true);
    try {
      await dataSources.connect(selected.id, connectionDetails);
      onSuccess();
    } catch (err) {
      setError(err?.response?.data?.detail ?? err?.message ?? 'Failed to connect source.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal ds-modal animate-slideUp">
        <div className="modal-header">
          {step === 'form' ? (
            <button className="btn-ghost" style={{ padding: '4px 8px', marginRight: 'auto' }} onClick={() => setStep('pick')}>
              ← Back
            </button>
          ) : (
            <h2 className="modal-title">Connect Data Source</h2>
          )}
          <button className="btn-ghost ds-modal__close" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        {/* ── Step 1: Pick source ── */}
        {step === 'pick' && (
          <div>
            <p className="ds-modal__subtitle">Choose a source to connect to your SolvAI profile</p>
            <div className="ds-source-grid">
              {SOURCE_TYPES.map((src) => (
                <button
                  key={src.id}
                  className="ds-source-option"
                  onClick={() => handleSelectSource(src)}
                  id={`connect-${src.id}`}
                >
                  <span className="ds-source-option__icon">{src.icon}</span>
                  <span className="ds-source-option__name">{src.label}</span>
                  <span className="ds-source-option__desc">{src.description}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Step 2: Connect form ── */}
        {step === 'form' && selected && (
          <form onSubmit={handleSubmit}>
            <div className="ds-form-header">
              <span className="ds-form-header__icon">{selected.icon}</span>
              <div>
                <div className="ds-form-header__name">{selected.label}</div>
                <div className="ds-form-header__desc">{selected.description}</div>
              </div>
            </div>

            {error && (
              <div className="error-message" style={{ margin: 'var(--space-4) 0' }}>
                <span>⚠</span> {error}
              </div>
            )}

            <div className="form-group" style={{ margin: 'var(--space-5) 0' }}>
              <label className="label" htmlFor="ds-input">
                {selected.inputLabel}
              </label>
              {selected.id === 'manual' ? (
                <div className="ds-file-drop">
                  <input
                    id="ds-input"
                    type="file"
                    accept=".pdf,.csv,.xlsx,.xls"
                    onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                    style={{ display: 'none' }}
                  />
                  <label htmlFor="ds-input" className="ds-file-drop__label">
                    <span className="ds-file-drop__icon">📂</span>
                    <span className="ds-file-drop__text">
                      {file ? file.name : 'Click to select file (PDF, CSV, XLSX)'}
                    </span>
                  </label>
                </div>
              ) : (
                <input
                  id="ds-input"
                  className="input"
                  type="text"
                  placeholder={selected.inputPlaceholder}
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  autoFocus
                />
              )}
            </div>

            <div className="ds-form-actions">
              <button type="button" className="btn-secondary" onClick={() => setStep('pick')}>
                Cancel
              </button>
              <button
                type="submit"
                id={`connect-${selected.id}-submit`}
                className="btn-primary"
                disabled={loading}
              >
                {loading ? (
                  <><LoadingSpinner size={16} inline /> Connecting…</>
                ) : (
                  `Connect ${selected.label}`
                )}
              </button>
            </div>
          </form>
        )}
      </div>

      <style>{`
        .ds-modal { max-width: 520px; }
        .ds-modal__close { margin-left: auto; }
        .ds-modal__subtitle {
          font-size: var(--text-md);
          color: var(--color-text-secondary);
          margin-bottom: var(--space-5);
        }

        .ds-source-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: var(--space-3);
        }
        .ds-source-option {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          gap: var(--space-2);
          padding: var(--space-4);
          background: var(--color-surface);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-lg);
          cursor: pointer;
          text-align: left;
          transition: all var(--transition-normal);
        }
        .ds-source-option:hover {
          border-color: rgba(0,240,255,0.3);
          background: rgba(0,240,255,0.04);
          box-shadow: var(--glow-cyan-sm);
          transform: translateY(-1px);
        }
        .ds-source-option__icon { font-size: 28px; line-height: 1; }
        .ds-source-option__name { font-size: var(--text-md); font-weight: 600; color: var(--color-text-primary); }
        .ds-source-option__desc { font-size: var(--text-xs); color: var(--color-text-secondary); line-height: 1.5; }

        .ds-form-header {
          display: flex;
          align-items: flex-start;
          gap: var(--space-3);
          padding: var(--space-4);
          background: var(--color-surface);
          border-radius: var(--radius-md);
          border: 1px solid var(--color-border);
        }
        .ds-form-header__icon { font-size: 28px; flex-shrink: 0; }
        .ds-form-header__name { font-size: var(--text-md); font-weight: 600; }
        .ds-form-header__desc { font-size: var(--text-sm); color: var(--color-text-secondary); margin-top: 2px; }

        .ds-file-drop {
          border: 2px dashed var(--color-border);
          border-radius: var(--radius-md);
          transition: border-color var(--transition-normal);
        }
        .ds-file-drop:hover { border-color: rgba(0,240,255,0.3); }
        .ds-file-drop__label {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: var(--space-2);
          padding: var(--space-6);
          cursor: pointer;
          text-align: center;
        }
        .ds-file-drop__icon { font-size: 32px; }
        .ds-file-drop__text { font-size: var(--text-md); color: var(--color-text-secondary); }

        .ds-form-actions {
          display: flex;
          justify-content: flex-end;
          gap: var(--space-3);
          margin-top: var(--space-5);
        }
      `}</style>
    </div>
  );
}

/* ── Source List Item ────────────────────────────────────────────────────── */
function SourceItem({ source, onDisconnect }) {
  const icon = SOURCE_ICONS[source.source_type?.toLowerCase()] ?? '🔌';
  const formatDate = (iso) => {
    if (!iso) return '—';
    try {
      return new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(iso));
    } catch { return iso; }
  };

  return (
    <div className="ds-source-item animate-slideUp">
      <div className="ds-source-item__icon-wrap">
        <span className="ds-source-item__icon">{icon}</span>
      </div>
      <div className="ds-source-item__info">
        <div className="ds-source-item__name">
          {source.source_type
            ? source.source_type.charAt(0).toUpperCase() + source.source_type.slice(1).toLowerCase()
            : 'Data Source'}
        </div>
        <div className="ds-source-item__meta">
          Connected {formatDate(source.connected_at ?? source.created_at)}
        </div>
      </div>
      <StatusBadge status={source.status ?? 'CONNECTED'} />
      <button
        className="btn-danger"
        onClick={() => onDisconnect(source.id)}
        aria-label={`Disconnect ${source.source_type}`}
      >
        Disconnect
      </button>

      <style>{`
        .ds-source-item {
          display: flex;
          align-items: center;
          gap: var(--space-4);
          padding: var(--space-4) var(--space-5);
          border-bottom: 1px solid var(--color-border-subtle);
          transition: background var(--transition-fast);
        }
        .ds-source-item:last-child { border-bottom: none; }
        .ds-source-item:hover { background: rgba(255,255,255,0.015); }
        .ds-source-item__icon-wrap {
          width: 42px; height: 42px;
          background: var(--color-surface-elevated);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-md);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 20px;
          flex-shrink: 0;
        }
        .ds-source-item__info { flex: 1; min-width: 0; }
        .ds-source-item__name {
          font-size: var(--text-md);
          font-weight: 600;
          color: var(--color-text-primary);
        }
        .ds-source-item__meta {
          font-size: var(--text-sm);
          color: var(--color-text-secondary);
          margin-top: 2px;
        }
      `}</style>
    </div>
  );
}

/* ── Data Sources Page ───────────────────────────────────────────────────── */
export default function DataSources() {
  const [sources,     setSources]     = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState('');
  const [showConnect, setShowConnect] = useState(false);

  const fetchSources = useCallback(async () => {
    try {
      const res  = await dataSources.list();
      const data = Array.isArray(res.data) ? res.data : (res.data?.items ?? []);
      setSources(data);
    } catch (err) {
      setError(err?.response?.data?.detail ?? err?.message ?? 'Failed to load data sources.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSources();
  }, [fetchSources]);

  const handleDisconnect = (id) => {
    // Soft-delete: hide from UI for MVP
    setSources((prev) => prev.filter((s) => s.id !== id));
  };

  const handleConnectSuccess = async () => {
    setShowConnect(false);
    setLoading(true);
    await fetchSources();
  };

  return (
    <div className="page-layout">
      <Sidebar />

      <main className="page-content">
        <div className="content-area">
          {/* ── Header ── */}
          <div className="section-header">
            <div>
              <h1 className="section-title">Data Sources</h1>
              <p className="section-subtitle">Connect financial accounts to power your solvency analysis</p>
            </div>
            <button
              id="connect-new-source-btn"
              className="btn-primary"
              onClick={() => setShowConnect(true)}
            >
              + Connect New Source
            </button>
          </div>

          {/* ── Loading ── */}
          {loading && <LoadingSpinner text="Loading data sources…" />}

          {/* ── Error ── */}
          {!loading && error && (
            <div className="error-message"><span>⚠</span> {error}</div>
          )}

          {/* ── Sources List ── */}
          {!loading && !error && (
            sources.length === 0 ? (
              /* ── Empty State ── */
              <div className="ds-empty card-glass">
                <div className="ds-empty__icon">🔌</div>
                <h2 className="ds-empty__title">No data sources connected</h2>
                <p className="ds-empty__desc">
                  Connect your financial accounts to enable AI-powered solvency analysis and lender matching.
                </p>
                <div className="ds-empty__sources">
                  {SOURCE_TYPES.map((s) => (
                    <div key={s.id} className="ds-empty__source-chip">
                      <span>{s.icon}</span> {s.label}
                    </div>
                  ))}
                </div>
                <button
                  id="connect-first-source-btn"
                  className="btn-primary"
                  onClick={() => setShowConnect(true)}
                >
                  Connect Your First Source →
                </button>
              </div>
            ) : (
              <div className="ds-sources-wrap card">
                <div className="ds-sources-header">
                  <span className="ds-sources-title">Connected Sources</span>
                  <span className="db-table-count">{sources.length} connected</span>
                </div>
                <div className="ds-sources-list">
                  {sources.map((s) => (
                    <SourceItem key={s.id} source={s} onDisconnect={handleDisconnect} />
                  ))}
                </div>
              </div>
            )
          )}

          {/* ── Info Cards ── */}
          {!loading && (
            <div className="ds-info-grid" style={{ marginTop: 'var(--space-8)' }}>
              {[
                { icon: '🔒', title: 'Bank-grade security', desc: 'All credentials are encrypted at rest and never stored in plain text.' },
                { icon: '🤖', title: 'AI-powered analysis', desc: 'Our AI analyses patterns across all connected sources for a holistic score.' },
                { icon: '⚡', title: 'Real-time updates', desc: 'Connected sources are re-analysed automatically with each new report.' },
              ].map((card) => (
                <div key={card.title} className="ds-info-card card">
                  <div className="ds-info-card__icon">{card.icon}</div>
                  <div>
                    <div className="ds-info-card__title">{card.title}</div>
                    <div className="ds-info-card__desc">{card.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* ── Connect Modal ── */}
      {showConnect && (
        <ConnectModal
          onClose={() => setShowConnect(false)}
          onSuccess={handleConnectSuccess}
        />
      )}

      <style>{`
        /* ── Empty State ── */
        .ds-empty {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          gap: var(--space-5);
          padding: var(--space-12) var(--space-8);
        }
        .ds-empty__icon { font-size: 56px; line-height: 1; opacity: 0.5; }
        .ds-empty__title {
          font-size: var(--text-2xl);
          font-weight: 700;
          letter-spacing: -0.03em;
        }
        .ds-empty__desc {
          font-size: var(--text-md);
          color: var(--color-text-secondary);
          max-width: 420px;
          line-height: 1.7;
        }
        .ds-empty__sources {
          display: flex;
          gap: var(--space-3);
          flex-wrap: wrap;
          justify-content: center;
        }
        .ds-empty__source-chip {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 6px 14px;
          background: var(--color-surface-elevated);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-full);
          font-size: var(--text-sm);
          color: var(--color-text-secondary);
        }

        /* ── Sources List ── */
        .ds-sources-wrap { padding: 0; overflow: hidden; }
        .ds-sources-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: var(--space-5) var(--space-5);
          border-bottom: 1px solid var(--color-border);
        }
        .ds-sources-title { font-size: var(--text-lg); font-weight: 600; }
        .ds-sources-list { }

        /* ── Info Grid ── */
        .ds-info-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: var(--space-4);
        }
        @media (max-width: 768px) {
          .ds-info-grid { grid-template-columns: 1fr; }
        }
        .ds-info-card {
          display: flex;
          align-items: flex-start;
          gap: var(--space-4);
          padding: var(--space-5);
        }
        .ds-info-card__icon { font-size: 28px; line-height: 1; flex-shrink: 0; }
        .ds-info-card__title { font-size: var(--text-md); font-weight: 600; margin-bottom: var(--space-1); }
        .ds-info-card__desc { font-size: var(--text-sm); color: var(--color-text-secondary); line-height: 1.5; }
      `}</style>
    </div>
  );
}
