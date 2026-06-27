import React, { useState, useEffect, useRef, useCallback } from 'react';
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
 Loader2
} from 'lucide-react';
import ConfirmModal from '../components/ConfirmModal.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { generateReportPDF } from '../lib/generateReportPDF';
import ReportDetailModal from '../components/ReportDetailModal.jsx';
import { mockApi } from '../lib/mockApi';

// ── Utility ──────────────────────────────────────────────────────────────────
const cn = (...classes) => classes.filter(Boolean).join(' ');

// ── Mock Data ────────────────────────────────────────────────────────────────
const REPORTS = [
 {
 id: 1,
 name: 'Q3 Financial Analysis',
 subtitle: 'GPT-4 · Salesforce',
 type: 'Financial',
 status: 'Complete',
 dataSource: 'Salesforce',
 accuracy: 96.1,
 createdAt: 'Oct 15, 2024',
 },
 {
 id: 2,
 name: 'Risk Assessment Model v2',
 subtitle: 'BERT · PostgreSQL',
 type: 'Risk',
 status: 'Processing',
 dataSource: 'PostgreSQL',
 accuracy: null,
 createdAt: 'Oct 14, 2024',
 },
 {
 id: 3,
 name: 'Compliance Audit Report',
 subtitle: 'Claude · Google Sheets',
 type: 'Compliance',
 status: 'Complete',
 dataSource: 'Google Sheets',
 accuracy: 91.3,
 createdAt: 'Oct 12, 2024',
 },
 {
 id: 4,
 name: 'Revenue Forecast 2025',
 subtitle: 'GPT-4 · Salesforce',
 type: 'Financial',
 status: 'Complete',
 dataSource: 'Salesforce',
 accuracy: 88.7,
 createdAt: 'Oct 10, 2024',
 },
 {
 id: 5,
 name: 'Credit Scoring Pipeline',
 subtitle: 'XGBoost · PostgreSQL',
 type: 'Risk',
 status: 'Failed',
 dataSource: 'PostgreSQL',
 accuracy: null,
 createdAt: 'Oct 9, 2024',
 },
 {
 id: 6,
 name: 'Monthly KPI Dashboard',
 subtitle: 'GPT-4 · REST API',
 type: 'Financial',
 status: 'Complete',
 dataSource: 'REST API',
 accuracy: 93.5,
 createdAt: 'Oct 7, 2024',
 },
 {
 id: 7,
 name: 'Fraud Detection Analysis',
 subtitle: 'BERT · PostgreSQL',
 type: 'Risk',
 status: 'Draft',
 dataSource: 'PostgreSQL',
 accuracy: null,
 createdAt: 'Oct 5, 2024',
 },
 {
 id: 8,
 name: 'ESG Compliance Check',
 subtitle: 'Claude · Google Sheets',
 type: 'Compliance',
 status: 'Complete',
 dataSource: 'Google Sheets',
 accuracy: 85.2,
 createdAt: 'Oct 3, 2024',
 },
];

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
 const [reports, setReports] = useState(REPORTS);
 const [selectedRows, setSelectedRows] = useState(new Set());
 const [searchQuery, setSearchQuery] = useState('');
 const [statusFilter, setStatusFilter] = useState('all');
 const [typeFilter, setTypeFilter] = useState('all');
 const [dateFilter, setDateFilter] = useState('all');
 const [downloadingPdfId, setDownloadingPdfId] = useState(null);
 
 const [openMenuId, setOpenMenuId] = useState(null);
 const [currentPage, setCurrentPage] = useState(1);
 const [isModalOpen, setIsModalOpen] = useState(false);
 
 // New States
 const { addToast } = useToast();
 const [isProcessing, setIsProcessing] = useState(false);
 
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
 description: `Are you sure you want to delete ${selectedRows.size} reports?`,
 confirmLabel: 'Delete',
 confirmVariant: 'danger',
 action: async () => {
 setIsProcessing(true);
 try {
 await Promise.all(Array.from(selectedRows).map(id => mockApi.deleteReport(id)));
 setReports((prev) => prev.filter((r) => !selectedRows.has(r.id)));
 setSelectedRows(new Set());
 addToast(`Deleted ${selectedRows.size} reports`, 'success');
 } catch (err) {
 addToast('Failed to delete reports', 'error');
 } finally {
 setIsProcessing(false);
 }
 }
 });
 setIsConfirmModalOpen(true);
 };
 
 const handleBulkDownload = () => {
 addToast(`Downloading ${selectedRows.size} reports...`, 'info');
 };

 const handleDownloadPDF = async (report) => {
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
 setOpenMenuId(null);
 };

 const handleDelete = (id) => {
 setOpenMenuId(null);
 setConfirmConfig({
 title: 'Delete Report',
 description: 'Are you sure you want to delete this report?',
 confirmLabel: 'Delete',
 confirmVariant: 'danger',
 action: async () => {
 setIsProcessing(true);
 try {
 await mockApi.deleteReport(id);
 setReports((prev) => prev.filter((r) => r.id !== id));
 setSelectedRows((prev) => {
 const next = new Set([...prev]);
 next.delete(id);
 return next;
 });
 addToast('Report deleted', 'success');
 } catch (err) {
 addToast('Failed to delete report', 'error');
 } finally {
 setIsProcessing(false);
 }
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
 e.preventDefault();
 const formData = new FormData(e.target);
 const name = formData.get('name');
 const type = formData.get('type');
 const dataSource = formData.get('dataSource');
 const subtitle = formData.get('description') || 'Custom Report';
 
 if (!name) return;

 setIsProcessing(true);
 try {
 const newReport = await mockApi.createReport({
 name,
 type,
 dataSource,
 subtitle,
 accuracy: null,
 createdAt: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
 });
 setReports((prev) => [newReport, ...prev]);
 addToast('Report created', 'success');
 setIsModalOpen(false);
 } catch (err) {
 addToast('Failed to create report', 'error');
 } finally {
 setIsProcessing(false);
 }
 };

 const handlePrevPage = () => setCurrentPage((p) => Math.max(1, p - 1));
 const handleNextPage = () => setCurrentPage((p) => Math.min(totalPages, p + 1));

 return (
 <div className="page-enter">
 {/* ── 1. PAGE HEADER ─────────────────────────────────────────────────── */}
 <div className="flex justify-between items-start">
 <div>
 <h1 className="text-xl font-semibold text-primary">Reports</h1>
 <p className="text-sm text-muted mt-1">
 View and manage your AI explainability reports
 </p>
 </div>
 <button 
 onClick={() => setIsModalOpen(true)}
 className="bg-[#0570de] text-white rounded-lg px-4 py-2.5 text-sm font-medium hover:bg-[#0462c7] flex items-center gap-2 transition-colors"
 >
 <Plus className="w-4 h-4" />
 New Report
 </button>
 </div>

 {/* ── 2. FILTER BAR ──────────────────────────────────────────────────── */}
 <div className="mt-6 flex flex-wrap items-center gap-3">
 {/* Search */}
 <div className="flex-1 min-w-[200px] relative">
 <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted w-4 h-4 pointer-events-none" />
 <input
 type="text"
 placeholder="Search reports…"
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
 Delete
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
 Report
 </th>
 <th className="py-3 px-4 text-left text-xs font-medium text-muted uppercase tracking-wider" style={{ width: '12%' }}>
 Type
 </th>
 <th className="py-3 px-4 text-left text-xs font-medium text-muted uppercase tracking-wider" style={{ width: '12%' }}>
 Status
 </th>
 <th className="py-3 px-4 text-left text-xs font-medium text-muted uppercase tracking-wider" style={{ width: '15%' }}>
 Data Source
 </th>
 <th className="py-3 px-4 text-right text-xs font-medium text-muted uppercase tracking-wider" style={{ width: '10%' }}>
 Accuracy
 </th>
 <th className="py-3 px-4 text-left text-xs font-medium text-muted uppercase tracking-wider" style={{ width: '12%' }}>
 Created
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
 No reports found
 </td>
 </tr>
 ) : (
 paginatedReports.map((report) => (
 <tr
 key={report.id}
 className="hover:bg-page border-b border-border transition-colors group last:border-b-0"
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
 View
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
 Duplicate
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
 Delete
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
 Cancel
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
 report={selectedReportForDetail} 
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
