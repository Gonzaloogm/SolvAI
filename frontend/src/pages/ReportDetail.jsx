import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import Sidebar from '../components/Sidebar.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import SolvencyGauge from '../components/SolvencyGauge.jsx';
import MetricCard from '../components/MetricCard.jsx';
import LoadingSpinner from '../components/LoadingSpinner.jsx';
import { IconWarning, IconSparkle, IconBuilding, IconSearch, IconLightning, IconUsers, IconLink, IconClipboard, IconActivity, IconBarChart, IconStar, IconTrendingUp } from '../components/Icons.jsx';
import { solvencyReports, lenderMatching } from '../api/client.js';

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

const TERMINAL_STATUSES = new Set(['COMPLETED', 'FAILED', 'ERROR']);
const POLL_INTERVAL_MS  = 3000;

/* ── Narrative Section ───────────────────────────────────────────────────── */
function NarrativeSection({ text }) {
  const [expanded, setExpanded] = useState(false);
  if (!text) return null;

  const preview = text.slice(0, 300);
  const showToggle = text.length > 300;

  return (
    <div className="rd-narrative card-glass">
      <div className="rd-narrative__header">
        <span className="rd-narrative__icon"><IconSparkle size={20} /></span>
        <h3 className="rd-narrative__title">AI Analysis Narrative</h3>
      </div>
      <div className={`rd-narrative__body ${expanded ? 'rd-narrative__body--expanded' : ''}`}>
        <pre className="rd-narrative__text">
          {expanded ? text : preview + (showToggle ? '…' : '')}
        </pre>
      </div>
      {showToggle && (
        <button
          className="btn-ghost"
          style={{ fontSize: 'var(--text-sm)', marginTop: 'var(--space-2)' }}
          onClick={() => setExpanded((v) => !v)}
        >
          {expanded ? '▲ Show less' : '▼ Read full analysis'}
        </button>
      )}
    </div>
  );
}

