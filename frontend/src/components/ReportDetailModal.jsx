import React, { useState } from 'react';
import { X, AlertTriangle, TrendingUp, Download, Loader2, Lock } from 'lucide-react';
import { QRCodeSVG as QRCode } from 'qrcode.react';
import { useTranslation } from 'react-i18next';
import { useToast } from '../context/ToastContext.jsx';
import { solvencyReports, billing } from '../api/client.js';
import { API_BASE_URL } from '../config.js';
import { platformLabel } from '../utils/platforms.js';

const escapeHtml = (text) => String(text)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');

const renderMarkdown = (text) => {
  if (!text) return '';
  // Escape first so AI/user content can't inject HTML; only our tags below are emitted
  const html = escapeHtml(text)
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/`(.*?)`/g, '<code style="background:var(--bg-page);padding:1px 4px;border-radius:3px;font-size:0.9em">$1</code>')
    .replace(/\n\n/g, '</p><p style="margin:0 0 12px">')
    .replace(/\n/g, '<br/>');
  return `<p style="margin:0 0 12px">${html}</p>`;
};

const cn = (...classes) => classes.filter(Boolean).join(' ');

const TYPE_STYLES = {
  Financial: 'badge-financial',
  Risk: 'badge-risk',
  Compliance: 'badge-compliance',
  Custom: 'badge-custom',
  'Solvency Assessment': 'badge-financial',
  'Rental Certificate': 'badge-custom',
  'Mortgage Assessment': 'badge-mortgage',
};

const STATUS_STYLES = {
  COMPLETED: 'badge-complete',
  GENERATING: 'badge-processing',
  FAILED: 'badge-failed',
  PENDING: 'badge-draft',
  DRAFT: 'badge-draft',
};

const getAccuracyColor = (val) => {
  if (val === null || val === undefined) return 'text-muted';
  if (val >= 80) return 'text-[#1a9e6e]';
  if (val >= 60) return 'text-[#c9870c]';
  return 'text-[#df1b41]';
};

function ShareModal({ isOpen, onClose, reportId }) {
  const { addToast } = useToast();
  const { t } = useTranslation();
  const [shareEnabled, setShareEnabled] = useState(false);
  const [shareUrl, setShareUrl] = useState('');
  const [expiryDays, setExpiryDays] = useState(90);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  
  const fullShareUrl = shareUrl ? `${window.location.origin}${shareUrl}` : '';
  
  const handleToggle = async (enabled) => {
    setLoading(true);
    try {
      if (enabled) {
        const res = await solvencyReports.createShare(reportId, { expires_days: expiryDays });
        setShareUrl(res.data.share_url);
        setShareEnabled(true);
        addToast('Share link created', 'success');
      } else {
        await solvencyReports.deleteShare(reportId);
        setShareUrl('');
        setShareEnabled(false);
        addToast('Share link disabled', 'info');
      }
    } catch (err) {
      addToast('Failed to update share settings', 'error');
    } finally {
      setLoading(false);
    }
  };
  
  const handleCopy = () => {
    navigator.clipboard.writeText(fullShareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  
  if (!isOpen) return null;
  
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.5)' }}>
      <div style={{ background: 'var(--color-surface, white)', border: '1px solid var(--color-border, #e5e7eb)', borderRadius: 12, padding: 24, width: '100%', maxWidth: 480 }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>Share this report</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-secondary, #6b7280)' }}>✕</button>
        </div>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--color-text-primary, #111827)' }}>Enable public link</div>
            <div style={{ fontSize: 12, color: 'var(--color-text-secondary, #6b7280)' }}>Anyone with the link can view your score</div>
          </div>
          <button
            onClick={() => handleToggle(!shareEnabled)}
            disabled={loading}
            style={{
              width: 44, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer',
              background: shareEnabled ? '#10b981' : '#d1d5db',
              position: 'relative', transition: 'background 0.2s'
            }}
          >
            <span style={{
              position: 'absolute', top: 2, left: shareEnabled ? 22 : 2,
              width: 20, height: 20, borderRadius: '50%', background: 'white',
              transition: 'left 0.2s'
            }} />
          </button>
        </div>
        
        {shareEnabled && shareUrl && (
          <>
            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              <input
                readOnly
                value={fullShareUrl}
                style={{ flex: 1, padding: '8px 12px', border: '1px solid var(--color-border, #e5e7eb)', borderRadius: 8, fontSize: 13, background: 'var(--color-background, #f9fafb)', color: 'var(--color-text-primary, #111827)' }}
              />
              <button onClick={handleCopy} style={{ padding: '8px 14px', borderRadius: 8, border: '1px solid var(--color-border, #e5e7eb)', cursor: 'pointer', background: 'var(--color-surface, white)', color: 'var(--color-text-primary, #111827)', fontSize: 13 }}>
                {copied ? t('common.copied') : t('common.copy')}
              </button>
            </div>
            
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 13, color: 'var(--color-text-secondary, #6b7280)', display: 'block', marginBottom: 6 }}>Link expires</label>
              <select
                value={expiryDays}
                onChange={e => setExpiryDays(Number(e.target.value))}
                style={{ padding: '6px 12px', border: '1px solid var(--color-border, #e5e7eb)', borderRadius: 8, background: 'var(--color-surface, white)', color: 'var(--color-text-primary, #111827)', fontSize: 13 }}
              >
                <option value={30}>30 days</option>
                <option value={90}>90 days</option>
                <option value={180}>6 months</option>
                <option value={365}>1 year</option>
              </select>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
              <QRCode value={fullShareUrl} size={128} />
            </div>
          </>
        )}
        
        <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: '#166534' }}>
          🔒 Recipients can see your score and ratings but <strong>NOT</strong> your transaction details or amounts
        </div>
      </div>
    </div>
  );
}

