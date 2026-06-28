import React, { useState } from 'react';
import { X } from 'lucide-react';
import { QRCodeSVG as QRCode } from 'qrcode.react';
import { useTranslation } from 'react-i18next';
import { useToast } from '../context/ToastContext.jsx';
import { solvencyReports } from '../api/client.js';

const cn = (...classes) => classes.filter(Boolean).join(' ');

const TYPE_STYLES = {
  Financial: 'badge-financial',
  Risk: 'badge-risk',
  Compliance: 'badge-compliance',
  Custom: 'badge-custom',
};

const STATUS_STYLES = {
  Complete: 'badge-complete',
  Processing: 'badge-processing',
  Failed: 'badge-failed',
  Draft: 'badge-draft',
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

export default function ReportDetailModal({ report, onClose }) {
  const { addToast } = useToast();
  const { t } = useTranslation();
  const [isGeneratingPDF, setIsGeneratingPDF] = React.useState(false);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  
  const modelName = report.subtitle?.split('·')[0]?.trim() || report.model || 'Gemini 2.5 Flash';
  
  const reportData = report._raw?.report_data || report.report_data || {};
  const accuracy = report.accuracy ?? reportData.overall_score ?? null;

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
  if (reportData.reputation_signals?.score !== undefined) {
    features.push({ label: 'Reputation Signals', value: reportData.reputation_signals.score });
  }

  const explanationText = reportData.narrative || report.description || `Analysis of ${report.dataSource || 'connected data source'} using ${modelName}. Key drivers identified include revenue trends, risk exposure, and compliance metrics.`;
  
  const rawData = JSON.stringify(reportData, null, 2);

  const getMarkdown = () => {
    let md = `# ${report.name}\n\n`;
    md += `**Type:** ${report.type} | **Status:** ${report.status} | **Created:** ${report.createdAt || report.created}\n\n`;
    md += `## Metadata\n| Field | Value |\n|-------|-------|\n`;
    md += `| Data Source | ${report.dataSource || '—'} |\n| Model | ${modelName} |\n| Overall Score | ${accuracy ? accuracy + (typeof accuracy === 'number' ? '%' : '') : '—'} |\n| Rating | ${reportData.rating || '—'} |\n\n`;
    
    md += `## Explanation Output\n${explanationText}\n\n`;
    
    if (features.length > 0) {
      md += `## Feature Importance\n| Feature | Score |\n|---------|-----------|\n`;
      features.forEach(f => { md += `| ${f.label} | ${f.value}% |\n`; });
      md += `\n`;
    }

    if (reportData.risk_flags && reportData.risk_flags.length > 0) {
      md += `## Risk Flags\n`;
      reportData.risk_flags.forEach(flag => { md += `- ${flag}\n`; });
      md += `\n`;
    }

    if (reportData.recommendations && reportData.recommendations.length > 0) {
      md += `## Recommendations\n`;
      reportData.recommendations.forEach(rec => { md += `- ${rec}\n`; });
      md += `\n`;
    }

    md += `## Raw Data\n\`\`\`json\n${rawData}\n\`\`\`\n\n---\n*Generated by SolvAI on ${new Date().toLocaleDateString()}*\n`;
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
    a.download = `solvai_${report.name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '')}.md`;
    a.click();
    URL.revokeObjectURL(url);
    addToast('Markdown downloaded', 'success');
  };

  const handleDownloadPDF = async () => {
    setIsGeneratingPDF(true);
    addToast('Downloading PDF...', 'info');
    try {
      const reportId = report._raw?.id || report.id;
      const res = await solvencyReports.getPDF(reportId);
      const blob = new Blob([res.data], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `solvai_report_${reportId}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      addToast('PDF downloaded successfully', 'success');
    } catch (e) {
      addToast('Failed to download PDF', 'error');
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  React.useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-card rounded-xl w-full max-w-[800px] max-h-[90vh] shadow-2xl overflow-y-auto border border-border" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-start p-6 border-b border-border bg-card sticky top-0 z-10">
          <div>
            <h1 className="text-2xl font-bold text-primary mb-3">{report.name}</h1>
            <div className="flex items-center gap-2">
              <span className={cn(STATUS_STYLES[report.status] || STATUS_STYLES.Draft)}>{report.status}</span>
              <span className={cn(TYPE_STYLES[report.type] || TYPE_STYLES.Custom)}>{report.type}</span>
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
            <button onClick={handleCopyMD} className="px-3 py-1.5 text-sm font-medium border border-border rounded-md hover:bg-page transition-colors text-secondary">Copy MD</button>
            <button onClick={handleDownloadMD} className="px-3 py-1.5 text-sm font-medium border border-border rounded-md hover:bg-page transition-colors text-secondary">Download MD</button>
            {(report.status === 'Complete' || report.status === 'COMPLETED') && (
              <>
                <button 
                  onClick={() => setShareModalOpen(true)} 
                  className="px-3 py-1.5 text-sm font-medium bg-[#10b981] text-white rounded-md hover:bg-[#059669] transition-colors"
                >
                  {t('reports.actions.share')}
                </button>
                <button 
                  onClick={handleDownloadPDF} 
                  disabled={isGeneratingPDF}
                  className="px-3 py-1.5 text-sm font-medium bg-[#0570de] text-white rounded-md hover:bg-[#0462c7] transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {isGeneratingPDF ? t('status.generating') : t('reports.actions.download')}
                </button>
              </>
            )}
            <button onClick={onClose} className="ml-2 text-muted hover:text-primary transition-colors"><X className="w-5 h-5" /></button>
          </div>
        </div>
        
        <div className="p-6 space-y-8 bg-card">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div>
              <div className="text-sm text-muted mb-1">{t('reports.columns.created')}</div>
              <div className="text-sm font-medium text-primary">{report.createdAt || report.created || '—'}</div>
            </div>
            <div>
              <div className="text-sm text-muted mb-1">{t('reports.columns.source')}</div>
              <div className="text-sm font-medium text-primary">{report.dataSource || '—'}</div>
            </div>
            <div>
              <div className="text-sm text-muted mb-1">Model</div>
              <div className="text-sm font-medium text-primary">{modelName}</div>
            </div>
            <div>
              <div className="text-sm text-muted mb-1">{t('solvency.overallScore')}</div>
              <div className={cn('text-sm font-medium', getAccuracyColor(accuracy ? parseFloat(accuracy) : null))}>
                {accuracy !== null && accuracy !== undefined ? (typeof accuracy === 'number' ? `${accuracy}%` : accuracy) : '—'}
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-primary mb-3">{t('solvency.narrative')}</h3>
            <div className="bg-page rounded-md p-4 text-[14px] leading-[1.7] text-secondary">
              {explanationText}
            </div>
          </div>

          {(reportData.risk_flags?.length > 0 || reportData.recommendations?.length > 0) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {reportData.risk_flags?.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-primary mb-3">{t('solvency.riskFlags')}</h3>
                  <ul className="list-disc pl-5 space-y-2 text-sm text-[#df1b41] marker:text-[#df1b41]">
                    {reportData.risk_flags.map((flag, i) => (
                      <li key={i}>{flag}</li>
                    ))}
                  </ul>
                </div>
              )}
              {reportData.recommendations?.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-primary mb-3">{t('solvency.recommendations')}</h3>
                  <ul className="list-disc pl-5 space-y-2 text-sm text-[#1a9e6e] marker:text-[#1a9e6e]">
                    {reportData.recommendations.map((rec, i) => (
                      <li key={i}>{rec}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {features.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-primary mb-4">Component Scores</h3>
              <div className="space-y-4">
                {features.map((feat, i) => (
                  <div key={i} className="flex items-center gap-4">
                    <div className="w-40 text-sm font-medium text-secondary truncate">{feat.label}</div>
                    <div className="flex-1 h-3 bg-page rounded-full overflow-hidden">
                      <div className="h-full bg-[#0570de] rounded-full transition-all duration-500" style={{ width: `${feat.value}%` }}></div>
                    </div>
                    <div className="w-12 text-sm text-right text-muted">{feat.value}%</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <h3 className="text-sm font-semibold text-primary mb-3">Raw JSON Data</h3>
            <pre className="bg-[#111111] text-[#f5f5f5] p-4 rounded-md text-[13px] overflow-x-auto font-mono max-h-96">
              {rawData}
            </pre>
          </div>
        </div>
      </div>
      
      <ShareModal isOpen={shareModalOpen} onClose={() => setShareModalOpen(false)} reportId={report._raw?.id || report.id} />
    </div>
  );
}
