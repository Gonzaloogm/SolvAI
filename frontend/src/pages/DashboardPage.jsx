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
} from 'lucide-react';
import { generateReportPDF } from '../lib/generateReportPDF';
import ReportDetailModal from '../components/ReportDetailModal.jsx';
import { mockApi } from '../lib/mockApi';

const cn = (...classes) => classes.filter(Boolean).join(' ');

export default function DashboardPage({ onNavigate }) {
 const [syncingSources, setSyncingSources] = useState({});
 const [syncedSources, setSyncedSources] = useState({});
 const [syncedRecords, setSyncedRecords] = useState({});
 const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
 const [selectedReportForDetail, setSelectedReportForDetail] = useState(null);
 const [downloadingPdfId, setDownloadingPdfId] = useState(null);
 const { addToast } = useToast();

 const handleSync = async (name) => {
 setSyncedRecords(prev => ({ ...prev, [name]: 'Syncing...' }));
 try {
 const result = await mockApi.syncSource(name);
 setSyncedRecords(prev => ({ ...prev, [name]: (prev[name] || 0) + result.newRecords }));
 setSyncedSources((prev) => ({ ...prev, [name]: true }));
 addToast(`Successfully synced ${name} (+${result.newRecords} records)`, 'success');
 } catch (error) {
 addToast(`Failed to sync ${name}`, 'error');
 } finally {
 setSyncingSources((prev) => ({ ...prev, [name]: false }));
 }
 };

 const statCards = [
 {
 label: 'Total Reports',
 value: '47',
 trend: '+12% this month',
 trendType: 'success',
 icon: FileText,
 },
 {
 label: 'Data Sources',
 value: '4',
 subtitle: 'connected',
 icon: Database,
 },
 {
 label: 'Avg Accuracy',
 value: '94.2%',
 badge: 'High',
 badgeType: 'success',
 icon: TrendingUp,
 },
 {
 label: 'API Calls',
 value: '1,240 / 10,000',
 progress: 12.4,
 icon: Activity,
 },
 ];

 const reports = [
 {
 name: 'Q3 Financial Analysis',
 type: 'Financial',
 status: 'Complete',
 created: 'Oct 15, 2024',
 accuracy: '96.1%',
 hasDownload: true,
 },
 {
 name: 'Risk Assessment Model v2',
 type: 'Risk',
 status: 'Processing',
 created: 'Oct 14, 2024',
 accuracy: null,
 hasDownload: false,
 },
 {
 name: 'Compliance Audit Report',
 type: 'Compliance',
 status: 'Complete',
 created: 'Oct 12, 2024',
 accuracy: '91.3%',
 hasDownload: true,
 },
 {
 name: 'Revenue Forecast 2025',
 type: 'Financial',
 status: 'Complete',
 created: 'Oct 10, 2024',
 accuracy: '88.7%',
 hasDownload: true,
 },
 {
 name: 'Credit Scoring Pipeline',
 type: 'Risk',
 status: 'Failed',
 created: 'Oct 9, 2024',
 accuracy: null,
 hasDownload: false,
 },
 ];

 const dataSources = [
 {
 name: 'Salesforce',
 icon: Cloud,
 bgColor: 'bg-[#0570de]',
 connected: true,
 lastSync: '2h ago',
 },
 {
 name: 'PostgreSQL',
 icon: Database,
 bgColor: 'bg-[#336791]',
 connected: true,
 lastSync: '30m ago',
 },
 {
 name: 'Google Sheets',
 icon: FileSpreadsheet,
 bgColor: 'bg-[#1a9e6e]',
 connected: true,
 lastSync: '1h ago',
 },
 {
 name: 'REST API',
 icon: Globe,
 bgColor: 'bg-[#c9870c]',
 connected: false,
 lastSync: 'Error',
 },
 ];

 const usageItems = [
 { label: 'Reports', current: 47, max: 100, unit: '' },
 { label: 'API Calls', current: 1240, max: 10000, unit: '' },
 { label: 'Storage', current: 2.1, max: 5.0, unit: ' GB' },
 ];

 const [activities, setActivities] = useState([
 {
 color: 'bg-[#1a9e6e]',
 text: "Report 'Q3 Financial Analysis' completed successfully",
 time: '2 hours ago',
 },
 {
 color: 'bg-[#0570de]',
 text: "New data source 'Google Sheets' connected",
 time: '5 hours ago',
 },
 {
 color: 'bg-[#c9870c]',
 text: "Report 'Risk Assessment Model v2' processing started",
 time: '6 hours ago',
 },
 {
 color: 'bg-[#df1b41]',
 text: "Report 'Credit Scoring Pipeline' failed — timeout error",
 time: '1 day ago',
 },
 {
 color: 'bg-[#0570de]',
 text: 'API key regenerated',
 time: '2 days ago',
 },
 ]);

 const loadMoreActivities = () => {
 const newItems = Array(5).fill(null).map((_, i) => ({
 color: 'bg-[#697386]',
 text: `Historical activity event ${activities.length + i + 1}`,
 time: `${activities.length + i + 2} days ago`,
 }));
 setActivities(prev => [...prev, ...newItems]);
 };

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

 return (
 <div className="page-enter">
 {/* Page Header */}
 <div>
 <h1 className="text-xl font-semibold text-primary">Dashboard</h1>
 <p className="text-sm text-muted">
 Overview of your AI explainability platform
 </p>
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
 addToast('Generating PDF report...', 'info');
 try {
 await generateReportPDF(report);
 addToast('PDF downloaded successfully', 'success');
 } catch (e) {
 console.error('PDF Generation Error:', e);
 addToast('Failed to generate PDF', 'error');
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
 {dataSources.map((source, index) => {
 const SourceIcon = source.icon;
 return (
 <div
 key={source.name}
 className={cn(
 'flex items-center justify-between py-3',
 index < dataSources.length - 1 &&
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
 {activities.map((item, index) => (
 <div
 key={index}
 className={cn(
 'flex items-start gap-3 py-3',
 index < activities.length - 1 &&
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
 <button
 onClick={loadMoreActivities}
 className="w-full mt-4 py-2 border border-border rounded-md text-sm font-medium text-primary hover:bg-page transition-colors cursor-pointer"
 >
 Load more
 </button>
 </div>
 </div>
 );
}
