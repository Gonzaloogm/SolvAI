import React, { useState } from 'react';
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
import ReportDetailModal from '../components/ReportDetailModal.jsx';
import { solvencyReports, dataSources as dataSourcesApi, users, billing } from '../api/client.js';

const cn = (...classes) => classes.filter(Boolean).join(' ');

export default function DashboardPage({ onNavigate }) {
 const [syncingSources, setSyncingSources] = useState({});
 const [syncedSources, setSyncedSources] = useState({});
 const [syncedRecords, setSyncedRecords] = useState({});
 const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
 const [selectedReportForDetail, setSelectedReportForDetail] = useState(null);
 const [downloadingPdfId, setDownloadingPdfId] = useState(null);
 const { addToast } = useToast();

 const [realReports, setRealReports] = useState([]);
 const [realSources, setRealSources] = useState([]);
 const [userInfo, setUserInfo] = useState(null);
 const [subscription, setSubscription] = useState(null);
 const [loading, setLoading] = useState(true);
 const [generating, setGenerating] = useState(false);

 React.useEffect(() => {
   const fetchData = async () => {
     try {
       const [reportsRes, sourcesRes, userRes, subRes] = await Promise.all([
         solvencyReports.list().catch(() => ({ data: [] })),
         dataSourcesApi.list().catch(() => ({ data: [] })),
         users.me().catch(() => ({ data: null })),
         billing.getSubscription().catch(() => ({ data: { plan: 'free' } })),
       ]);
       const reps = Array.isArray(reportsRes.data) ? reportsRes.data : (reportsRes.data?.items ?? []);
       reps.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
       setRealReports(reps);
       const srcs = Array.isArray(sourcesRes.data) ? sourcesRes.data : (sourcesRes.data?.items ?? []);
       setRealSources(srcs);
       setUserInfo(userRes.data);
       setSubscription(subRes.data);
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
   : '\u2014';

 const statCards = [
 {
 label: 'Total Reports',
 value: String(realReports.length),
 trend: realReports.length > 0 ? `${realReports.filter(r => r.status === 'COMPLETED').length} completed` : null,
 trendType: 'success',
 icon: FileText,
 },
 {
 label: 'Data Sources',
 value: String(realSources.length),
 subtitle: 'connected',
 icon: Database,
 },
 {
 label: 'Avg Score',
 value: avgScore !== '\u2014' ? `${avgScore}%` : '\u2014',
 badge: avgScore !== '\u2014' && parseFloat(avgScore) >= 70 ? 'Good' : null,
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
 status: r.status === 'COMPLETED' ? 'Complete' : r.status === 'GENERATING' ? 'Processing' : r.status === 'FAILED' ? 'Failed' : 'Draft',
 created: r.created_at ? new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(r.created_at)) : '\u2014',
 accuracy: r.report_data?.overall_score ? `${r.report_data.overall_score}%` : null,
 hasDownload: r.status === 'COMPLETED',
 _raw: r,
 }));

 const displaySources = realSources.map(s => ({
 name: (s.source_type || s.type || 'Source').charAt(0).toUpperCase() + (s.source_type || s.type || 'Source').slice(1).toLowerCase(),
 icon: Database,
 bgColor: (s.source_type || s.type || '').toLowerCase() === 'stripe' ? 'bg-[#635bff]' : (s.source_type || s.type || '').toLowerCase() === 'xero' ? 'bg-[#00b0e0]' : 'bg-[#336791]',
 connected: (s.status || '').toUpperCase() === 'CONNECTED',
 lastSync: s.created_at ? new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short' }).format(new Date(s.created_at)) : '\u2014',
 }));

 const usageItems = [
 { label: 'Reports', current: realReports.length, max: subscription?.plan === 'pro' ? 1000 : 100, unit: '' },
 { label: 'Data Sources', current: realSources.length, max: subscription?.plan === 'pro' ? 10 : 4, unit: '' },
 ];

 const derivedActivities = realReports.slice(0, 5).map(r => ({
 color: r.status === 'COMPLETED' ? 'bg-[#1a9e6e]' : r.status === 'FAILED' ? 'bg-[#df1b41]' : 'bg-[#0570de]',
 text: `Report ${r.id?.split('-')[0]?.toUpperCase() || ''} ${r.status?.toLowerCase() || ''}`,
 time: r.created_at ? new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(r.created_at)) : '\u2014',
 }));

 const typeBadgeStyles = {
 Financial: 'badge-financial',
 Risk: 'badge-risk',
 Compliance: 'badge-compliance',
 Custom: 'badge-custom',
 };

 const statusBadgeStyles = {
 Complete: 'badge-complete',
 Processing: 'badge-processing',
 Failed: 'badge-failed',
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
 <h1 className="text-xl font-semibold text-primary">Dashboard</h1>
 <p className="text-sm text-muted">
 Overview of your AI explainability platform
 </p>
 </div>
 <button
   onClick={handleGenerate}
   disabled={generating}
   className="bg-[#0570de] text-white rounded-lg px-4 py-2.5 text-sm font-medium hover:bg-[#0462c7] flex items-center gap-2 transition-colors disabled:opacity-50"
 >
   {generating ? (
     <><Loader2 className="w-4 h-4 animate-spin" /> Generating...</>
   ) : (
     <><Plus className="w-4 h-4" /> New Report</>
   )}
 </button>
 </div>

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

 {/* Main Grid */}
 <div className="grid grid-cols-5 gap-6 mt-6">
 {/* Left: Recent Reports */}
 <div className="col-span-3 bg-card border border-border rounded-lg p-5 px-6">
 <div className="flex justify-between items-center mb-4">
 <h2 className="text-base font-semibold text-primary">
 Recent reports
 </h2>
 <button
 onClick={() => onNavigate && onNavigate('reports')}
 className="link-primary bg-transparent border-none p-0"
 >
 View all reports →
 </button>
 </div>
 <div className="w-full overflow-x-auto min-h-[200px]">
 <table className="w-full" style={{ tableLayout: 'fixed', minWidth: '700px' }}>
 <thead>
 <tr className="bg-page">
 <th className="text-left text-xs font-medium text-muted uppercase tracking-wider py-3 px-4" style={{ width: '40%' }}>
 Report name
 </th>
 <th className="text-left text-xs font-medium text-muted uppercase tracking-wider py-3 px-4" style={{ width: '15%' }}>
 Type
 </th>
 <th className="text-left text-xs font-medium text-muted uppercase tracking-wider py-3 px-4" style={{ width: '15%' }}>
 Status
 </th>
 <th className="text-left text-xs font-medium text-muted uppercase tracking-wider py-3 px-4" style={{ width: '15%' }}>
 Created
 </th>
 <th className="text-right text-xs font-medium text-muted uppercase tracking-wider py-3 px-4" style={{ width: '10%' }}>
 Accuracy
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
   const blob = new Blob([res.data], { type: 'application/pdf' });
   const url = URL.createObjectURL(blob);
   const a = document.createElement('a');
   a.href = url;
   a.download = `solvai_report_${reportId}.pdf`;
   a.click();
   URL.revokeObjectURL(url);
   addToast('PDF downloaded successfully', 'success');
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
 Data sources
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
 Recent activity
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
