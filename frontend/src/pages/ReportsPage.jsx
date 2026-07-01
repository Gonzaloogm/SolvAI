import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
 Plus,
 Search,
 Download,
 Trash2,
 MoreHorizontal,
 Eye,
 Copy,
 Database,
 X,
 Loader2,
 Lock,
 Check
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import ConfirmModal from '../components/ConfirmModal.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { solvencyReports } from '../api/client.js';
import apiClient from '../api/client.js';
import ReportDetailModal from '../components/ReportDetailModal.jsx';
import { useReportGeneration } from '../context/ReportGenerationContext.jsx';

// ── Utility ──────────────────────────────────────────────────────────────────
const cn = (...classes) => classes.filter(Boolean).join(' ');

// ── Badge Helpers ────────────────────────────────────────────────────────────
const TYPE_STYLES = {
 Financial: 'badge-financial',
 Risk: 'badge-risk',
 Compliance: 'badge-compliance',
 Custom: 'badge-custom',
 'Solvency Assessment': 'badge-financial',
 'Rental Certificate': 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
};

const STATUS_STYLES = {
 Complete: 'badge-complete',
 Processing: 'badge-processing',
 Failed: 'badge-failed',
 Draft: 'badge-draft',
};

const getAccuracyColor = (val) => {
 if (val === null || val === undefined) return 'text-muted';
 if (val >= 80) return 'text-[#1a9e6e] ';
 if (val >= 60) return 'text-[#c9870c] ';
 return 'text-[#df1b41] ';
};

