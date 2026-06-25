import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import Sidebar from '../components/Sidebar.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import SolvencyGauge from '../components/SolvencyGauge.jsx';
import LoadingSpinner from '../components/LoadingSpinner.jsx';
import IntelligenceTerminal from '../components/IntelligenceTerminal.jsx';
import { solvencyReports } from '../api/client.js';
import { IconSparkle, IconWarning } from '../components/Icons.jsx';

/* ── Helpers ─────────────────────────────────────────────────────────────── */
const formatDate = (iso) => {
  if (!iso) return '—';
  try {
    return new Intl.DateTimeFormat('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    }).format(new Date(iso));
  } catch { return iso; }
};

const shortId = (id) => {
  if (!id) return '—';
  return id.split('-')[0]?.toUpperCase() ?? id.slice(0, 8).toUpperCase();
};

const scoreFromReport = (report) => {
  if (!report) return null;
  return report.solvency_score
    ?? report.report_data?.solvency_score
    ?? report.report_data?.overall_score
    ?? null;
};

/* ── Summary Card ─────────────────────────────────────────────────────────── */
function LatestReportCard({ report, onGenerate, generating }) {
  const score = scoreFromReport(report);

  if (!report) {
    return (
      <div className="db-summary-card card-glass">
        <div className="db-empty-hero">
          <div className="db-empty-hero__icon"><IconSparkle size={48} /></div>
          <h2 className="db-empty-hero__title">No reports yet</h2>
          <p className="db-empty-hero__desc">
            Self-serve explainable credit AI that traces every score factor to your real transactions.
          </p>
          <button
            id="gen-report-empty"
            className="btn-primary"
            onClick={onGenerate}
            disabled={generating}
          >
            {generating ? (
              <><LoadingSpinner size={16} inline /> Generating…</>
            ) : (
              'Generate Your First Report'
            )}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="db-summary-card card-glass animate-fadeIn">
      <div className="db-summary-card__label">Latest Report</div>
      <div className="db-summary-card__inner">
        {/* Gauge */}
        <div className="db-summary-card__gauge">
          {score !== null ? (
            <SolvencyGauge score={score} size={120} showLabel={true} />
          ) : (
            <div className="db-summary-card__no-score">
              <LoadingSpinner size={48} />
              <span>Calculating…</span>
            </div>
          )}
        </div>

        {/* Info */}
        <div className="db-summary-card__info">
          <div className="db-summary-card__row">
            <span className="db-summary-card__key">Report ID</span>
            <span className="db-summary-card__val mono">{shortId(report.id)}</span>
          </div>
          <div className="db-summary-card__row">
            <span className="db-summary-card__key">Status</span>
            <StatusBadge status={report.status} />
          </div>
          <div className="db-summary-card__row">
            <span className="db-summary-card__key">Generated</span>
            <span className="db-summary-card__val">{formatDate(report.generated_at ?? report.created_at)}</span>
          </div>
          {score !== null && (
            <div className="db-summary-card__row">
              <span className="db-summary-card__key">Score</span>
              <span className="db-summary-card__val" style={{ color: 'var(--color-accent-primary)', fontFamily: 'var(--font-data)', fontWeight: 700 }}>
                {score} / 100
              </span>
            </div>
          )}
        </div>

        {/* CTA */}
        <div className="db-summary-card__cta">
          <Link to={`/reports/${report.id}`} className="btn-primary btn-sm">
            View Report →
          </Link>
        </div>
      </div>
    </div>
  );
}

/* ── Reports Table ───────────────────────────────────────────────────────── */
function ReportsTable({ reports }) {
  const navigate = useNavigate();

  if (reports.length === 0) return null;

  return (
    <div className="db-table-wrap card">
      <div className="db-table-header">
        <h3 className="db-table-title">All Reports</h3>
        <span className="db-table-count">{reports.length} report{reports.length !== 1 ? 's' : ''}</span>
      </div>
      <div className="db-table-container">
        <table className="db-table">
          <thead>
            <tr>
              <th>Report ID</th>
              <th>Status</th>
              <th>Created</th>
              <th>Score</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {reports.map((r) => {
              const score = scoreFromReport(r);
              return (
                <tr
                  key={r.id}
                  className="db-table__row"
                  onClick={() => navigate(`/reports/${r.id}`)}
                  style={{ cursor: 'pointer' }}
                >
                  <td>
                    <span className="mono db-table__id">#{shortId(r.id)}</span>
                    <span className="db-table__full-id mono">{r.id}</span>
                  </td>
                  <td><StatusBadge status={r.status} /></td>
                  <td className="db-table__date">{formatDate(r.created_at)}</td>
                  <td>
                    {score !== null ? (
                      <span
                        className="mono"
                        style={{
                          fontWeight: 700,
                          color: score >= 70 ? 'var(--color-accent-primary)'
                            : score >= 40 ? 'var(--color-status-warning)'
                            : 'var(--color-status-error)',
                        }}
                      >
                        {score}
                      </span>
                    ) : (
                      <span style={{ color: 'var(--color-text-disabled)' }}>—</span>
                    )}
                  </td>
                  <td>
                    <button
                      className="btn-ghost btn-sm"
                      onClick={(e) => { e.stopPropagation(); navigate(`/reports/${r.id}`); }}
                    >
                      View →
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ── Dashboard Page ──────────────────────────────────────────────────────── */
export default function Dashboard() {
  const [reports,    setReports]    = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState('');
  const [generating, setGenerating] = useState(false);
  const [genError,   setGenError]   = useState('');

  const fetchReports = useCallback(async () => {
    try {
      const res = await solvencyReports.list();
      const data = Array.isArray(res.data) ? res.data : (res.data?.items ?? []);
      // Sort newest first
      data.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      setReports(data);
    } catch (err) {
      setError(err?.response?.data?.detail ?? err?.message ?? 'Failed to load reports.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const handleGenerate = async () => {
    setGenError('');
    setGenerating(true);
    try {
      await solvencyReports.create();
      await fetchReports();
    } catch (err) {
      setGenError(err?.response?.data?.detail ?? err?.message ?? 'Failed to generate report.');
    } finally {
      setGenerating(false);
    }
  };

  const latestReport = reports[0] ?? null;

  return (
    <div className="page-layout">
      <Sidebar />

      <main className="page-content">
        <div className="content-area">
          {/* ── Page Header ── */}
          <div className="section-header">
            <div>
              <h1 className="section-title">Dashboard</h1>
              <p className="section-subtitle">Your financial health overview at a glance.</p>
            </div>
            <button
              id="gen-report-btn"
              className="btn-primary"
              onClick={handleGenerate}
              disabled={generating || loading}
            >
              {generating ? (
                <><LoadingSpinner size={16} inline /> Generating…</>
              ) : (
                'Generate New Report'
              )}
            </button>
          </div>

          {genError && (
            <div className="error-message" style={{ marginBottom: 'var(--space-4)' }}>
              <span><IconWarning size={16} /></span> {genError}
            </div>
          )}

          {/* ── Loading State ── */}
          {loading ? (
            <LoadingSpinner text="Loading your reports…" />
          ) : error ? (
            <div className="error-message">
              <span><IconWarning size={16} /></span> {error}
            </div>
          ) : (
            <>
              {/* ── Summary Card ── */}
              <LatestReportCard
                report={latestReport}
                onGenerate={handleGenerate}
                generating={generating}
              />

              {/* ── Intelligence Terminal ── */}
              {generating && (
                <IntelligenceTerminal />
              )}

              {/* ── Quick Actions ── */}
              {reports.length > 0 && (
                <div className="db-quick-actions" style={{ marginTop: 'var(--space-6)' }}>
                  <div className="db-quick-actions__row">
                    <div className="db-quick-action card">
                      <h3 className="db-quick-action__title">All Reports</h3>
                      <p className="db-quick-action__desc">
                        {reports.length} report{reports.length !== 1 ? 's' : ''} generated
                      </p>
                      <Link to="/reports" className="btn-ghost btn-sm">
                        View all reports →
                      </Link>
                    </div>
                    <div className="db-quick-action card">
                      <h3 className="db-quick-action__title">Data Sources</h3>
                      <p className="db-quick-action__desc">
                        Manage your connected platforms
                      </p>
                      <Link to="/data-sources" className="btn-ghost btn-sm">
                        Manage sources →
                      </Link>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </main>

      <style>{`
        /* ── Summary Card ── */
        .db-summary-card {
          padding: var(--space-6);
          margin-bottom: 0;
        }
        .db-summary-card__label {
          font-size: var(--text-xs);
          color: var(--color-text-secondary);
          text-transform: uppercase;
          letter-spacing: 0.08em;
          font-weight: 600;
          margin-bottom: var(--space-5);
        }
        .db-summary-card__inner {
          display: flex;
          align-items: center;
          gap: var(--space-8);
          flex-wrap: wrap;
        }
        .db-summary-card__gauge {
          flex-shrink: 0;
        }
        .db-summary-card__no-score {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          color: var(--color-text-secondary);
          font-size: var(--text-sm);
          width: 120px;
          height: 120px;
          justify-content: center;
        }
        .db-summary-card__info {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: var(--space-3);
          min-width: 200px;
        }
        .db-summary-card__row {
          display: flex;
          align-items: center;
          gap: var(--space-4);
        }
        .db-summary-card__key {
          font-size: var(--text-sm);
          color: var(--color-text-secondary);
          min-width: 90px;
        }
        .db-summary-card__val {
          font-size: var(--text-md);
          color: var(--color-text-primary);
          font-weight: 500;
        }
        .db-summary-card__cta {
          margin-left: auto;
        }

        /* ── Empty Hero ── */
        .db-empty-hero {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          gap: var(--space-4);
          padding: var(--space-10) var(--space-8);
        }
        .db-empty-hero__icon {
          font-size: 48px;
          line-height: 1;
          color: var(--color-accent-primary);
        }
        .db-empty-hero__title {
          font-size: var(--text-2xl);
          font-weight: 700;
          letter-spacing: -0.03em;
        }
        .db-empty-hero__desc {
          font-size: var(--text-md);
          color: var(--color-text-secondary);
          max-width: 380px;
          line-height: 1.7;
        }

        /* ── Table ── */
        .db-table-wrap {
          overflow: hidden;
        }
        .db-table-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: var(--space-5);
        }
        .db-table-title {
          font-size: var(--text-lg);
          font-weight: 600;
        }
        .db-table-count {
          font-size: var(--text-sm);
          color: var(--color-text-secondary);
          background: var(--color-surface-elevated);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-full);
          padding: 2px 10px;
        }
        .db-table-container {
          overflow-x: auto;
          margin: 0 calc(-1 * var(--space-6));
          padding: 0 var(--space-6);
        }
        .db-table {
          width: 100%;
          border-collapse: collapse;
          font-size: var(--text-md);
        }
        .db-table thead th {
          text-align: left;
          padding: 8px 12px;
          font-size: var(--text-xs);
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.07em;
          color: var(--color-text-secondary);
          border-bottom: 1px solid var(--color-border);
          white-space: nowrap;
        }
        .db-table tbody td {
          padding: 12px 12px;
          border-bottom: 1px solid var(--color-border-subtle);
          color: var(--color-text-primary);
          vertical-align: middle;
        }
        .db-table__row:hover td {
          background: rgba(255,255,255,0.02);
        }
        .db-table__row:last-child td {
          border-bottom: none;
        }
        .db-table__id {
          font-weight: 600;
          color: var(--color-accent-primary);
          font-size: var(--text-sm);
        }
        .db-table__full-id {
          display: block;
          font-size: 10px;
          color: var(--color-text-disabled);
          margin-top: 2px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          max-width: 160px;
        }
        .db-table__date {
          color: var(--color-text-secondary);
          font-size: var(--text-sm);
          white-space: nowrap;
        }

        /* ── Quick Actions ── */
        .db-quick-actions__row {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
          gap: var(--space-4);
        }
        .db-quick-action {
          display: flex;
          flex-direction: column;
          gap: var(--space-2);
        }
        .db-quick-action__title {
          font-size: var(--text-md);
          font-weight: 600;
        }
        .db-quick-action__desc {
          font-size: var(--text-sm);
          color: var(--color-text-secondary);
          margin-bottom: var(--space-2);
        }
      `}</style>
    </div>
  );
}