const LEVEL_STYLES = {
  LOW: 'text-[#1a9e6e]', UNCONCENTRATED: 'text-[#1a9e6e]', GROWING: 'text-[#1a9e6e]', STABLE: 'text-[#1a9e6e]',
  MODERATE: 'text-[#b45309]',
  HIGH: 'text-[#df1b41]', DECLINING: 'text-[#df1b41]',
  UNKNOWN: 'text-muted',
};

const fmtNum = (value, digits = 0) =>
  value === null || value === undefined ? '—' : Number(value).toLocaleString('en-GB', { maximumFractionDigits: digits });

// Deterministic metrics the AI was grounded on (backend/app/services/quant_service.py)
const VerifiedMetrics = ({ metrics }) => {
  if (!metrics?.volatility) return null;
  const { volatility, trend, weak_months: weak, client_concentration: concentration } = metrics;

  const rows = [
    {
      label: 'Income volatility (CoV)',
      value: volatility.cov_percent !== null && volatility.cov_percent !== undefined ? `${fmtNum(volatility.cov_percent, 1)}%` : '—',
      level: volatility.level,
      explanation: volatility.explanation,
      evidence: metrics.evidence?.income_stability,
    },
    {
      label: 'Revenue trend',
      value: trend.slope_percent_per_month !== undefined ? `${trend.slope_percent_per_month > 0 ? '+' : ''}${fmtNum(trend.slope_percent_per_month, 1)}% / month` : '—',
      level: trend.direction,
      explanation: trend.explanation,
      evidence: metrics.evidence?.growth_trend,
    },
    weak && {
      label: 'Weak months',
      value: `${weak.weak} of ${metrics.months_analyzed}`,
      level: weak.weak === 0 ? 'LOW' : weak.weak <= 2 ? 'MODERATE' : 'HIGH',
      explanation: weak.explanation,
      evidence: metrics.evidence?.seasonality,
    },
    {
      label: 'Client concentration (HHI)',
      value: concentration.hhi !== null && concentration.hhi !== undefined ? fmtNum(concentration.hhi) : '—',
      level: concentration.level,
      explanation: concentration.explanation,
      evidence: metrics.evidence?.client_concentration,
    },
    metrics.payment_integrity && {
      label: 'Payment integrity',
      value: metrics.payment_integrity.refund_rate_percent != null
        ? `${fmtNum(metrics.payment_integrity.refund_rate_percent, 1)}% refunded · ${metrics.payment_integrity.disputes} disputes`
        : '—',
      level: metrics.payment_integrity.level,
      explanation: metrics.payment_integrity.explanation,
    },
  ].filter(Boolean);

  return (
    <div>
      <h3 className="text-sm font-semibold text-primary mb-1">Verified metrics</h3>
      <p className="text-xs text-muted mb-3">
        Computed directly from {fmtNum(metrics.months_analyzed)} months of transactions, not by the AI. The scores above are grounded on these figures.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {rows.map((row) => (
          <div key={row.label} className="rounded-md border border-border bg-page p-3">
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-xs text-muted">{row.label}</span>
              <span className={cn('text-[11px] font-semibold uppercase tracking-wide', LEVEL_STYLES[row.level] || 'text-muted')}>
                {row.level}
              </span>
            </div>
            <div className="text-lg font-semibold text-primary mt-0.5">{row.value}</div>
            <p className="text-xs text-secondary mt-1 leading-relaxed">{row.explanation}</p>
            {row.evidence?.transactions?.length > 0 && (
              <ul className="mt-2 space-y-1 border-t border-border pt-2">
                {row.evidence.transactions.map((tx) => (
                  <li key={`${tx.platform}-${tx.id}`} className="flex items-center gap-2 text-[11px] text-secondary">
                    <span className={cn('rounded px-1.5 py-0.5 font-semibold text-white', tx.platform === 'PAYPAL' ? 'bg-[#003087]' : 'bg-[#635bff]')}>
                      {tx.platform === 'PAYPAL' ? 'PayPal' : tx.platform.charAt(0) + tx.platform.slice(1).toLowerCase()}
                    </span>
                    <span className="font-mono truncate" title={tx.id}>{tx.id}</span>
                    <span className="ml-auto whitespace-nowrap">{tx.date} · €{fmtNum(tx.amount, 2)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
      {metrics.source_breakdown?.length > 0 && (
        <div className="mt-4">
          <h4 className="text-xs font-semibold text-primary mb-2">Revenue by source</h4>
          <table className="w-full text-xs">
            <thead>
              <tr className="text-muted text-left">
                <th className="py-1 font-medium">Source</th>
                <th className="py-1 font-medium text-right">Share</th>
                <th className="py-1 font-medium text-right">Payments</th>
                <th className="py-1 font-medium text-right">Coverage</th>
                <th className="py-1 font-medium text-right">Revenue</th>
              </tr>
            </thead>
            <tbody>
              {metrics.source_breakdown.map((src) => (
                <tr key={src.platform} className="border-t border-border text-primary">
                  <td className="py-1.5">{src.platform === 'PAYPAL' ? 'PayPal' : src.platform.charAt(0) + src.platform.slice(1).toLowerCase()}</td>
                  <td className="py-1.5 text-right">{fmtNum(src.share_percent, 1)}%</td>
                  <td className="py-1.5 text-right">{fmtNum(src.transactions)}</td>
                  <td className="py-1.5 text-right">{src.days_covered != null ? `${src.days_covered} days` : `${src.months_covered} months`}</td>
                  <td className="py-1.5 text-right">€{fmtNum(src.total_revenue, 2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {metrics.data_quality_notes?.length > 0 && (
        <p className="text-xs text-[#b45309] mt-2">{metrics.data_quality_notes.join(' ')}</p>
      )}
    </div>
  );
};

const KeyFindings = ({ reportData }) => {
  const riskFlags = reportData?.risk_flags || [];
  const recommendations = reportData?.recommendations || [];
  const financialSummary = reportData?.financial_summary;
  
  return (
    <div style={{marginTop: '24px'}}>
      
      {/* Risk Flags */}
      {riskFlags.length > 0 && (
        <div style={{
          marginBottom: '20px',
          padding: '16px',
          background: 'var(--bg-page)',
          borderRadius: '8px',
          border: '1px solid var(--border-color)',
          borderLeft: '3px solid #f59e0b'
        }}>
          <div style={{
            display: 'flex', 
            alignItems: 'center', 
            gap: '8px',
            marginBottom: '12px'
          }}>
            <AlertTriangle size={16} color="#f59e0b" />
            <span style={{
              fontWeight: 600, 
              fontSize: '14px',
              color: 'var(--text-primary)'
            }}>
              Risk Factors Identified
            </span>
          </div>
          <ul style={{
            margin: 0, 
            paddingLeft: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px'
          }}>
            {riskFlags.slice(0, 5).map((flag, i) => (
              <li key={i} style={{
                fontSize: '13px',
                color: 'var(--text-secondary)',
                lineHeight: '1.5'
              }}>
                {flag.replace(/\*\*/g, '').trim()}
              </li>
            ))}
          </ul>
        </div>
      )}
      
      {/* Top 3 Recommendations */}
      {recommendations.length > 0 && (
        <div style={{marginBottom: '20px'}}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '12px'
          }}>
            <TrendingUp size={16} color="#0570de" />
            <span style={{
              fontWeight: 600,
              fontSize: '14px',
              color: 'var(--text-primary)'
            }}>
              Recommended Actions
            </span>
          </div>
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '8px'
          }}>
            {recommendations.slice(0, 3).map((rec, i) => {
              const title = rec
                .replace(/\*\*/g, '')
                .replace(/^\d+\.\s*/, '')
                .split('\n')[0]
                .split('(Addressing')[0]
                .trim();
              
              return (
                <div key={i} style={{
                  display: 'flex',
                  gap: '12px',
                  padding: '12px',
                  background: 'var(--bg-page)',
                  borderRadius: '6px',
                  border: '1px solid var(--border-color)'
                }}>
                  <span style={{
                    width: '22px',
                    height: '22px',
                    borderRadius: '50%',
                    background: '#eff6ff',
                    color: '#0570de',
                    fontSize: '12px',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    {i + 1}
                  </span>
                  <p style={{
                    margin: 0,
                    fontSize: '13px',
                    color: 'var(--text-secondary)',
                    lineHeight: '1.5'
                  }}>
                    {title}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}
      
      {/* Data Sources Used */}
      <div style={{
        padding: '12px 16px',
        background: 'var(--bg-page)',
        borderRadius: '6px',
        border: '1px solid var(--border-color)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div>
          <div style={{
            fontSize: '12px',
            color: 'var(--text-muted)',
            marginBottom: '2px'
          }}>
            Data Sources Analyzed
          </div>
          <div style={{
            fontSize: '13px',
            fontWeight: 500,
            color: 'var(--text-primary)'
          }}>
            {financialSummary?.connected_platforms?.join(', ') || 'No sources connected'}
          </div>
        </div>
        <div style={{textAlign: 'right'}}>
          <div style={{
            fontSize: '12px',
            color: 'var(--text-muted)',
            marginBottom: '2px'
          }}>
            Analysis Period
          </div>
          <div style={{
            fontSize: '13px',
            fontWeight: 500,
            color: 'var(--text-primary)'
          }}>
            {financialSummary?.analysis_period_months || 12} months
          </div>
        </div>
      </div>
      
    </div>
  );
};

export default function ReportDetailModal({ report, onClose }) {
  const { addToast } = useToast();
  const { t } = useTranslation();
  const [downloadingPDF, setDownloadingPDF] = useState(false);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [unlocking, setUnlocking] = useState(false);
  
  const token = localStorage.getItem('solvai_token');

  let plan = 'free';
  try {
    const userStr = localStorage.getItem('solvai_user');
    if (userStr) {
      const user = JSON.parse(userStr);
      plan = user?.organization?.plan ?? user?.plan ?? 'free';
    }
  } catch {
    // Corrupt cached user: treat as free plan
  }

  const isLocked = plan !== 'pro' && plan !== 'business' && !report._raw?.pdf_unlocked;

  const modelName = report.subtitle?.split('·')[0]?.trim() || report.model || 'Gemini';
  const reportData = report._raw?.report_data || report.report_data || {};
  const failureReason = (report._raw?.status || report.status) === 'FAILED'
    ? (reportData.error || 'Report generation failed.')
    : null;
  const accuracy = report.accuracy ?? reportData.overall_score ?? reportData.score ?? null;
  const dataSourceName = (reportData.financial_summary?.connected_platforms || []).map(platformLabel).join(' + ') || report.dataSource || '—';
  
  const createdDate = report.createdAt || report.created || report.created_at;
  const formattedDate = createdDate ? new Date(createdDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
  
  const reportTypeLabel = {
    'FULL_SOLVENCY': 'Solvency Assessment',
    'RENTAL_CERTIFICATE': 'Rental Certificate',
    'RENTAL': 'Rental Certificate',
    'MORTGAGE_ASSESSMENT': 'Mortgage Assessment'
  }[report.report_type] || 'Report';
  
  const title = `${reportTypeLabel} — ${formattedDate}`;
  const overallScore = reportData?.overall_score ? reportData.overall_score + '%' : '—';

  const features = [];
  if (reportData.income_stability?.score !== undefined) {
    features.push({ label: 'Income Stability', value: reportData.income_stability.score });
  }
  if (reportData.growth_trend?.score !== undefined) {
    features.push({ label: 'Growth Trend', value: reportData.growth_trend.score });
  }
  if (reportData.seasonality?.score !== undefined) {
    features.push({ label: 'Seasonality', value: reportData.seasonality.score });
  }
  if (reportData.client_concentration?.score !== undefined) {
    features.push({ label: 'Client Concentration', value: reportData.client_concentration.score });
  }
  if (reportData.reputation_signals?.score != null) {
    features.push({ label: 'Payment Integrity', value: reportData.reputation_signals.score });
  }

  const rawStatus = report._raw?.status || report.status;
  const explanationText = reportData.narrative || report.description || (
    ['PENDING', 'GENERATING'].includes(rawStatus)
      ? 'This report is still being generated. The narrative appears here as soon as the analysis finishes.'
      : 'No narrative is available for this report.'
  );

  const getMarkdown = () => {
    let md = `# ${title}\n\n`;
    md += `**Type:** ${reportTypeLabel} | **Status:** ${report.status} | **Created:** ${formattedDate}\n\n`;
    md += `## Metadata\n| Field | Value |\n|-------|-------|\n`;
    const avgRev = reportData.financial_summary?.avg_monthly_revenue;
    md += `| Data Source | ${dataSourceName} |\n| Model | ${modelName} |\n| Overall Score | ${overallScore} |\n| Avg Monthly Revenue | ${avgRev ? '€' + Math.round(avgRev).toLocaleString('de-DE') : '—'} |\n| Rating | ${reportData.rating || '—'} |\n\n`;
    
    md += `## Explanation Output\n${explanationText}\n\n`;
    
    if (features.length > 0) {
      md += `## Feature Importance\n| Feature | Score |\n|---------|-----------|\n`;
      features.forEach(f => { md += `| ${f.label} | ${f.value}% |\n`; });
      md += `\n`;
    }

    if (reportData.risk_flags && reportData.risk_flags.length > 0) {
      md += `## Risk Flags\n`;
      reportData.risk_flags.forEach(flag => { md += `- ${flag.replace(/\*\*/g, '')}\n`; });
      md += `\n`;
    }

    if (reportData.recommendations && reportData.recommendations.length > 0) {
      md += `## Recommendations\n`;
      reportData.recommendations.slice(0, 3).forEach(rec => { 
        md += `- ${rec.replace(/\*\*/g, '').split('\n')[0].trim()}\n`; 
      });
      md += `\n`;
    }

    md += `\n---\n*Generated by SolvAI on ${new Date().toLocaleDateString()}*\n`;
    return md;
  };

  const handleCopyMD = () => {
    navigator.clipboard.writeText(getMarkdown());
    addToast('Report copied as Markdown', 'success');
  };

  const handleDownloadMD = () => {
    const blob = new Blob([getMarkdown()], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `solvai_report.md`;
    a.click();
    URL.revokeObjectURL(url);
    addToast('Markdown downloaded', 'success');
  };

  const handleDownloadPDF = async () => {
    if (!report?.id) return;
    try {
      setDownloadingPDF(true);
      const response = await fetch(
        `${API_BASE_URL}/solvency-reports/${report.id}/pdf`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
          }
        }
      );
      
      if (!response.ok) {
        if (response.status === 402) {
          const err = await response.json().catch(() => ({}));
          const checkoutUrl = err.detail?.checkout_url || err.checkout_url;
          if (checkoutUrl) {
            window.location.href = checkoutUrl;
          } else {
            addToast('Upgrade to Pro to download PDFs', 'error');
          }
          return;
        }
        
        const err = await response.json().catch(() => ({}));
        
        // If 403 and pdf_locked, handle it gracefully
        const isPdfLocked = err.error === 'pdf_locked' 
          || err.detail === 'pdf_locked' 
          || err.detail?.error === 'pdf_locked';
        
        if (response.status === 403 && isPdfLocked) {
          addToast('Report is locked', 'error');
          return;
        }
        
        // Extract string safely to avoid React WSOD
        let safeMessage = `Failed to download PDF (${response.status})`;
        if (typeof err.detail === 'string') {
          safeMessage = err.detail;
        } else if (typeof err.message === 'string') {
          safeMessage = err.message;
        } else if (err.detail && typeof err.detail.message === 'string') {
          safeMessage = err.detail.message;
        }
        
        addToast(safeMessage, 'error');
        return;
      }
      const blob = await response.blob();
      if (blob.size === 0) throw new Error('Empty PDF');
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `solvai_report_${report.id.slice(0, 8)}.pdf`;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 100);
      addToast('PDF downloaded successfully', 'success');
    } catch (err) {
      console.error('PDF download error:', err);
      let message = 'Failed to download PDF. Please try again.';
      if (typeof err === 'string') {
        message = err;
      } else if (typeof err.message === 'string') {
        message = err.message;
      }
      addToast(message, 'error');
    } finally {
      setDownloadingPDF(false);
    }
  };

  React.useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  const handleUnlock = async () => {
    setUnlocking(true);
    try {
      const res = await billing.createReportCheckout(report._raw?.id || report.id);
      if (res.data?.checkout_url) {
        window.location.href = res.data.checkout_url;
      }
    } catch (err) {
      addToast(err?.response?.data?.detail || 'Failed to start checkout', 'error');
    } finally {
      setUnlocking(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-card rounded-xl w-full max-w-[800px] max-h-[90vh] shadow-2xl overflow-y-auto border border-border" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-start p-6 border-b border-border bg-card sticky top-0 z-10">
          <div>
            <h1 className="text-2xl font-bold text-primary mb-3">{title}</h1>
            <div className="flex items-center gap-2">
              <span className={cn(STATUS_STYLES[report._raw?.status] || STATUS_STYLES.DRAFT)}>{report.status}</span>
              <span className={cn(TYPE_STYLES[report.type] || TYPE_STYLES.Custom)}>{reportTypeLabel}</span>
              {reportData.rating && (
                <span className={cn(
                  'px-2.5 py-0.5 rounded-full text-xs font-medium border',
                  reportData.rating === 'Strong' ? 'bg-[#ecfdf5] text-[#065f46] border-[#6ee7b7]' :
                  reportData.rating === 'Developing' ? 'bg-[#fef3c7] text-[#92400e] border-[#fcd34d]' :
                  'bg-[#fee2e2] text-[#991b1b] border-[#fca5a5]'
                )}>
                  {reportData.rating}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap justify-end">
            <button onClick={handleCopyMD} className="px-2 py-1 text-xs font-medium border border-border rounded-md hover:bg-page transition-colors text-secondary">Copy MD</button>
            <button onClick={handleDownloadMD} className="px-2 py-1 text-xs font-medium border border-border rounded-md hover:bg-page transition-colors text-secondary">Download MD</button>
            {(report._raw?.status === 'COMPLETED' || report.status === 'Complete' || report.status === 'COMPLETED') && (
              <>
                <button 
                  onClick={() => setShareModalOpen(true)} 
                  className="px-2 py-1 text-xs font-medium bg-[#10b981] text-white rounded-md hover:bg-[#059669] transition-colors"
                >
                  {t('reports.actions.share')}
                </button>
                <button
                  onClick={handleDownloadPDF}
                  disabled={downloadingPDF}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '6px 12px',
                    background: '#0570de',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '13px',
                    fontWeight: 500,
                    cursor: downloadingPDF ? 'not-allowed' : 'pointer',
                    opacity: downloadingPDF ? 0.7 : 1,
                  }}
                >
                  {downloadingPDF ? (
                    <><Loader2 size={13} className="animate-spin" /> Generating...</>
                  ) : (
                    <><Download size={13} /> Download PDF</>
                  )}
                </button>
              </>
            )}
            <button onClick={onClose} className="ml-2 text-muted hover:text-primary transition-colors"><X className="w-5 h-5" /></button>
          </div>
        </div>
        
        <div className="p-6 space-y-8 bg-card">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
            <div>
              <div className="text-sm text-muted mb-1">{t('reports.columns.created')}</div>
              <div className="text-sm font-medium text-primary">{formattedDate}</div>
            </div>
            <div>
              <div className="text-sm text-muted mb-1">{t('reports.columns.source')}</div>
              <div className="text-sm font-medium text-primary">{dataSourceName}</div>
            </div>
            <div>
              <div className="text-sm text-muted mb-1">Model</div>
              <div className="text-sm font-medium text-primary">{modelName}</div>
            </div>
            <div>
              <div className="text-sm text-muted mb-1">{t('solvency.overallScore')}</div>
              <div className={cn('text-sm font-medium', getAccuracyColor(accuracy ? parseFloat(accuracy) : null))}>
                {overallScore}
              </div>
            </div>
            <div>
              <div className="text-sm text-muted mb-1">Avg Rev</div>
              <div className="text-sm font-medium text-primary">
                {reportData.financial_summary?.avg_monthly_revenue
                  ? '€' + Math.round(reportData.financial_summary.avg_monthly_revenue).toLocaleString('de-DE')
                  : '—'}
              </div>
            </div>
          </div>

          {failureReason ? (
            <div className="flex items-start gap-3 rounded-md border border-[#fecaca] bg-[#fef2f2] p-4 text-[#991b1b]">
              <AlertTriangle className="w-5 h-5 mt-0.5 shrink-0" />
              <div>
                <h3 className="text-sm font-semibold mb-1">This report could not be generated</h3>
                <p className="text-sm">{failureReason}</p>
              </div>
            </div>
          ) : (
            <div>
              <h3 className="text-sm font-semibold text-primary mb-3">{t('solvency.narrative')}</h3>
              <div className="bg-page rounded-md p-4 relative" style={{ fontSize: '14px', lineHeight: '1.7', color: 'var(--text-secondary)' }}>
                <div style={{ filter: isLocked ? 'blur(4px)' : 'none', transition: 'filter 0.3s ease' }}>
                  <div 
                    className="narrative-text"
                    dangerouslySetInnerHTML={{ 
                      __html: renderMarkdown(
                        isLocked && explanationText.length > 200 
                          ? explanationText.substring(0, 200) + '...' 
                          : explanationText
                      ) 
                    }}
                  />
                </div>
                
                {isLocked && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/40 dark:bg-black/40 rounded-md z-10 p-6 text-center backdrop-blur-[1px]">
                    <div className="bg-card border border-border p-5 rounded-xl shadow-lg max-w-sm">
                      <Lock className="w-8 h-8 text-[var(--brand-blue)] mb-3 mx-auto" />
                      <h4 className="text-base font-semibold text-primary mb-2">Premium Feature</h4>
                      <p className="text-sm text-secondary mb-4">Unlock the full AI narrative, risk flags, and PDF report.</p>
                      <button
                        onClick={handleUnlock}
                        disabled={unlocking}
                        className="w-full py-2 bg-[var(--brand-blue)] text-white rounded-lg text-sm font-medium hover:bg-[var(--brand-blue-hover)] transition-colors flex items-center justify-center gap-2"
                      >
                        {unlocking ? <Loader2 size={16} className="animate-spin" /> : 'Unlock for 9€'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
          
          {report.report_type === 'MORTGAGE_ASSESSMENT' && (
            <div>
              <h3 className="text-sm font-semibold text-[#8b5cf6] mb-3">Mortgage Capacity Metrics</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 rounded-xl border border-border" style={{ backgroundColor: '#f5f3ff' }}>
                <div>
                  <div className="text-xs text-secondary font-semibold uppercase tracking-wider mb-1">Estimated Max Mortgage</div>
                  <div className="text-xl font-bold text-[#6d28d9]">€{reportData.estimated_max_mortgage?.toLocaleString()}</div>
                </div>
                <div>
                  <div className="text-xs text-secondary font-semibold uppercase tracking-wider mb-1">Monthly Capacity</div>
                  <div className="text-xl font-bold text-[#6d28d9]">€{reportData.estimated_monthly_payment_capacity?.toLocaleString()}</div>
                </div>
                <div>
                  <div className="text-xs text-secondary font-semibold uppercase tracking-wider mb-1">Est. DTI</div>
                  <div className="text-xl font-bold text-primary">{reportData.debt_to_income_ratio || 'N/A'}</div>
                </div>
                <div>
                  <div className="text-xs text-secondary font-semibold uppercase tracking-wider mb-1">Downpayment</div>
                  <div className="text-xl font-bold text-primary">{reportData.downpayment_recommendation || 'N/A'}</div>
                </div>
              </div>
            </div>
          )}

          <VerifiedMetrics metrics={reportData.quant_metrics} />

          <KeyFindings reportData={reportData} />
        </div>
      </div>
      
      <ShareModal isOpen={shareModalOpen} onClose={() => setShareModalOpen(false)} reportId={report._raw?.id || report.id} />
    </div>
  );
}
