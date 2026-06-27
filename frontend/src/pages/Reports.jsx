import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import LoadingSpinner from '../components/LoadingSpinner.jsx';
import { solvencyReports, billing } from '../api/client.js';
import { IconWarning, IconSparkle } from '../components/Icons.jsx';

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

/* ── Reports Page ────────────────────────────────────────────────────────── */
export default function Reports() {
 const navigate = useNavigate();
 const [reports, setReports] = useState([]);
 const [loading, setLoading] = useState(true);
 const [error, setError] = useState('');
 const [generating, setGenerating] = useState(false);
 const [genError, setGenError] = useState('');
 const [subscription, setSubscription] = useState(null);

 const fetchReports = useCallback(async () => {
 try {
 const [res, subRes] = await Promise.all([
 solvencyReports.list(),
 billing.getSubscription().catch(() => ({ data: { plan: 'free' } }))
 ]);
 const data = Array.isArray(res.data) ? res.data : (res.data?.items ?? []);
 data.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
 setReports(data);
 setSubscription(subRes.data);
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

 return (
 <div className="page-layout">
 <Sidebar />

 <main className="page-content">
 <div className="content-area">
 {/* ── Page Header ── */}
 <div className="section-header">
 <div>
 <h1 className="section-title">Solvency Reports</h1>
 <p className="section-subtitle">View, manage, and generate your AI-powered solvency reports.</p>
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
 {genError.includes('limit reached') && (
 <a href="/pricing" className="ml-4 underline text-indigo-400 hover:text-indigo-300">Upgrade now</a>
 )}
 </div>
 )}

 {/* ── Loading State ── */}
 {loading ? (
 <LoadingSpinner text="Loading your reports…" />
 ) : error ? (
 <div className="error-message">
 <span><IconWarning size={16} /></span> {error}
 </div>
 ) : reports.length === 0 ? (
 <div className="rp-empty card-glass">
 <div className="rp-empty__icon"><IconSparkle size={48} /></div>
 <h2 className="rp-empty__title">No reports yet</h2>
 <p className="rp-empty__desc">
 Generate your first solvency report to see it here.
 </p>
 <button
 className="btn-primary"
 onClick={handleGenerate}
 disabled={generating}
 >
 {generating ? 'Generating…' : 'Generate Your First Report'}
 </button>
 </div>
 ) : (
 <div className="rp-table-wrap card">
 <div className="rp-table-header">
 <h3 className="rp-table-title">All Reports</h3>
 <span className="rp-table-count">{reports.length} report{reports.length !== 1 ? 's' : ''}</span>
 </div>
 <div className="rp-table-container">
 <table className="rp-table">
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
 className="rp-table__row"
 onClick={() => navigate(`/reports/${r.id}`)}
 style={{ cursor: 'pointer' }}
 >
 <td>
 <span className="mono rp-table__id">#{shortId(r.id)}</span>
 <span className="rp-table__full-id mono">{r.id}</span>
 </td>
 <td><StatusBadge status={r.status} /></td>
 <td className="rp-table__date">{formatDate(r.created_at)}</td>
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
 )}
 </div>
 </main>

 <style>{`
 /* ── Empty state ── */
 .rp-empty {
 display: flex;
 flex-direction: column;
 align-items: center;
 text-align: center;
 gap: var(--space-4);
 padding: var(--space-10) var(--space-8);
 }
 .rp-empty__icon {
 font-size: 48px;
 line-height: 1;
 color: var(--color-accent-primary);
 }
 .rp-empty__title {
 font-size: var(--text-2xl);
 font-weight: 700;
 letter-spacing: -0.03em;
 }
 .rp-empty__desc {
 font-size: var(--text-md);
 color: var(--color-text-secondary);
 max-width: 380px;
 line-height: 1.7;
 }

 /* ── Table ── */
 .rp-table-wrap {
 overflow: hidden;
 }
 .rp-table-header {
 display: flex;
 align-items: center;
 justify-content: space-between;
 margin-bottom: var(--space-5);
 }
 .rp-table-title {
 font-size: var(--text-lg);
 font-weight: 600;
 }
 .rp-table-count {
 font-size: var(--text-sm);
 color: var(--color-text-secondary);
 background: var(--color-surface-elevated);
 border: 1px solid var(--color-border);
 border-radius: var(--radius-full);
 padding: 2px 10px;
 }
 .rp-table-container {
 overflow-x: auto;
 margin: 0 calc(-1 * var(--space-6));
 padding: 0 var(--space-6);
 }
 .rp-table {
 width: 100%;
 border-collapse: collapse;
 font-size: var(--text-md);
 }
 .rp-table thead th {
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
 .rp-table tbody td {
 padding: 12px 12px;
 border-bottom: 1px solid var(--color-border-subtle);
 color: var(--color-text-primary);
 vertical-align: middle;
 }
 .rp-table__row:hover td {
 background: rgba(255,255,255,0.02);
 }
 .rp-table__row:last-child td {
 border-bottom: none;
 }
 .rp-table__id {
 font-weight: 600;
 color: var(--color-accent-primary);
 font-size: var(--text-sm);
 }
 .rp-table__full-id {
 display: block;
 font-size: 10px;
 color: var(--color-text-disabled);
 margin-top: 2px;
 overflow: hidden;
 text-overflow: ellipsis;
 white-space: nowrap;
 max-width: 160px;
 }
 .rp-table__date {
 color: var(--color-text-secondary);
 font-size: var(--text-sm);
 white-space: nowrap;
 }
 `}</style>
 </div>
 );
}
