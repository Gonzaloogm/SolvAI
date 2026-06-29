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
import ReportDetailModal from '../components/ReportDetailModal.jsx';

// ── Utility ──────────────────────────────────────────────────────────────────
const cn = (...classes) => classes.filter(Boolean).join(' ');

// ── Badge Helpers ────────────────────────────────────────────────────────────
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
 const navigate = useNavigate();
 
 // New States
 const { addToast } = useToast();
 const [isProcessing, setIsProcessing] = useState(false);
 const [loading, setLoading] = useState(true);
 const [generating, setGenerating] = useState(false);
 const [generatingType, setGeneratingType] = useState("FULL");
 const { t } = useTranslation();

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
       type: 'Solvency',
       status: r.status === 'COMPLETED' ? t('status.complete') : r.status === 'GENERATING' ? t('status.processing') : r.status === 'FAILED' ? t('status.failed') : t('status.pending'),
       dataSource: r.report_data?.financial_summary?.connected_platforms?.[0] || 'Stripe',
       accuracy: r.report_data?.overall_score ?? null,
       createdAt: r.created_at ? new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(r.created_at)) : '\u2014',
       _raw: r,
     }));
     setReports(mapped);
   } catch (err) {
     console.error('Failed to load reports:', err);
   } finally {
     setLoading(false);
   }
 }, []);

 useEffect(() => {
   fetchReports();
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
 setGenerating(true);
 try {
 const res = await solvencyReports.create({ report_type: generatingType });
 const newId = res.data?.id;
 if (!newId) throw new Error('No report ID returned');
 addToast('Report generation started \u2014 analyzing financial data...', 'info');
 const poll = setInterval(async () => {
 try {
 const pollRes = await solvencyReports.get(newId);
 const status = pollRes.data?.status;
 if (status === 'COMPLETED') {
 clearInterval(poll);
 setGenerating(false);
 addToast('Report generated successfully!', 'success');
 fetchReports();
 } else if (status === 'FAILED') {
 clearInterval(poll);
 setGenerating(false);
 const errMsg = pollRes.data?.report_data?.error || 'Report generation failed';
 addToast(errMsg, 'error');
 fetchReports();
 }
 } catch (e) {
 clearInterval(poll);
 setGenerating(false);
 }
 }, 3000);
 } catch (err) {
 setGenerating(false);
 if (generatingType === 'RENTAL' && (err.response?.status === 402 || err.response?.data?.detail?.includes('limit'))) {
   setShowUpgradeModal(true);
 } else {
   addToast(err?.response?.data?.detail || 'Failed to start report generation', 'error');
 }
 }
 };

 const handlePrevPage = () => setCurrentPage((p) => Math.max(1, p - 1));
 const handleNextPage = () => setCurrentPage((p) => Math.min(totalPages, p + 1));

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
 disabled={generating}
 className="bg-[#0570de] text-white rounded-lg px-4 py-2.5 text-sm font-medium hover:bg-[#0462c7] flex items-center gap-2 transition-colors disabled:opacity-50"
 >
 {generating && generatingType === "FULL" ? (
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
 disabled={generating}
 className="bg-[#10b981] text-white rounded-lg px-4 py-2.5 text-sm font-medium hover:bg-[#059669] flex items-center gap-2 transition-colors disabled:opacity-50"
 >
 {generating && generatingType === "RENTAL" ? (
 <><Loader2 className="w-4 h-4 animate-spin" /> {t('dashboard.generating')}</>
 ) : (
 <><Plus className="w-4 h-4" /> {t('reports.rentalCertificate') || "Generate Rental Certificate"}</>
 )}
 </button>
 </div>
 </div>

 {generating && (
 <div className="mt-4 bg-[#eff6ff] dark:bg-[#0d1f3c] border border-[#0570de]/30 rounded-lg px-4 py-3 flex items-center gap-3">
 <Loader2 className="w-5 h-5 animate-spin text-[#0570de]" />
 <span className="text-sm font-medium text-[#0570de]">Generating report \u2014 analyzing your financial data...</span>
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
 <th className="py-3 px-4 text-left text-xs font-medium text-muted uppercase tracking-wider" style={{ width: '28%' }}>
 {t('reports.columns.name')}
 </th>
 <th className="py-3 px-4 text-left text-xs font-medium text-muted uppercase tracking-wider" style={{ width: '12%' }}>
 {t('reports.columns.type')}
 </th>
 <th className="py-3 px-4 text-left text-xs font-medium text-muted uppercase tracking-wider" style={{ width: '12%' }}>
 {t('reports.columns.status')}
 </th>
 <th className="py-3 px-4 text-left text-xs font-medium text-muted uppercase tracking-wider" style={{ width: '15%' }}>
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
 <td className="py-3 px-4 whitespace-nowrap">
 <span className={TYPE_STYLES[report.type] || TYPE_STYLES.Custom}>
 {report.type}
 </span>
 </td>

 {/* Status badge */}
 <td className="py-3 px-4 whitespace-nowrap">
 <span className={STATUS_STYLES[report.status] || STATUS_STYLES.Draft}>
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
          You've reached your free plan limit. Upgrade to Pro for unlimited solvency reports and rental certificates.
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
 <h2 className="text-lg font-semibold text-primary">New Report</h2>
 <button 
 onClick={() => setIsModalOpen(false)}
 className="text-muted hover:text-primary transition-colors"
 >
 <X className="w-5 h-5" />
 </button>
 </div>
 
 <form onSubmit={handleAddReport}>
 <div className="p-6 space-y-4">
 <div>
 <label className="block text-sm font-medium text-secondary mb-1.5">
 Name <span className="text-[#df1b41]">*</span>
 </label>
 <input
 name="name"
 required
 autoFocus
 placeholder="e.g., Q4 Analysis"
 className="w-full h-10 px-3 rounded-md border border-border bg-card text-primary focus:outline-none focus:ring-2 focus:ring-[#0570de] placeholder:text-muted dark:placeholder-[#666666]"
 />
 </div>
 
 <div>
 <label className="block text-sm font-medium text-secondary mb-1.5">
 Type
 </label>
 <select
 name="type"
 className="w-full h-10 px-3 rounded-md border border-border bg-card text-primary focus:outline-none focus:ring-2 focus:ring-[#0570de]"
 >
 <option value="Financial">Financial</option>
 <option value="Risk">Risk</option>
 <option value="Compliance">Compliance</option>
 <option value="Custom">Custom</option>
 </select>
 </div>

 <div>
 <label className="block text-sm font-medium text-secondary mb-1.5">
 Data Source
 </label>
 <select
 name="dataSource"
 className="w-full h-10 px-3 rounded-md border border-border bg-card text-primary focus:outline-none focus:ring-2 focus:ring-[#0570de]"
 >
 <option value="Salesforce">Salesforce</option>
 <option value="PostgreSQL">PostgreSQL</option>
 <option value="Google Sheets">Google Sheets</option>
 <option value="REST API">REST API</option>
 </select>
 </div>

 <div>
 <label className="block text-sm font-medium text-secondary mb-1.5">
 Description
 </label>
 <textarea
 name="description"
 placeholder="Optional description"
 rows={3}
 className="w-full p-3 rounded-md border border-border bg-card text-primary focus:outline-none focus:ring-2 focus:ring-[#0570de] placeholder:text-muted dark:placeholder-[#666666] resize-none"
 />
 </div>
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
 type="submit"
 disabled={isProcessing}
 className="bg-[#0570de] text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-[#0462c7] transition-colors disabled:opacity-50 flex items-center gap-2"
 >
 {isProcessing && <Loader2 className="w-4 h-4 animate-spin" />}
 Create
 </button>
 </div>
 </form>
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

 {/* ── PROCESSING OVERLAY ─────────────────────────────────────────────── */}
 {isProcessing && (
 <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/10 dark:bg-black/40">
 <Loader2 className="w-8 h-8 animate-spin text-[#0570de]" />
 </div>
 )}
 </div>
 );
}