/* ── Data References ─────────────────────────────────────────────────────── */
function DataReferences({ refs }) {
  if (!refs || refs.length === 0) return null;
  return (
    <div className="rd-refs card">
      <h3 className="rd-refs__title">Data References</h3>
      <ul className="rd-refs__list">
        {refs.map((ref, i) => (
          <li key={i} className="rd-refs__item">
            <span className="rd-refs__dot" />
            <span className="rd-refs__text">{typeof ref === 'string' ? ref : JSON.stringify(ref)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ── Lender Card ─────────────────────────────────────────────────────────── */
function LenderCard({ lender }) {
  const typeIcon = {
    bank: <IconBuilding size={16} />,
    fintech: <IconLightning size={16} />,
    credit_union: <IconUsers size={16} />,
    p2p: <IconLink size={16} />,
    invoice: <IconClipboard size={16} />,
  }[lender.type?.toLowerCase()] ?? <IconBuilding size={16} />;

  return (
    <div className="rd-lender-card">
      <div className="rd-lender-card__header">
        <span className="rd-lender-card__icon">{typeIcon}</span>
        <div>
          <div className="rd-lender-card__name">{lender.name ?? 'Lender'}</div>
          <div className="rd-lender-card__type">{lender.type ?? 'Financial Institution'}</div>
        </div>
        <div className="rd-lender-card__match">
          {lender.match_score && (
            <span className="rd-lender-card__score">
              {Math.round(lender.match_score * 100)}% match
            </span>
          )}
        </div>
      </div>

      <div className="rd-lender-card__details">
        {lender.rate_range && (
          <div className="rd-lender-card__detail-row">
            <span className="rd-lender-card__detail-key">Rate</span>
            <span className="rd-lender-card__detail-val">{lender.rate_range}</span>
          </div>
        )}
        {lender.max_loan && (
          <div className="rd-lender-card__detail-row">
            <span className="rd-lender-card__detail-key">Max Loan</span>
            <span className="rd-lender-card__detail-val mono">{lender.max_loan}</span>
          </div>
        )}
        {lender.term && (
          <div className="rd-lender-card__detail-row">
            <span className="rd-lender-card__detail-key">Term</span>
            <span className="rd-lender-card__detail-val">{lender.term}</span>
          </div>
        )}
      </div>

      <a
        href={lender.apply_url ?? '#'}
        target="_blank"
        rel="noopener noreferrer"
        className="btn-primary btn-sm rd-lender-card__apply"
        style={{ display: 'block', textAlign: 'center' }}
      >
        Apply Now →
      </a>
    </div>
  );
}

/* ── Lender Matching Section ─────────────────────────────────────────────── */
function LenderSection({ reportId, reportStatus }) {
  const [lenders,  setLenders]  = useState(null);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');
  const [visible,  setVisible]  = useState(false);

  const handleFetch = async () => {
    setVisible(true);
    if (lenders !== null) return;
    setLoading(true);
    setError('');
    try {
      const res  = await lenderMatching.get(reportId);
      const data = res.data;
      setLenders(Array.isArray(data) ? data : (data?.matches ?? data?.lenders ?? []));
    } catch (err) {
      setError(err?.response?.data?.detail ?? 'Failed to load lender matches.');
    } finally {
      setLoading(false);
    }
  };

  if (reportStatus !== 'COMPLETED') return null;

  return (
    <div className="rd-lenders">
      {!visible ? (
        <div className="rd-lenders__cta">
          <div className="rd-lenders__cta-text">
            <h3>Find Financing Offers</h3>
            <p>Discover lenders matched to your solvency profile</p>
          </div>
          <button id="find-lenders-btn" className="btn-primary" onClick={handleFetch} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <IconBuilding size={16} /> Find Financing Offers
          </button>
        </div>
      ) : (
        <div>
          <h3 className="rd-lenders__title">Matched Lenders</h3>
          {loading && <LoadingSpinner text="Finding your best lender matches…" />}
          {error && <div className="error-message"><span><IconWarning size={16} /></span> {error}</div>}
          {lenders !== null && !loading && (
            lenders.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon"><IconSearch size={32} /></div>
                <p className="empty-state-title">No matches found</p>
                <p className="empty-state-description">Try generating a new report with more connected data sources.</p>
              </div>
            ) : (
              <div className="rd-lenders__grid">
                {lenders.map((l, i) => (
                  <LenderCard key={l.id ?? i} lender={l} />
                ))}
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
}

/* ── Generating State ────────────────────────────────────────────────────── */
function GeneratingState() {
  return (
    <div className="rd-generating">
      <div className="rd-generating__ring">
        <div className="rd-generating__spinner" />
      </div>
      <h2 className="rd-generating__title">Report generation in progress</h2>
      <p className="rd-generating__subtitle">
        Our AI is analysing your financial data. This usually takes 30–60 seconds.
      </p>
      <div className="rd-generating__steps">
        {['Collecting data sources', 'Analysing transactions', 'Computing solvency score', 'Generating narrative'].map((step, i) => (
          <div key={step} className="rd-generating__step">
            <div className="rd-generating__step-dot" style={{ animationDelay: `${i * 0.4}s` }} />
            <span>{step}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Main Page ───────────────────────────────────────────────────────────── */
export default function ReportDetail() {
  const { id }      = useParams();
  const navigate    = useNavigate();
  const pollRef     = useRef(null);

  const [report,   setReport]   = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState('');

  const fetchReport = useCallback(async () => {
    try {
      const res = await solvencyReports.get(id);
      setReport(res.data);

      // Stop polling once terminal status reached
      if (TERMINAL_STATUSES.has(res.data?.status?.toUpperCase())) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    } catch (err) {
      setError(err?.response?.data?.detail ?? err?.message ?? 'Failed to load report.');
      clearInterval(pollRef.current);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchReport();

    // Start polling for non-terminal statuses
    pollRef.current = setInterval(() => {
      fetchReport();
    }, POLL_INTERVAL_MS);

    return () => clearInterval(pollRef.current);
  }, [fetchReport]);

  // ── Derived report data ──────────────────────────────────────────────────
  const status       = report?.status?.toUpperCase() ?? '';
  const score        = report?.solvency_score ?? report?.report_data?.solvency_score ?? report?.report_data?.overall_score ?? null;
  const narrative    = report?.report_data?.narrative ?? report?.narrative ?? '';
  const dataRefs     = report?.report_data?.data_references ?? report?.data_references ?? [];
  const isGenerating = !TERMINAL_STATUSES.has(status) && status !== '';
  const isFailed     = status === 'FAILED' || status === 'ERROR';

  // Extract metrics from report_data
  const rd = report?.report_data ?? {};
  const metrics = [
    {
      title: 'Income Stability',
      score: rd.income_stability?.score ?? rd.income_stability_score ?? rd.metrics?.income_stability ?? 0,
      description: rd.income_stability?.description ?? rd.income_stability_description ?? 'Consistency of income streams over time',
      icon: <IconBarChart size={18} />,
    },
    {
      title: 'Growth Trend',
      score: rd.growth_trend?.score ?? rd.growth_trend_score ?? rd.metrics?.growth_trend ?? 0,
      description: rd.growth_trend?.description ?? rd.growth_trend_description ?? 'Revenue trajectory and business momentum',
      icon: <IconTrendingUp size={18} />,
    },
    {
      title: 'Seasonality',
      score: rd.seasonality?.score ?? rd.seasonality_score ?? rd.metrics?.seasonality ?? 0,
      description: rd.seasonality?.description ?? rd.seasonality_description ?? 'Variance in earnings across periods',
      icon: <IconActivity size={18} />,
    },
    {
      title: 'Reputation Signals',
      score: rd.reputation_signals?.score ?? rd.reputation_score ?? rd.metrics?.reputation ?? 0,
      description: rd.reputation_signals?.description ?? rd.reputation_description ?? 'Professional and market trust indicators',
      icon: <IconStar size={18} />,
    },
    {
      title: 'Client Concentration',
      score: rd.client_concentration?.score ?? rd.concentration_score ?? rd.metrics?.concentration ?? 0,
      description: rd.client_concentration?.description ?? rd.concentration_description ?? 'Revenue dependency on top clients',
      icon: <IconUsers size={18} />,
    },
  ];

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="page-layout">
      <Sidebar />

      <main className="page-content">
        <div className="content-area">
          {/* ── Back ── */}
          <button
            className="btn-ghost rd-back"
            onClick={() => navigate('/')}
            style={{ marginBottom: 'var(--space-5)' }}
          >
            ← Back to Dashboard
          </button>

          {/* ── Loading ── */}
          {loading && <LoadingSpinner text="Loading report…" />}

          {/* ── Error ── */}
          {!loading && error && (
            <div className="error-message">
              <span><IconWarning size={16} /></span> {error}
            </div>
          )}

          {/* ── Report Content ── */}
          {!loading && report && (
            <>
              {/* ── Header ── */}
              <div className="rd-header section-header" style={{ alignItems: 'flex-start', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
                <div>
                  <div className="rd-header__meta">
                    <StatusBadge status={report.status} />
                    <span className="mono rd-header__id">{report.id}</span>
                  </div>
                  <h1 className="rd-header__title">Solvency Report</h1>
                  <p className="rd-header__date">{formatDate(report.generated_at ?? report.created_at)}</p>
                </div>
                {status === 'COMPLETED' && (
                  <button 
                    className="btn-secondary" 
                    onClick={async () => {
                      try {
                        const token = localStorage.getItem('solvai_token');
                        const baseUrl = import.meta.env.VITE_API_BASE_URL || '';
                        const res = await fetch(`${baseUrl}/api/solvency-reports/${report.id}/pdf`, {
                          headers: { 'Authorization': `Bearer ${token}` }
                        });
                        if (!res.ok) throw new Error(`HTTP ${res.status}`);
                        const blob = await res.blob();
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `solvency_report_${report.id}.pdf`;
                        document.body.appendChild(a);
                        a.click();
                        a.remove();
                        URL.revokeObjectURL(url);
                      } catch (e) {
                        console.error('PDF download failed:', e);
                        alert('Failed to download PDF. Please try again.');
                      }
                    }}
                    style={{ display: 'flex', alignItems: 'center', gap: '8px', whiteSpace: 'nowrap' }}
                  >
                    <IconClipboard size={16} /> Download PDF
                  </button>
                )}
              </div>

              {/* ── Generating State ── */}
              {isGenerating && !isFailed && <GeneratingState />}

              {/* ── Failed State ── */}
              {isFailed && (
                <div className="rd-failed card">
                  <div className="rd-failed__icon"><IconWarning size={48} /></div>
                  <h2 className="rd-failed__title">Report generation failed</h2>
                  <p className="rd-failed__desc">
                    {report?.error_message ?? 'An error occurred while generating this report. Please connect more data sources and try again.'}
                  </p>
                  <Link to="/data-sources" className="btn-secondary btn-sm">
                    Manage Data Sources
                  </Link>
                </div>
              )}

              {/* ── Score Section (only for completed) ── */}
              {status === 'COMPLETED' && (
                <>
                  <div className="rd-score-section card-glass animate-fadeIn">
                    <div className="rd-score-section__gauge">
                      <SolvencyGauge score={score ?? 0} size={220} showLabel={true} />
                    </div>
                    <div className="rd-score-section__info">
                      <div className="rd-score-section__label">Overall Solvency Score</div>
                      <div className="rd-score-section__score" style={{
                        color: (score ?? 0) >= 70 ? 'var(--color-accent-primary)'
                          : (score ?? 0) >= 40 ? 'var(--color-status-warning)'
                          : 'var(--color-status-error)',
                      }}>
                        {score ?? '—'}
                        <span className="rd-score-section__max">/100</span>
                      </div>
                      <p className="rd-score-section__rating" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {(score ?? 0) >= 70 ? <><IconSparkle size={16} /> Strong solvency profile</>
                          : (score ?? 0) >= 40 ? <><IconTrendingUp size={16} /> Developing profile</>
                          : <><IconWarning size={16} /> Needs attention</>}
                      </p>
                      <p className="rd-score-section__date">
                        Generated {formatDate(report.generated_at)}
                      </p>
                    </div>
                  </div>

                  {/* ── Metrics Grid ── */}
                  <div style={{ marginTop: 'var(--space-6)' }}>
                    <h2 className="rd-section-title">Key Metrics</h2>
                    <div className="rd-metrics-grid">
                      {metrics.map((m) => (
                        <MetricCard key={m.title} {...m} />
                      ))}
                    </div>
                  </div>

                  {/* ── Narrative ── */}
                  <div style={{ marginTop: 'var(--space-6)' }}>
                    <NarrativeSection text={narrative} />
                  </div>

                  {/* ── Data References ── */}
                  {dataRefs.length > 0 && (
                    <div style={{ marginTop: 'var(--space-6)' }}>
                      <DataReferences refs={dataRefs} />
                    </div>
                  )}

                  {/* ── Lender Matching ── */}
                  <div style={{ marginTop: 'var(--space-6)' }}>
                    <LenderSection reportId={report.id} reportStatus={status} />
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </main>

      <style>{`
        /* ── Header ── */
        .rd-back {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          color: var(--color-text-secondary);
          font-size: var(--text-md);
        }
        .rd-header { margin-bottom: var(--space-6); }
        .rd-header__meta {
          display: flex;
          align-items: center;
          gap: var(--space-3);
          margin-bottom: var(--space-2);
          flex-wrap: wrap;
        }
        .rd-header__id {
          font-size: var(--text-xs);
          color: var(--color-text-disabled);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          max-width: 320px;
        }
        .rd-header__title {
          font-size: var(--text-3xl);
          font-weight: 700;
          letter-spacing: -0.04em;
        }
        .rd-header__date {
          font-size: var(--text-sm);
          color: var(--color-text-secondary);
          margin-top: var(--space-1);
        }

        /* ── Score Section ── */
        .rd-score-section {
          display: flex;
          align-items: center;
          gap: var(--space-10);
          padding: var(--space-8);
          flex-wrap: wrap;
        }
        .rd-score-section__gauge { flex-shrink: 0; }
        .rd-score-section__info { flex: 1; min-width: 200px; }
        .rd-score-section__label {
          font-size: var(--text-xs);
          color: var(--color-text-secondary);
          text-transform: uppercase;
          letter-spacing: 0.08em;
          font-weight: 600;
          margin-bottom: var(--space-2);
        }
        .rd-score-section__score {
          font-family: var(--font-data);
          font-size: var(--text-4xl);
          font-weight: 700;
          line-height: 1;
          letter-spacing: -2px;
        }
        .rd-score-section__max {
          font-size: var(--text-xl);
          opacity: 0.4;
          letter-spacing: 0;
        }
        .rd-score-section__rating {
          font-size: var(--text-lg);
          color: var(--color-text-secondary);
          margin-top: var(--space-3);
        }
        .rd-score-section__date {
          font-size: var(--text-sm);
          color: var(--color-text-tertiary);
          margin-top: var(--space-2);
        }

        /* ── Metrics Grid ── */
        .rd-section-title {
          font-size: var(--text-xl);
          font-weight: 600;
          margin-bottom: var(--space-4);
        }
        .rd-metrics-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: var(--space-4);
        }
        @media (max-width: 700px) {
          .rd-metrics-grid { grid-template-columns: 1fr; }
        }

        /* ── Narrative ── */
        .rd-narrative {
          padding: var(--space-6);
        }
        .rd-narrative__header {
          display: flex;
          align-items: center;
          gap: var(--space-3);
          margin-bottom: var(--space-4);
        }
        .rd-narrative__icon { font-size: 20px; }
        .rd-narrative__title { font-size: var(--text-lg); font-weight: 600; }
        .rd-narrative__text {
          font-family: var(--font-data);
          font-size: var(--text-sm);
          color: var(--color-text-secondary);
          line-height: 1.8;
          white-space: pre-wrap;
          word-break: break-word;
          max-height: 200px;
          overflow: hidden;
          transition: max-height 0.4s ease;
        }
        .rd-narrative__body--expanded .rd-narrative__text {
          max-height: 2000px;
        }

        /* ── Data Refs ── */
        .rd-refs { }
        .rd-refs__title {
          font-size: var(--text-lg);
          font-weight: 600;
          margin-bottom: var(--space-4);
        }
        .rd-refs__list {
          list-style: none;
          display: flex;
          flex-direction: column;
          gap: var(--space-2);
        }
        .rd-refs__item {
          display: flex;
          align-items: flex-start;
          gap: var(--space-3);
          font-size: var(--text-md);
          color: var(--color-text-secondary);
        }
        .rd-refs__dot {
          width: 6px; height: 6px;
          background: var(--color-accent-primary);
          border-radius: 50%;
          flex-shrink: 0;
          margin-top: 7px;
        }

        /* ── Generating ── */
        .rd-generating {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: var(--space-4);
          padding: var(--space-12) var(--space-8);
          text-align: center;
          animation: fadeIn 0.3s ease;
        }
        .rd-generating__ring {
          width: 80px; height: 80px;
          border: 2px solid var(--color-border);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .rd-generating__spinner {
          width: 60px; height: 60px;
          border: 3px solid rgba(0,240,255,0.1);
          border-top-color: var(--color-accent-primary);
          border-radius: 50%;
          animation: spin 1s linear infinite;
          box-shadow: 0 0 20px rgba(0,240,255,0.2);
        }
        .rd-generating__title {
          font-size: var(--text-2xl);
          font-weight: 700;
          letter-spacing: -0.03em;
        }
        .rd-generating__subtitle {
          font-size: var(--text-md);
          color: var(--color-text-secondary);
          max-width: 380px;
        }
        .rd-generating__steps {
          display: flex;
          flex-direction: column;
          gap: var(--space-2);
          margin-top: var(--space-2);
        }
        .rd-generating__step {
          display: flex;
          align-items: center;
          gap: var(--space-3);
          font-size: var(--text-sm);
          color: var(--color-text-secondary);
        }
        .rd-generating__step-dot {
          width: 6px; height: 6px;
          background: var(--color-accent-primary);
          border-radius: 50%;
          animation: badge-pulse-cyan 1.5s ease-in-out infinite;
          flex-shrink: 0;
        }

        /* ── Failed State ── */
        .rd-failed {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          gap: var(--space-4);
          padding: var(--space-10) var(--space-8);
          animation: fadeIn 0.3s ease;
        }
        .rd-failed__icon { font-size: 48px; }
        .rd-failed__title { font-size: var(--text-2xl); font-weight: 700; color: var(--color-status-error); }
        .rd-failed__desc { font-size: var(--text-md); color: var(--color-text-secondary); max-width: 380px; }

        /* ── Lenders ── */
        .rd-lenders {
          border: 1px solid var(--color-border);
          border-radius: var(--radius-xl);
          overflow: hidden;
          background: var(--color-surface);
        }
        .rd-lenders__cta {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: var(--space-6);
          padding: var(--space-8);
          background: linear-gradient(135deg, rgba(0,240,255,0.04), rgba(0,240,255,0.01));
          flex-wrap: wrap;
        }
        .rd-lenders__cta-text h3 {
          font-size: var(--text-xl);
          font-weight: 600;
        }
        .rd-lenders__cta-text p {
          color: var(--color-text-secondary);
          font-size: var(--text-md);
          margin-top: var(--space-1);
        }
        .rd-lenders__title {
          font-size: var(--text-xl);
          font-weight: 600;
          padding: var(--space-6) var(--space-6) 0;
          margin-bottom: var(--space-4);
        }
        .rd-lenders__grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: var(--space-4);
          padding: 0 var(--space-6) var(--space-6);
        }

        /* ── Lender Card ── */
        .rd-lender-card {
          background: var(--color-surface-elevated);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-lg);
          padding: var(--space-5);
          display: flex;
          flex-direction: column;
          gap: var(--space-4);
          transition: all var(--transition-normal);
        }
        .rd-lender-card:hover {
          border-color: rgba(0,240,255,0.2);
          box-shadow: var(--glow-cyan-sm);
          transform: translateY(-2px);
        }
        .rd-lender-card__header {
          display: flex;
          align-items: flex-start;
          gap: var(--space-3);
        }
        .rd-lender-card__icon { font-size: 28px; line-height: 1; flex-shrink: 0; }
        .rd-lender-card__name { font-size: var(--text-md); font-weight: 600; }
        .rd-lender-card__type { font-size: var(--text-sm); color: var(--color-text-secondary); text-transform: capitalize; }
        .rd-lender-card__match { margin-left: auto; }
        .rd-lender-card__score {
          font-size: var(--text-xs);
          background: var(--color-accent-bg);
          color: var(--color-accent-primary);
          border: 1px solid rgba(0,240,255,0.2);
          border-radius: var(--radius-full);
          padding: 2px 8px;
          font-weight: 600;
        }
        .rd-lender-card__details {
          display: flex;
          flex-direction: column;
          gap: var(--space-2);
          padding: var(--space-3);
          background: var(--color-surface);
          border-radius: var(--radius-md);
        }
        .rd-lender-card__detail-row {
          display: flex;
          justify-content: space-between;
          font-size: var(--text-sm);
        }
        .rd-lender-card__detail-key { color: var(--color-text-secondary); }
        .rd-lender-card__detail-val { color: var(--color-text-primary); font-weight: 500; }
        .rd-lender-card__apply {
          display: block;
          text-align: center;
          text-decoration: none;
        }
      `}</style>
    </div>
  );
}
