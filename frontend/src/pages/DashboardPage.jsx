import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useToast } from '../context/ToastContext.jsx';
import {
 FileText,
 Database,
 TrendingUp,
 Activity,
 Eye,
 Download,
 Cloud,
 FileSpreadsheet,
 Globe,
 RefreshCw,
 Loader2,
 Plus,
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer, Area, AreaChart } from 'recharts';
import ReportDetailModal from '../components/ReportDetailModal.jsx';
import { solvencyReports, dataSources as dataSourcesApi, users, billing, alerts as alertsApi } from '../api/client.js';

const cn = (...classes) => classes.filter(Boolean).join(' ');

export default function DashboardPage({ onNavigate }) {
 const [syncingSources, setSyncingSources] = useState({});
 const [syncedSources, setSyncedSources] = useState({});
 const [syncedRecords, setSyncedRecords] = useState({});
 const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
 const [selectedReportForDetail, setSelectedReportForDetail] = useState(null);
 const [downloadingPdfId, setDownloadingPdfId] = useState(null);
 const { addToast } = useToast();
 const { t } = useTranslation();

 const [realReports, setRealReports] = useState([]);
 const [realSources, setRealSources] = useState([]);
 const [userInfo, setUserInfo] = useState(null);
 const [subscription, setSubscription] = useState(null);
 const [loading, setLoading] = useState(true);
 const [generating, setGenerating] = useState(false);
 const [scoreHistory, setScoreHistory] = useState([]);
 const [activeAlerts, setActiveAlerts] = useState([]);

 const dismissAlert = async (id) => {
   try {
     await alertsApi.markRead(id);
     setActiveAlerts(prev => prev.filter(a => a.id !== id));
   } catch (e) {
     console.error("Failed to dismiss alert:", e);
   }
 };


 React.useEffect(() => {
   const fetchData = async () => {
     try {
       const [reportsRes, sourcesRes, userRes, subRes, historyRes, alertsRes] = await Promise.all([
         solvencyReports.list().catch(() => ({ data: [] })),
         dataSourcesApi.list().catch(() => ({ data: [] })),
         users.me().catch(() => ({ data: null })),
         billing.getSubscription().catch(() => ({ data: { plan: 'free' } })),
         solvencyReports.getScoreHistory().catch(() => ({ data: [] })),
         alertsApi.getAll().catch(() => ({ data: [] }))
       ]);
       const reps = Array.isArray(reportsRes.data) ? reportsRes.data : (reportsRes.data?.items ?? []);
       reps.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
       setRealReports(reps);
       const srcs = Array.isArray(sourcesRes.data) ? sourcesRes.data : (sourcesRes.data?.items ?? []);
       setRealSources(srcs);
       setUserInfo(userRes.data);
       setSubscription(subRes.data);
       const history = Array.isArray(historyRes?.data) ? historyRes.data : [];
       setScoreHistory(history);
       const fetchedAlerts = Array.isArray(alertsRes?.data) ? alertsRes.data : [];
       setActiveAlerts(fetchedAlerts.filter(a => !a.is_read && (a.type === 'SOURCE_ERROR' || a.type === 'SCORE_DROP')));

     } catch (err) {
       console.error('Dashboard fetch error:', err);
     } finally {
       setLoading(false);
     }
   };
   fetchData();
 }, []);

 const handleGenerate = async () => {
   setGenerating(true);
   try {
     const res = await solvencyReports.create();
     const newId = res.data?.id;
     if (!newId) throw new Error('No report ID returned');
     addToast('Report generation started...', 'info');
     const poll = setInterval(async () => {
       try {
         const pollRes = await solvencyReports.get(newId);
         const status = pollRes.data?.status;
         if (status === 'COMPLETED') {
           clearInterval(poll);
           setGenerating(false);
           addToast('Report generated successfully!', 'success');
           const freshRes = await solvencyReports.list();
           const fresh = Array.isArray(freshRes.data) ? freshRes.data : (freshRes.data?.items ?? []);
           fresh.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
           setRealReports(fresh);
         } else if (status === 'FAILED') {
           clearInterval(poll);
           setGenerating(false);
           addToast('Report generation failed', 'error');
         }
       } catch (e) {
         clearInterval(poll);
         setGenerating(false);
       }
     }, 3000);
   } catch (err) {
     setGenerating(false);
     addToast(err?.response?.data?.detail || 'Failed to start report generation', 'error');
   }
 };

 const handleSync = async (name) => {
   addToast(`Sync for ${name} is not yet supported`, 'info');
 };

 const scoredReports = realReports.filter(r => r.report_data?.overall_score || r.report_data?.solvency_score);
 const avgScore = scoredReports.length > 0
   ? (scoredReports.reduce((sum, r) => sum + (r.report_data?.overall_score ?? r.report_data?.solvency_score ?? 0), 0) / scoredReports.length).toFixed(1)
   : '—';

 const statCards = [
 {
 label: t('dashboard.totalReports'),
 value: String(realReports.length),
 trend: realReports.length > 0 ? `${realReports.filter(r => r.status === 'COMPLETED').length} ${t('status.completed').toLowerCase()}` : null,
 trendType: 'success',
 icon: FileText,
 },
 {
 label: t('dashboard.dataSources'),
 value: String(realSources.length),
 subtitle: 'connected',
 icon: Database,
 },
 {
 label: t('dashboard.avgScore'),
 value: avgScore !== '—' ? `${avgScore}%` : '—',
 badge: avgScore !== '—' && parseFloat(avgScore) >= 70 ? 'Good' : null,
 badgeType: 'success',
 icon: TrendingUp,
 },
 {
 label: 'Plan',
 value: (subscription?.plan || 'free').charAt(0).toUpperCase() + (subscription?.plan || 'free').slice(1),
 subtitle: subscription?.status || 'active',
 icon: Activity,
 },
 ];

 const reports = realReports.slice(0, 5).map(r => ({
 id: r.id,
 name: `Report ${r.id?.split('-')[0]?.toUpperCase() || ''}`,
 type: 'Solvency',
 status: r.status === 'COMPLETED' ? t('status.complete') : r.status === 'GENERATING' ? t('status.processing') : r.status === 'FAILED' ? 'Generation Failed' : t('status.pending'),
 created: r.created_at ? new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(r.created_at)) : '—',
 accuracy: r.report_data?.overall_score ? `${r.report_data.overall_score}%` : null,
 hasDownload: r.status === 'COMPLETED' && !!r.document_uri,
 document_uri: r.document_uri,
 _raw: r,
 }));

 const displaySources = realSources.map(s => ({
 name: (s.source_type || s.type || 'Source').charAt(0).toUpperCase() + (s.source_type || s.type || 'Source').slice(1).toLowerCase(),
 icon: Database,
 bgColor: (s.source_type || s.type || '').toLowerCase() === 'stripe' ? 'bg-[#635bff]' : (s.source_type || s.type || '').toLowerCase() === 'xero' ? 'bg-[#00b0e0]' : 'bg-[#336791]',
 connected: (s.status || '').toUpperCase() === 'CONNECTED',
 lastSync: s.created_at ? new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short' }).format(new Date(s.created_at)) : '—',
 }));

 const usageItems = [
 { label: 'Reports', current: realReports.length, max: subscription?.plan === 'pro' ? 1000 : 100, unit: '' },
 { label: 'Data Sources', current: realSources.length, max: subscription?.plan === 'pro' ? 10 : 4, unit: '' },
 ];

 const derivedActivities = realReports.slice(0, 5).map(r => ({
 color: r.status === 'COMPLETED' ? 'bg-[#1a9e6e]' : r.status === 'FAILED' ? 'bg-[#df1b41]' : 'bg-[#0570de]',
 text: `Report ${r.id?.split('-')[0]?.toUpperCase() || ''} ${r.status?.toLowerCase() || ''}`,
 time: r.created_at ? new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(r.created_at)) : '—',
 }));

 const typeBadgeStyles = {
 Financial: 'badge-financial',
 Risk: 'badge-risk',
 Compliance: 'badge-compliance',
 Custom: 'badge-custom',
 'Solvency Assessment': 'badge-financial',
 'Rental Certificate': 'badge-custom',
 'Mortgage Assessment': 'badge-mortgage',
 };

 const statusBadgeStyles = {
 Complete: 'badge-complete',
 Processing: 'badge-processing',
 Failed: 'badge-failed',
 'Generation Failed': 'badge-failed',
 Draft: 'badge-draft',
 };

 if (loading) {
   return (
     <div className="page-enter flex items-center justify-center" style={{minHeight: '60vh'}}>
       <Loader2 className="w-8 h-8 animate-spin text-[#0570de]" />
     </div>
   );
 }

 return (
 <div className="page-enter">
 {/* Page Header */}
 <div className="flex justify-between items-center">
 <div>
 <h1 className="text-xl font-semibold text-primary">{t('dashboard.title')}</h1>
 <p className="text-sm text-muted">
 {t('dashboard.overview')}
 </p>
 </div>
 <button
   onClick={handleGenerate}
   disabled={generating}
   className="bg-[#0570de] text-white rounded-lg px-4 py-2.5 text-sm font-medium hover:bg-[#0462c7] flex items-center gap-2 transition-colors disabled:opacity-50"
 >
   {generating ? (
     <><Loader2 className="w-4 h-4 animate-spin" /> {t('dashboard.generating')}</>
   ) : (
     <><Plus className="w-4 h-4" /> {t('dashboard.generateReport')}</>
   )}
 </button>
 </div>

 {activeAlerts.length > 0 && (
   <div className="flex flex-col gap-3 mt-6">
     {activeAlerts.map(alert => (
       <div key={alert.id} className="bg-orange-50 border border-orange-200 text-orange-800 rounded-lg p-4 flex items-center justify-between">
         <div className="flex items-center gap-3">
           <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 flex-shrink-0">
             <Activity className="w-4 h-4" />
           </div>
           <div>
             <h4 className="font-semibold text-sm">{alert.title}</h4>
             <p className="text-xs">{alert.message}</p>
           </div>
         </div>
         <button onClick={() => dismissAlert(alert.id)} className="p-1 hover:bg-orange-100 rounded text-orange-600 transition-colors">
           <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
         </button>
       </div>
     ))}
   </div>
 )}

 {/* Stat Cards Row */}

 <div className="grid grid-cols-4 gap-4 mt-6">
 {statCards.map((card) => {
 const Icon = card.icon;
 return (
 <div
 key={card.label}
 className="bg-card border border-border rounded-lg p-5 px-6 transition-colors hover:border-[#cbd5e1] dark:hover:border-[#333333]"
 >
 <div className="flex justify-between">
 <span className="text-xs font-medium text-muted uppercase tracking-wider">
 {card.label}
 </span>
 <Icon className="text-muted w-5 h-5" />
 </div>
 <div className="text-2xl font-semibold text-primary mt-2">
 {card.value}
 </div>
 <div className="mt-1">
 {card.trend && (
 <span className="rounded-full px-2.5 py-0.5 text-xs font-medium bg-[#ecfdf5] /20 text-[#1a9e6e] ">
 {card.trend}
 </span>
 )}
 {card.subtitle && (
 <span className="text-sm text-muted">
 {card.subtitle}
 </span>
 )}
 {card.badge && (
 <span className="rounded-full px-2.5 py-0.5 text-xs font-medium bg-[#ecfdf5] /20 text-[#1a9e6e] ">
 {card.badge}
 </span>
 )}
 {card.progress !== undefined && (
 <div className="h-1.5 bg-[#e3e8ef] rounded-full mt-1">
 <div
 className="bg-[#0570de] rounded-full h-full"
 style={{ width: `${card.progress}%` }}
 />
 </div>
 )}
 </div>
 </div>
 );
 })}
 </div>

 <ScoreEvolutionCard history={scoreHistory} onGenerateReport={handleGenerate} />

 {/* Main Grid */}
 <div className="grid grid-cols-5 gap-6 mt-6">
 {/* Left: Recent Reports */}
 <div className="col-span-3 bg-card border border-border rounded-lg p-5 px-6">
 <div className="flex justify-between items-center mb-4">
 <h2 className="text-base font-semibold text-primary">
 {t('dashboard.recentReports')}
 </h2>
 <button
 onClick={() => onNavigate && onNavigate('reports')}
 className="link-primary bg-transparent border-none p-0"
 >
 {t('dashboard.viewAll')} →
 </button>
 </div>
 <div className="w-full overflow-x-auto min-h-[200px]">
 <table className="w-full" style={{ tableLayout: 'fixed', minWidth: '700px' }}>
 <thead>
 <tr className="bg-page">
 <th className="text-left text-xs font-medium text-muted uppercase tracking-wider py-3 px-4" style={{ width: '40%' }}>
 {t('reports.columns.name')}
 </th>
 <th className="text-left text-xs font-medium text-muted uppercase tracking-wider py-3 px-4" style={{ width: '15%' }}>
 {t('reports.columns.type')}
 </th>
 <th className="text-left text-xs font-medium text-muted uppercase tracking-wider py-3 px-4" style={{ width: '15%' }}>
 {t('reports.columns.status')}
 </th>
 <th className="text-left text-xs font-medium text-muted uppercase tracking-wider py-3 px-4" style={{ width: '15%' }}>
 {t('reports.columns.created')}
 </th>
 <th className="text-right text-xs font-medium text-muted uppercase tracking-wider py-3 px-4" style={{ width: '10%' }}>
 {t('reports.columns.score')}
 </th>
 <th className="text-right text-xs font-medium text-muted uppercase tracking-wider py-3 px-4" style={{ width: '5%' }}>
 Actions
 </th>
 </tr>
 </thead>
 <tbody>
 {reports.map((report, index) => (
 <tr
 key={report.name}
 onClick={() => {
 setSelectedReportForDetail(report);
 setIsDetailModalOpen(true);
 }}
 className={cn(
 'hover:bg-page transition-colors cursor-pointer',
 index < reports.length - 1 &&
 'border-b border-border'
 )}
 >
 <td className="py-3 px-4 text-sm font-medium text-primary whitespace-nowrap overflow-hidden text-ellipsis">
 {report.name}
 </td>
 <td className="py-3 px-4 whitespace-nowrap">
 <span className={typeBadgeStyles[report.type] || 'badge-custom'}>
 {report.type}
 </span>
 </td>
 <td className="py-3 px-4 whitespace-nowrap">
 <span className={statusBadgeStyles[report.status] || 'badge-draft'}>
 {report.status}
 </span>
 </td>
 <td className="py-3 px-4 text-sm text-muted whitespace-nowrap">
 {report.created}
 </td>
 <td className="py-3 px-4 text-right text-sm whitespace-nowrap">
 {report.accuracy ? (
 <span className="text-[#1a9e6e] font-medium">
 {report.accuracy}
 </span>
 ) : (
 <span className="text-muted">—</span>
 )}
 </td>
 <td className="py-3 px-4 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
 <div className="flex gap-2 justify-end">
 <Eye 
 className="w-4 h-4 text-muted hover:text-primary cursor-pointer" 
 onClick={() => {
 setSelectedReportForDetail(report);
 setIsDetailModalOpen(true);
 }}
 />
 {report.hasDownload && (
 downloadingPdfId === report.name ? (
 <Loader2 className="w-4 h-4 text-muted animate-spin cursor-not-allowed" />
 ) : (
 <Download 
 className="w-4 h-4 text-muted hover:text-primary cursor-pointer" 
 onClick={async () => {
 setDownloadingPdfId(report.name);
 addToast('Downloading PDF...', 'info');
 try {
   const reportId = report._raw?.id || report.id;
   const res = await solvencyReports.getPDF(reportId);
   if (res.data?.download_url) {
     window.open(res.data.download_url, '_blank');
     addToast('PDF downloaded successfully', 'success');
   } else {
     throw new Error('No download URL returned');
   }
 } catch (e) {
   console.error('PDF download error:', e);
   addToast('Failed to download PDF', 'error');
 } finally {
   setDownloadingPdfId(null);
 }
 }}
 />
 )
 )}
 </div>
 </td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 </div>

 {/* Right: Two stacked cards */}
 <div className="col-span-2 flex flex-col gap-6">
 {/* Data Sources Card */}
 <div className="bg-card border border-border rounded-lg p-5 px-6">
 <h2 className="text-base font-semibold text-primary mb-4">
 {t('dashboard.dataSources')}
 </h2>
 <div>
 {displaySources.map((source, index) => {
 const SourceIcon = source.icon;
 return (
 <div
 key={source.name}
 className={cn(
 'flex items-center justify-between py-3',
 index < displaySources.length - 1 &&
 'border-b border-border'
 )}
 >
 <div className="flex items-center gap-3">
 <div
 className={cn(
 'w-8 h-8 rounded-lg flex items-center justify-center text-white',
 source.bgColor
 )}
 >
 <SourceIcon className="w-4 h-4" />
 </div>
 <span className="text-sm font-medium text-primary">
 {source.name}
 </span>
 </div>
 <div className="flex items-center gap-2">
 <div
 className={cn(
 'w-2 h-2 rounded-full',
 source.connected
 ? 'bg-[#1a9e6e] '
 : 'bg-[#df1b41] '
 )}
 />
 <span className="text-xs text-muted">
 {syncingSources[source.name]
 ? 'Syncing...'
 : syncedSources[source.name]
 ? `Just now (+${syncedRecords[source.name] || 0} records)`
 : source.lastSync}
 </span>
 {source.connected && (
 <button
 onClick={() => handleSync(source.name)}
 disabled={syncingSources[source.name]}
 className="ml-1 p-1 text-muted hover:text-primary rounded-md transition-colors"
 >
 <RefreshCw
 className={cn('w-3 h-3', syncingSources[source.name] && 'animate-spin')}
 />
 </button>
 )}
 </div>
 </div>
 );
 })}
 </div>

 {isDetailModalOpen && selectedReportForDetail && (
 <ReportDetailModal 
 report={selectedReportForDetail}
 onClose={() => setIsDetailModalOpen(false)}
 />
 )}
 </div>

 {/* Usage This Month Card */}
 <div className="bg-card border border-border rounded-lg p-5 px-6">
 <h2 className="text-base font-semibold text-primary mb-4">
 Usage this month
 </h2>
 <div>
 {usageItems.map((item, index) => {
 const percentage = (item.current / item.max) * 100;
 const currentDisplay =
 item.label === 'API Calls'
 ? item.current.toLocaleString()
 : item.current;
 const maxDisplay =
 item.label === 'API Calls'
 ? item.max.toLocaleString()
 : item.max;
 return (
 <div
 key={item.label}
 className={cn(
 index < usageItems.length - 1 ? 'mb-4' : 'mb-0'
 )}
 >
 <div className="flex justify-between text-sm">
 <span className="text-secondary">{item.label}</span>
 <span className="text-muted">
 {currentDisplay}
 {item.unit} / {maxDisplay}
 {item.unit}
 </span>
 </div>
 <div className="h-1.5 bg-[#e3e8ef] rounded-full mt-2">
 <div
 className="bg-[#0570de] rounded-full h-full"
 style={{ width: `${percentage}%` }}
 />
 </div>
 </div>
 );
 })}
 </div>
 </div>
 </div>
 </div>

 {/* Activity Feed */}
 <div className="bg-card border border-border rounded-lg p-5 px-6 mt-6">
 <h2 className="text-base font-semibold text-primary mb-2">
 {t('dashboard.recentActivity')}
 </h2>
 <div>
 {derivedActivities.map((item, index) => (
 <div
 key={index}
 className={cn(
 'flex items-start gap-3 py-3',
 index < derivedActivities.length - 1 &&
 'border-b border-border'
 )}
 >
 <div
 className={cn(
 'w-2 h-2 rounded-full mt-1.5 flex-shrink-0',
 item.color
 )}
 />
 <div className="flex-1">
 <p className="text-sm text-secondary">{item.text}</p>
 <p className="text-xs text-muted mt-0.5">{item.time}</p>
 </div>
 </div>
 ))}
 </div>
 </div>
 </div>
 );
}

function ScoreEvolutionCard({ history, onGenerateReport }) {
  const { t } = useTranslation();
  if (!history || history.length === 0) return null;
  
  const current = history[history.length - 1];
  const previous = history.length >= 2 ? history[history.length - 2] : null;
  const delta = previous ? current.score - previous.score : 0;
  
  const getScoreColor = (score) => {
    if (score >= 70) return '#10b981'; // green
    if (score >= 50) return '#f59e0b'; // amber
    return '#ef4444'; // red
  };
  
  const getRatingBadgeStyle = (rating) => {
    const r = (rating || '').toLowerCase();
    if (r.includes('approv') || r.includes('strong') || r.includes('excellent')) 
      return { background: '#ecfdf5', color: '#065f46', border: '1px solid #6ee7b7' };
    if (r.includes('review') || r.includes('develop') || r.includes('good')) 
      return { background: '#fffbeb', color: '#92400e', border: '1px solid #fcd34d' };
    return { background: '#fef2f2', color: '#991b1b', border: '1px solid #fca5a5' };
  };
  
  const MONTH_ABBR = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const formatMonth = (monthStr) => {
    if (!monthStr) return '';
    const parts = monthStr.split('-');
    if (parts.length === 2) {
      const mo = parseInt(parts[1], 10) - 1;
      return MONTH_ABBR[mo] || monthStr;
    }
    return monthStr;
  };
  
  const chartData = history.map(h => ({
    month: formatMonth(h.month),
    score: h.score,
    rating: h.rating,
    fullMonth: h.month,
  }));
  
  const scoreColor = getScoreColor(current.score);
  
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload;
      return (
        <div className="bg-card border border-border rounded-lg p-3 px-4 shadow-sm text-[13px]">
          <div className="font-semibold text-primary">{item.fullMonth}</div>
          <div style={{ color: getScoreColor(item.score), fontWeight: 700, fontSize: 18 }}>{item.score}</div>
          <div className="text-muted">{item.rating}</div>
        </div>
      );
    }
    return null;
  };
  
  return (
    <div className="bg-card border border-border rounded-xl p-6 mb-6">
      <div className="flex items-start justify-between mb-5">
        <div>
          <h2 className="text-base font-semibold text-primary m-0 mb-1">{t('score.evolution')}</h2>
          <p className="text-sm text-muted m-0">Financial solvency evolution</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ fontSize: 48, fontWeight: 800, color: scoreColor, lineHeight: 1 }}>
            {current.score}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={{ ...getRatingBadgeStyle(current.rating), padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600 }}>
              {current.rating}
            </span>
            {previous && (
              <span style={{ 
                fontSize: 13, fontWeight: 600,
                color: delta > 0 ? '#10b981' : delta < 0 ? '#ef4444' : '#6b7280'
              }}>
                {delta > 0 ? '↑' : delta < 0 ? '↓' : '→'} {Math.abs(delta)} pts
              </span>
            )}
          </div>
        </div>
      </div>
      
      {history.length >= 2 ? (
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="scoreGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={scoreColor} stopOpacity={0.2}/>
                <stop offset="95%" stopColor={scoreColor} stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
            <XAxis dataKey="month" tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
            <YAxis domain={[0, 100]} tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
            <Tooltip content={<CustomTooltip />} />
            <ReferenceLine y={70} stroke="#10b981" strokeDasharray="4 4" strokeOpacity={0.6} />
            <ReferenceLine y={50} stroke="#f59e0b" strokeDasharray="4 4" strokeOpacity={0.6} />
            <Area type="monotone" dataKey="score" stroke={scoreColor} strokeWidth={2.5} fill="url(#scoreGradient)" dot={{ fill: scoreColor, r: 4, strokeWidth: 0 }} activeDot={{ r: 6 }} />
          </AreaChart>
        </ResponsiveContainer>
      ) : (
        <p className="text-sm text-muted mt-4 mb-0">
          {t('score.trackEvolution')}
        </p>
      )}
    </div>
  );
}