// ── Component ────────────────────────────────────────────────────────────────
 export default function ReportsPage() {
  const [reports, setReports] = useState([]);
  const [selectedRows, setSelectedRows] = useState(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [downloadingPdfId, setDownloadingPdfId] = useState(null);
  
  const [openMenuId, setOpenMenuId] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [isPLModalOpen, setIsPLModalOpen] = useState(false);
  const [plData, setPLData] = useState(null);
  const [isLoadingPL, setIsLoadingPL] = useState(false);
  const navigate = useNavigate();
  
  // New States
  const { addToast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [generatingType, setGeneratingType] = useState("FULL");
  const { t } = useTranslation();
  
  const { generatingReports, startPolling } = useReportGeneration();
  
  const isGeneratingFull = Object.values(generatingReports).some(r => r.type === 'FULL_SOLVENCY');
  const isGeneratingRental = Object.values(generatingReports).some(r => r.type === 'RENTAL_CERTIFICATE');

  const fetchReports = useCallback(async () => {
    setLoading(true);
   try {
     const res = await solvencyReports.list();
     const data = Array.isArray(res.data) ? res.data : (res.data?.items ?? []);
     data.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      const mapped = data.map(r => ({
        id: r.id,
        name: `Report ${r.id?.split('-')[0]?.toUpperCase() || ''}`,
        subtitle: `Gemini \u00b7 ${r.report_data?.financial_summary?.connected_platforms?.join(', ') || 'SolvAI'}`,
        type: r.report_type === 'RENTAL_CERTIFICATE' ? 'Rental Certificate' : 'Solvency Assessment',
        status: r.status === 'COMPLETED' ? t('status.complete') : r.status === 'GENERATING' ? t('status.processing') : r.status === 'FAILED' ? t('status.failed') : t('status.pending'),
        dataSource: r.report_data?.financial_summary?.connected_platforms?.[0] || 'Stripe',
        accuracy: r.report_data?.overall_score ?? null,
       createdAt: r.created_at ? new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(r.created_at)) : '—',
       _raw: r,
     }));
     setReports(mapped);
   } catch (err) {
     console.error('Failed to load reports:', err);
   } finally {
     setLoading(false);
   }
 }, [t]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  useEffect(() => {
    const handler = () => fetchReports();
    window.addEventListener('solvai:report-completed', handler);
    return () => window.removeEventListener('solvai:report-completed', handler);
  }, [fetchReports]);
 
 const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
 const [confirmConfig, setConfirmConfig] = useState({ title: '', description: '', action: () => {}, confirmLabel: '', confirmVariant: 'primary' });
 
 const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
 const [selectedReportForDetail, setSelectedReportForDetail] = useState(null);

 const ITEMS_PER_PAGE = 8;
 const menuRef = useRef(null);

 // ── Close menu on click outside ──────────────────────────────────────────
 useEffect(() => {
 if (openMenuId === null) return;
 const handleClickOutside = (e) => {
 if (menuRef.current && !menuRef.current.contains(e.target)) {
 setOpenMenuId(null);
 }
 };
 document.addEventListener('mousedown', handleClickOutside);
 return () => document.removeEventListener('mousedown', handleClickOutside);
 }, [openMenuId]);

 // ── Close modal on Escape ────────────────────────────────────────────────
 useEffect(() => {
 if (!isModalOpen && !isDetailModalOpen && !isConfirmModalOpen) return;
 const handleEsc = (e) => {
 if (e.key === 'Escape') {
 setIsModalOpen(false);
 setIsDetailModalOpen(false);
 setIsConfirmModalOpen(false);
 }
 };
 document.addEventListener('keydown', handleEsc);
 return () => document.removeEventListener('keydown', handleEsc);
 }, [isModalOpen, isDetailModalOpen, isConfirmModalOpen]);

 // ── Filtering ────────────────────────────────────────────────────────────
 const filteredReports = reports.filter((r) => {
 // Search
 if (searchQuery) {
 const q = searchQuery.toLowerCase();
 if (
 !r.name.toLowerCase().includes(q) &&
 !r.subtitle.toLowerCase().includes(q) &&
 !r.type.toLowerCase().includes(q) &&
 !r.dataSource.toLowerCase().includes(q)
 ) {
 return false;
 }
 }
 // Status
 if (statusFilter !== 'all' && r.status !== statusFilter) return false;
 // Type
 if (typeFilter !== 'all' && r.type !== typeFilter) return false;
 // Date
 if (dateFilter !== 'all') {
 const reportDate = new Date(r.createdAt);
 const daysDiff = (new Date() - reportDate) / (1000 * 60 * 60 * 24);
 if (dateFilter === '7d' && daysDiff > 7) return false;
 if (dateFilter === '30d' && daysDiff > 30) return false;
 if (dateFilter === '90d' && daysDiff > 90) return false;
 }
 return true;
 });

 // Reset pagination on filter change
 useEffect(() => {
 setCurrentPage(1);
 }, [searchQuery, statusFilter, typeFilter, dateFilter]);

 const totalPages = Math.ceil(filteredReports.length / ITEMS_PER_PAGE);
 const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
 const paginatedReports = filteredReports.slice(startIndex, startIndex + ITEMS_PER_PAGE);

 // ── Checkbox logic ───────────────────────────────────────────────────────
 const allVisibleSelected =
 paginatedReports.length > 0 &&
 paginatedReports.every((r) => selectedRows.has(r.id));

 const toggleAll = () => {
 if (allVisibleSelected) {
 setSelectedRows((prev) => {
 const next = new Set([...prev]);
 paginatedReports.forEach(r => next.delete(r.id));
 return next;
 });
 } else {
 setSelectedRows((prev) => {
 const next = new Set([...prev]);
 paginatedReports.forEach(r => next.add(r.id));
 return next;
 });
 }
 };

 const toggleRow = (id) => {
 setSelectedRows((prev) => {
 const next = new Set([...prev]);
 if (next.has(id)) {
 next.delete(id);
 } else {
 next.add(id);
 }
 return next;
 });
 };

 // ── Actions ──────────────────────────────────────────────────────────────
 const handleMenuToggle = (e, id) => {
 e.stopPropagation();
 setOpenMenuId((prev) => (prev === id ? null : id));
 };

 const handleBulkDelete = () => {
 setConfirmConfig({
 title: 'Delete Reports',
 description: `Are you sure you want to remove ${selectedRows.size} reports from this view?`,
 confirmLabel: 'Remove',
 confirmVariant: 'danger',
 action: async () => {
 setReports((prev) => prev.filter((r) => !selectedRows.has(r.id)));
 setSelectedRows(new Set());
 addToast(`Removed ${selectedRows.size} reports`, 'success');
 }
 });
 setIsConfirmModalOpen(true);
 };
 
 const handleBulkDownload = () => {
 addToast(`Downloading ${selectedRows.size} reports...`, 'info');
 };

 const handleDownloadPDF = async (report) => {
 setDownloadingPdfId(report.id || report.name);
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
 addToast('PDF downloaded', 'success');
 } catch (e) {
 addToast(e?.response?.data?.detail || 'Failed to download PDF', 'error');
 } finally {
 setDownloadingPdfId(null);
 }
 setOpenMenuId(null);
 };

 const handleDelete = (id) => {
 setOpenMenuId(null);
 setConfirmConfig({
 title: 'Delete Report',
 description: 'Remove this report from the list?',
 confirmLabel: 'Remove',
 confirmVariant: 'danger',
 action: async () => {
 setReports(prev => prev.filter(r => r.id !== id));
 setSelectedRows(prev => { const next = new Set([...prev]); next.delete(id); return next; });
 addToast('Report removed', 'success');
 }
 });
 setIsConfirmModalOpen(true);
 };

 const handleDuplicate = (report) => {
 const newReport = {
 ...report,
 id: Date.now(),
 name: `${report.name} (Copy)`,
 createdAt: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
 };
 setReports((prev) => [newReport, ...prev]);
 addToast('Report duplicated', 'success');
 setOpenMenuId(null);
 };

 const handleAddReport = async (e) => {
  if (e) e.preventDefault();
  setIsModalOpen(false);
  try {
    let res;
    if (generatingType === 'FULL') {
      res = await solvencyReports.create({});
      startPolling(res.data.id, 'FULL_SOLVENCY');
    } else {
      res = await solvencyReports.createRental({});
      startPolling(res.data.id, 'RENTAL_CERTIFICATE');
    }
  } catch (err) {
    if (generatingType === 'RENTAL' && (err.response?.status === 402 || err.response?.data?.detail?.includes('limit'))) {
      setShowUpgradeModal(true);
    } else {
      addToast(err?.response?.data?.detail || 'Failed to start report generation', 'error');
    }
  }
 };

 const handlePrevPage = () => setCurrentPage((p) => Math.max(1, p - 1));
 const handleNextPage = () => setCurrentPage((p) => Math.min(totalPages, p + 1));

 const handlePreviewPL = async () => {
   setIsLoadingPL(true);
   setIsPLModalOpen(true);
   try {
     const res = await apiClient.get('/reports/pl-statement?months=12');
     setPLData(res.data);
   } catch (err) {
     addToast('Failed to load P&L statement', 'error');
     setIsPLModalOpen(false);
   } finally {
     setIsLoadingPL(false);
   }
 };

 const handleDownloadPL = async () => {
   addToast('Downloading P&L PDF...', 'info');
   try {
     const res = await apiClient.get('/reports/pl-statement/pdf?months=12', { responseType: 'blob' });
     const blob = new Blob([res.data], { type: 'application/pdf' });
     const url = URL.createObjectURL(blob);
     const a = document.createElement('a');
     a.href = url;
     a.download = `pl_statement.pdf`;
     a.click();
     URL.revokeObjectURL(url);
     addToast('PDF downloaded', 'success');
   } catch (e) {
     addToast('Failed to download PDF', 'error');
   }
 };

 if (loading) {
 return (
 <div className="flex items-center justify-center" style={{minHeight: '60vh'}}>
 <Loader2 className="w-8 h-8 animate-spin text-[#0570de]" />
 </div>
 );
 }

 return (
  <div className="page-enter">
  {/* ── 1. PAGE HEADER ─────────────────────────────────────────────────── */}
  <div className="flex justify-between items-start">
    <div>
      <h1 className="text-xl font-semibold text-primary">{t('reports.title')}</h1>
      <p className="text-sm text-muted mt-1">
        {t('reports.subtitle')}
      </p>
    </div>
    <div className="flex gap-2">
      <button 
        onClick={() => {
          setGeneratingType("FULL");
          setIsModalOpen(true);
        }}
        disabled={isGeneratingFull}
        className="bg-[#0570de] text-white rounded-lg px-4 py-2.5 text-sm font-medium hover:bg-[#0462c7] flex items-center gap-2 transition-colors disabled:opacity-50"
      >
        {isGeneratingFull ? (
          <><Loader2 className="w-4 h-4 animate-spin" /> {t('dashboard.generating')}</>
        ) : (
          <><Plus className="w-4 h-4" /> {t('reports.fullSolvency') || "Generate Full Report"}</>
        )}
      </button>
      <button 
        onClick={() => {
          setGeneratingType("RENTAL");
          setIsModalOpen(true);
        }}
        disabled={isGeneratingRental}
        className="bg-[#10b981] text-white rounded-lg px-4 py-2.5 text-sm font-medium hover:bg-[#059669] flex items-center gap-2 transition-colors disabled:opacity-50"
      >
        {isGeneratingRental ? (
          <><Loader2 className="w-4 h-4 animate-spin" /> {t('dashboard.generating')}</>
        ) : (
          <><Plus className="w-4 h-4" /> {t('reports.rentalCertificate') || "Generate Rental Certificate"}</>
        )}
      </button>
    </div>
  </div>

  {Object.values(generatingReports).length > 0 && (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      padding: '14px 16px',
      background: 'var(--bg-blue-soft, #eff6ff)',
      border: '1px solid var(--border-blue-soft, #bfdbfe)',
      borderRadius: '8px',
      marginTop: '16px'
    }} className="dark:bg-[#0570de]/10 dark:border-[#0570de]/30">
      <Loader2 size={18} color="#0570de" className="animate-spin" />
      <div>
        <div style={{
          fontSize: '14px', 
          fontWeight: 500, 
        }} className="text-[#0a2540] dark:text-[#60a5fa]">
          Generating your report
        </div>
        <div style={{
          fontSize: '12px', 
        }} className="text-[#425466] dark:text-[#93c5fd]">
          Analyzing your financial data with AI — this usually takes 30-60 seconds
        </div>
      </div>
    </div>
  )}

 {/* ── 2. FILTER BAR ──────────────────────────────────────────────────── */}
 <div className="mt-6 flex flex-wrap items-center gap-3">
 {/* Search */}
 <div className="flex-1 min-w-[200px] relative">
 <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted w-4 h-4 pointer-events-none" />
 <input
 type="text"
 placeholder={t('reports.search')}
 value={searchQuery}
 onChange={(e) => setSearchQuery(e.target.value)}
 className="w-full h-9 border border-border rounded-md pl-10 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#0570de] bg-card text-primary placeholder:text-muted dark:placeholder-[#666666]"
 />
 </div>

 {/* Status select */}
 <select
 value={statusFilter}
 onChange={(e) => setStatusFilter(e.target.value)}
 className="h-9 border border-border rounded-md px-3 pr-8 text-sm bg-card appearance-none text-secondary cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#0570de]"
 >
 <option value="all">All Statuses</option>
 <option value="Complete">Complete</option>
 <option value="Processing">Processing</option>
 <option value="Failed">Failed</option>
 <option value="Draft">Draft</option>
 </select>

 {/* Type select */}
 <select
 value={typeFilter}
 onChange={(e) => setTypeFilter(e.target.value)}
 className="h-9 border border-border rounded-md px-3 pr-8 text-sm bg-card appearance-none text-secondary cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#0570de]"
 >
 <option value="all">All Types</option>
 <option value="Financial">Financial</option>
 <option value="Risk">Risk</option>
 <option value="Compliance">Compliance</option>
 <option value="Custom">Custom</option>
 </select>

 {/* Date select */}
 <select
 value={dateFilter}
 onChange={(e) => setDateFilter(e.target.value)}
 className="h-9 border border-border rounded-md px-3 pr-8 text-sm bg-card appearance-none text-secondary cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#0570de]"
 >
 <option value="all">All Dates</option>
 <option value="7d">Last 7 days</option>
 <option value="30d">Last 30 days</option>
 <option value="90d">Last 90 days</option>
 </select>
 </div>

 {/* ── 3. BULK ACTIONS BAR ────────────────────────────────────────────── */}
 <div
 className={cn(
 'transition-all overflow-hidden',
 selectedRows.size > 0
 ? 'mt-4 max-h-20 opacity-100'
 : 'max-h-0 opacity-0'
 )}
 >
 <div className="bg-[#0a2540] text-white rounded-lg px-4 py-3 flex items-center justify-between border ">
 <span className="text-sm font-medium">
 {selectedRows.size} selected
 </span>
 <div className="flex gap-2">
 <button 
 onClick={handleBulkDownload}
 className="bg-card/10 hover:bg-card/20 text-white border border-white/20 rounded-md px-3 py-1.5 text-sm flex items-center gap-1.5 transition-colors"
 >
 <Download className="w-3.5 h-3.5" />
 Download
 </button>
 <button 
 onClick={handleBulkDelete}
 className="bg-[#df1b41] hover:bg-[#c5183a] text-white rounded-md px-3 py-1.5 text-sm flex items-center gap-1.5 transition-colors"
 >
 <Trash2 className="w-3.5 h-3.5" />
 {t('common.delete')}
 </button>
 </div>
 </div>
 </div>

 {/* ── 3.5. FINANCIAL STATEMENTS CARD ──────────────────────────────────── */}
 <div className="mt-6 bg-card border border-border rounded-lg overflow-hidden p-6 mb-6">
   <h2 className="text-lg font-semibold text-primary mb-4">Financial Statements</h2>
   <div className="flex items-center justify-between bg-page p-4 rounded-lg border border-border">
     <div>
       <h3 className="font-medium text-primary">Profit &amp; Loss Statement</h3>
       <p className="text-sm text-muted">Auto-generated P&amp;L based on your connected data sources.</p>
     </div>
     <div className="flex gap-2">
       <button 
         onClick={handlePreviewPL}
         className="px-4 py-2 border border-border rounded-lg text-sm font-medium hover:bg-[#f0f2f5] text-secondary flex items-center gap-2"
       >
         <Eye className="w-4 h-4" /> Preview
       </button>
       <button 
         onClick={handleDownloadPL}
         className="px-4 py-2 bg-[#0570de] text-white rounded-lg text-sm font-medium hover:bg-[#0462c7] flex items-center gap-2"
       >
         <Download className="w-4 h-4" /> Download PDF
       </button>
     </div>
   </div>
 </div>

 {/* ── 4. TABLE CARD ──────────────────────────────────────────────────── */}
 <div className="mt-4 bg-card border border-border rounded-lg overflow-hidden">
 {/* Results count */}
 <div className="px-6 py-3 border-b border-border">
 <span className="text-sm text-muted">
 Showing {filteredReports.length} reports
 </span>
 </div>

 {/* Table */}
 <div className="overflow-x-auto w-full min-h-[300px]">
 <table className="w-full" style={{ tableLayout: 'fixed', minWidth: '800px' }}>
 <thead className="bg-page">
 <tr>
 <th className="py-3 px-4" style={{ width: '40px' }}>
 <input
 type="checkbox"
 checked={allVisibleSelected}
 onChange={toggleAll}
 className="w-4 h-4 rounded border-gray-300 accent-[#0570de] cursor-pointer"
 />
 </th>
 <th className="py-3 px-4 text-left text-xs font-medium text-muted uppercase tracking-wider" style={{ width: '22%' }}>
 {t('reports.columns.name')}
 </th>
 <th className="py-3 px-4 text-left text-xs font-medium text-muted uppercase tracking-wider" style={{ width: '18%' }}>
 {t('reports.columns.type')}
 </th>
 <th className="py-3 px-4 text-left text-xs font-medium text-muted uppercase tracking-wider" style={{ width: '14%' }}>
 {t('reports.columns.status')}
 </th>
 <th className="py-3 px-4 text-left text-xs font-medium text-muted uppercase tracking-wider" style={{ width: '13%' }}>
 {t('reports.columns.source')}
 </th>
 <th className="py-3 px-4 text-right text-xs font-medium text-muted uppercase tracking-wider" style={{ width: '10%' }}>
 {t('reports.columns.score')}
 </th>
 <th className="py-3 px-4 text-left text-xs font-medium text-muted uppercase tracking-wider" style={{ width: '12%' }}>
 {t('reports.columns.created')}
 </th>
 <th className="py-3 px-4 text-right text-xs font-medium text-muted uppercase tracking-wider" style={{ width: '6%' }}>
 <span className="sr-only">Actions</span>
 </th>
 </tr>
 </thead>

 <tbody>
 {paginatedReports.length === 0 ? (
 <tr>
 <td colSpan={8} className="py-12 text-center text-muted">
 {t('reports.noResults')}
 </td>
 </tr>
 ) : (
 paginatedReports.map((report) => (
 <tr
 key={report.id}
 className="hover:bg-page border-b border-border transition-colors group last:border-b-0 cursor-pointer"
 onClick={() => {
 setSelectedReportForDetail(report);
 setIsDetailModalOpen(true);
 }}
 >
 {/* Checkbox */}
 <td className="py-3 px-4">
 <input
 type="checkbox"
 checked={selectedRows.has(report.id)}
 onChange={() => toggleRow(report.id)}
 onClick={(e) => e.stopPropagation()}
 className="w-4 h-4 rounded border-gray-300 accent-[#0570de] cursor-pointer"
 />
 </td>

 {/* Report name */}
 <td className="py-3 px-4 whitespace-nowrap overflow-hidden text-ellipsis">
 <div className="text-[14px] font-medium text-primary truncate">
 {report.name}
 </div>
 <div className="text-[13px] text-muted mt-0.5 truncate">
 {report.subtitle}
 </div>
 </td>

 {/* Type badge */}
  <td className="py-3 px-4 whitespace-nowrap overflow-hidden text-ellipsis">
    <span className={cn(TYPE_STYLES[report.type] || TYPE_STYLES.Custom, "block truncate max-w-full")}>
      {report.type}
    </span>
  </td>

 {/* Status badge */}
  <td className="py-3 px-4 whitespace-nowrap overflow-hidden text-ellipsis">
    <span className={cn(STATUS_STYLES[report.status] || STATUS_STYLES.Draft, "block truncate max-w-full")}>
      {report.status}
    </span>
  </td>

 {/* Data Source */}
 <td className="py-3 px-4 whitespace-nowrap overflow-hidden text-ellipsis">
 <div className="flex items-center gap-1.5">
 <Database className="w-3.5 h-3.5 text-muted shrink-0" />
 <span className="text-sm text-secondary truncate">
 {report.dataSource}
 </span>
 </div>
 </td>

 {/* Accuracy */}
 <td className="py-3 px-4 text-right whitespace-nowrap">
 <span
 className={cn(
 'text-sm font-medium',
 getAccuracyColor(report.accuracy)
 )}
 >
 {report.accuracy !== null
 ? `${report.accuracy}%`
 : '—'}
 </span>
 </td>

 {/* Created */}
 <td className="py-3 px-4 whitespace-nowrap">
 <span className="text-sm text-muted">
 {report.createdAt}
 </span>
 </td>

 {/* Actions */}
 <td className="py-3 px-4 text-right whitespace-nowrap">
 <div className="relative" ref={openMenuId === report.id ? menuRef : undefined}>
 <button
 onClick={(e) => handleMenuToggle(e, report.id)}
 className="p-1 rounded-md hover:bg-[#f0f2f5] transition-colors text-muted hover:text-primary "
 >
 <MoreHorizontal className="w-4 h-4" />
 </button>

 {/* Dropdown menu */}
 {openMenuId === report.id && (
 <div className="absolute right-0 top-full mt-1 bg-card border border-border rounded-lg shadow-lg py-1 w-44 z-10 text-left">
 <button 
 onClick={(e) => {
 e.stopPropagation();
 setSelectedReportForDetail(report);
 setIsDetailModalOpen(true);
 setOpenMenuId(null);
 }}
 className="w-full px-3 py-2 text-sm hover:bg-page cursor-pointer flex items-center gap-2 text-secondary"
 >
 <Eye className="w-4 h-4" />
 {t('reports.actions.view')}
 </button>
 <button 
 onClick={(e) => {
 e.stopPropagation();
 handleDownloadPDF(report);
 }}
 disabled={downloadingPdfId === report.name}
 className="w-full px-3 py-2 text-sm hover:bg-page cursor-pointer flex items-center gap-2 text-secondary disabled:opacity-50"
 >
 {downloadingPdfId === report.name ? (
 <>
 <Loader2 className="w-4 h-4 animate-spin" />
 Generating...
 </>
 ) : (
 <>
 <Download className="w-4 h-4" />
 Download PDF
 </>
 )}
 </button>
 <button 
 onClick={(e) => {
 e.stopPropagation();
 handleDuplicate(report);
 }}
 className="w-full px-3 py-2 text-sm hover:bg-page cursor-pointer flex items-center gap-2 text-secondary"
 >
 <Copy className="w-4 h-4" />
 {t('reports.actions.duplicate')}
 </button>
 <div className="border-t border-border my-1" />
 <button 
 onClick={(e) => {
 e.stopPropagation();
 handleDelete(report.id);
 }}
 className="w-full px-3 py-2 text-sm hover:bg-page cursor-pointer flex items-center gap-2 text-[#df1b41] "
 >
 <Trash2 className="w-4 h-4" />
 {t('reports.actions.delete')}
 </button>
 </div>
 )}
 </div>
 </td>
 </tr>
 ))
 )}
 </tbody>
 </table>
 </div>

 {/* ── 5. PAGINATION ──────────────────────────────────────────────────── */}
 <div className="px-6 py-4 flex justify-between items-center border-t border-border">
 <span className="text-sm text-muted">
 Showing {filteredReports.length === 0 ? 0 : startIndex + 1}–{Math.min(startIndex + ITEMS_PER_PAGE, filteredReports.length)} of {filteredReports.length} reports
 </span>
 <div className="flex items-center gap-1">
 <button
 onClick={handlePrevPage}
 disabled={currentPage === 1}
 className={cn(
 "px-3 py-1.5 text-sm rounded-md border border-border transition-colors",
 currentPage === 1 
 ? "text-muted opacity-50 cursor-not-allowed" 
 : "text-secondary hover:bg-page "
 )}
 >
 ← Previous
 </button>
 {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
 <button
 key={p}
 onClick={() => setCurrentPage(p)}
 className={cn(
 "px-3 py-1.5 text-sm rounded-md transition-colors",
 currentPage === p
 ? "bg-[#0570de] text-white border border-[#0570de]"
 : "border border-border text-secondary hover:bg-page "
 )}
 >
 {p}
 </button>
 ))}
 <button
 onClick={handleNextPage}
 disabled={currentPage === totalPages || totalPages === 0}
 className={cn(
 "px-3 py-1.5 text-sm rounded-md border border-border transition-colors",
 currentPage === totalPages || totalPages === 0
 ? "text-muted opacity-50 cursor-not-allowed" 
 : "text-secondary hover:bg-page "
 )}
 >
 Next →
 </button>
 </div>
 </div>
 </div>

 {/* ── 6. NEW REPORT MODAL ────────────────────────────────────────────── */}
 {showUpgradeModal && (
    <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
      <div className="bg-card rounded-xl w-full max-w-md shadow-2xl overflow-hidden border border-border p-6 text-center relative">
        <div style={{
          width: '48px', height: '48px',
          background: '#eff6ff',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 16px'
        }}>
          <Lock size={24} color="#0570de" />
        </div>
        <h2 style={{fontSize: '18px', fontWeight: 600, marginBottom: '8px', color: 'var(--text-primary)'}}>
          Upgrade to Generate Reports
        </h2>
        <p style={{color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '24px'}}>
          You&apos;ve reached your free plan limit. Upgrade to Pro for unlimited solvency reports and rental certificates.
        </p>
        <div style={{
          background: 'var(--bg-page)',
          border: '1px solid var(--border-color)',
          borderRadius: '8px',
          padding: '16px',
          marginBottom: '24px',
          textAlign: 'left'
        }}>
          <div style={{fontWeight: 600, marginBottom: '8px', color: 'var(--text-primary)'}}>
            Pro — €29/month
          </div>
          {['Unlimited solvency reports',
            'Unlimited rental certificates', 
            '10 data sources',
            'Priority support',
            'PDF downloads'].map(f => (
            <div key={f} style={{
              display: 'flex', gap: '8px',
              fontSize: '13px',
              color: 'var(--text-secondary)',
              marginBottom: '4px'
            }}>
              <Check size={14} color="#1a9e6e" style={{flexShrink: 0, marginTop: '2px'}}/>
              {f}
            </div>
          ))}
        </div>
        <button 
          onClick={() => {
            setShowUpgradeModal(false);
            navigate('/account');
          }}
          style={{
            width: '100%',
            padding: '10px',
            background: '#0570de',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: 500,
            cursor: 'pointer'
          }}
        >
          Upgrade to Pro
        </button>
        <button
          onClick={() => setShowUpgradeModal(false)}
          style={{
            width: '100%',
            padding: '10px',
            background: 'transparent',
            color: 'var(--text-muted)',
            border: 'none',
            fontSize: '13px',
            cursor: 'pointer',
            marginTop: '8px'
          }}
        >
          Maybe later
        </button>
      </div>
    </div>
  )}

 {isModalOpen && (
 <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
 <div className="bg-card rounded-xl w-full max-w-md shadow-2xl overflow-hidden border border-border">
 <div className="flex justify-between items-center p-6 border-b border-border">
 <h2 className="text-lg font-semibold text-primary">
   {generatingType === 'FULL' ? 'Generate Solvency Report' : 'Generate Rental Certificate'}
 </h2>
 <button 
 onClick={() => setIsModalOpen(false)}
 className="text-muted hover:text-primary transition-colors"
 >
 <X className="w-5 h-5" />
 </button>
 </div>
 
 <div className="p-6">
   <p className="text-sm text-secondary mb-4">
     {generatingType === 'FULL' 
       ? "We'll analyze your connected financial data sources and generate a comprehensive solvency report using AI. This typically takes 30-60 seconds."
       : "We'll create a simplified rental solvency certificate showing your income stability and recommended maximum rent, based on your connected financial data."}
   </p>
 </div>

 <div className="p-6 border-t border-border bg-page flex justify-end gap-3">
 <button
 type="button"
 onClick={() => setIsModalOpen(false)}
 className="px-4 py-2 text-sm font-medium text-secondary hover:text-primary transition-colors"
 >
 {t('common.cancel')}
 </button>
 <button
 type="button"
 onClick={handleAddReport}
 disabled={isProcessing}
 className="bg-[#0570de] text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-[#0462c7] transition-colors disabled:opacity-50 flex items-center gap-2"
 >
 {isProcessing && <Loader2 className="w-4 h-4 animate-spin" />}
 {generatingType === 'FULL' ? 'Generate Report' : 'Generate Certificate'}
 </button>
 </div>
 </div>
 </div>
 )}

 {/* ── 7. DETAIL MODAL ────────────────────────────────────────────────── */}
 {isDetailModalOpen && selectedReportForDetail && (
 <ReportDetailModal 
 report={selectedReportForDetail._raw || selectedReportForDetail} 
 onClose={() => setIsDetailModalOpen(false)} 
 />
 )}

 {/* ── 8. CONFIRM MODAL ───────────────────────────────────────────────── */}
 <ConfirmModal
 isOpen={isConfirmModalOpen}
 onClose={() => setIsConfirmModalOpen(false)}
 title={confirmConfig.title}
 description={confirmConfig.description}
 confirmLabel={confirmConfig.confirmLabel}
 confirmVariant={confirmConfig.confirmVariant}
 onConfirm={confirmConfig.action}
 />

 {/* ── 9. PL PREVIEW MODAL ───────────────────────────────────────────────── */}
 {isPLModalOpen && (
   <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
     <div className="bg-card rounded-xl w-full max-w-4xl max-h-[90vh] shadow-2xl overflow-hidden border border-border flex flex-col">
       <div className="flex justify-between items-center p-6 border-b border-border">
         <h2 className="text-lg font-semibold text-primary">Profit &amp; Loss Statement Preview</h2>
         <button 
           onClick={() => setIsPLModalOpen(false)}
           className="text-muted hover:text-primary transition-colors"
         >
           <X className="w-5 h-5" />
         </button>
       </div>
       
       <div className="p-6 overflow-y-auto flex-1">
         {isLoadingPL ? (
           <div className="flex justify-center items-center py-20">
             <Loader2 className="w-8 h-8 animate-spin text-[#0570de]" />
           </div>
         ) : plData ? (
           <div>
             <div className="grid grid-cols-4 gap-4 mb-6">
               <div className="p-4 bg-page rounded-lg border border-border text-center">
                 <div className="text-xs text-muted uppercase">Total Revenue</div>
                 <div className="text-lg font-bold mt-1 text-primary">
                   {plData.revenue.total.toLocaleString()} {plData.currency}
                 </div>
               </div>
               <div className="p-4 bg-page rounded-lg border border-border text-center">
                 <div className="text-xs text-muted uppercase">Avg Monthly</div>
                 <div className="text-lg font-bold mt-1 text-primary">
                   {plData.revenue.avg_monthly.toLocaleString()} {plData.currency}
                 </div>
               </div>
               <div className="p-4 bg-page rounded-lg border border-border text-center">
                 <div className="text-xs text-muted uppercase">YoY Growth</div>
                 <div className="text-lg font-bold mt-1 text-[#1a9e6e]">
                   +{plData.growth.yoy_change}%
                 </div>
               </div>
               <div className="p-4 bg-page rounded-lg border border-border text-center">
                 <div className="text-xs text-muted uppercase">Concentration</div>
                 <div className="text-lg font-bold mt-1 text-[#c9870c]">
                   {plData.client_analysis.concentration_risk}
                 </div>
               </div>
             </div>
             
             <h3 className="font-semibold text-primary mb-3">Monthly Revenue</h3>
             <div className="border border-border rounded-lg overflow-hidden">
               <table className="w-full text-sm text-left">
                 <thead className="bg-page border-b border-border text-muted">
                   <tr>
                     <th className="p-3 font-medium">Month</th>
                     <th className="p-3 font-medium text-right">Revenue</th>
                     <th className="p-3 font-medium text-right">Expenses</th>
                     <th className="p-3 font-medium text-right">Net Profit</th>
                   </tr>
                 </thead>
                 <tbody>
                   {plData.revenue.monthly.map((m, i) => (
                     <tr key={i} className="border-b border-border last:border-0 hover:bg-page">
                       <td className="p-3 text-secondary">{m.month}</td>
                       <td className="p-3 text-right text-secondary">{m.revenue.toLocaleString()}</td>
                       <td className="p-3 text-right text-secondary">{m.expenses.toLocaleString()}</td>
                       <td className="p-3 text-right text-primary font-medium">{(m.revenue - m.expenses).toLocaleString()}</td>
                     </tr>
                   ))}
                 </tbody>
               </table>
             </div>
           </div>
         ) : (
           <div className="text-center py-20 text-muted">No data available.</div>
         )}
       </div>

       <div className="p-6 border-t border-border bg-page flex justify-end gap-3">
         <button
           type="button"
           onClick={() => setIsPLModalOpen(false)}
           className="px-4 py-2 text-sm font-medium text-secondary hover:text-primary transition-colors"
         >
           Close
         </button>
         <button
           type="button"
           onClick={handleDownloadPL}
           className="bg-[#0570de] text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-[#0462c7] transition-colors flex items-center gap-2"
         >
           <Download className="w-4 h-4" /> Download PDF
         </button>
       </div>
     </div>
   </div>
 )}

 {/* ── PROCESSING OVERLAY ─────────────────────────────────────────────── */}
 {isProcessing && (
 <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/10 dark:bg-black/40">
 <Loader2 className="w-8 h-8 animate-spin text-[#0570de]" />
 </div>
 )}
 </div>
 );
}
