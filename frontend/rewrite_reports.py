import re

with open('/Users/alumnoad/SolvAI/SolvAI/frontend/src/pages/ReportsPage.jsx', 'r') as f:
    content = f.read()

# We'll just replace the entire file content, but keep the REPORTS array as is.
# Let's extract the REPORTS array from the file.
reports_match = re.search(r'(const REPORTS = \[.*?\];)', content, re.DOTALL)
reports_str = reports_match.group(1) if reports_match else "const REPORTS = [];"

new_content = f"""import React, {{ useState, useEffect, useRef, useCallback }} from 'react';
import {{
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
}} from 'lucide-react';
import ConfirmModal from '../components/ConfirmModal.jsx';
import {{ mockApi }} from '../lib/mockApi.js';
import {{ useToast }} from '../context/ToastContext.jsx';

// ── Utility ──────────────────────────────────────────────────────────────────
const cn = (...classes) => classes.filter(Boolean).join(' ');

// ── Mock Data ────────────────────────────────────────────────────────────────
{reports_str}

// ── Badge Helpers ────────────────────────────────────────────────────────────
const TYPE_STYLES = {{
  Financial: 'bg-[#eff6ff] text-[#0570de] dark:bg-[#0570de]/20 dark:text-[#60a5fa]',
  Risk: 'bg-[#fffbeb] text-[#c9870c] dark:bg-[#c9870c]/20 dark:text-[#fbbf24]',
  Compliance: 'bg-[#ecfdf5] text-[#1a9e6e] dark:bg-[#1a9e6e]/20 dark:text-[#34d399]',
  Custom: 'bg-[#f0f2f5] text-[#697386] dark:bg-[#2a2a2a] dark:text-[#a0a0a0]',
}};

const STATUS_STYLES = {{
  Complete: 'bg-[#ecfdf5] text-[#1a9e6e] dark:bg-[#1a9e6e]/20 dark:text-[#34d399]',
  Processing: 'bg-[#fffbeb] text-[#c9870c] dark:bg-[#c9870c]/20 dark:text-[#fbbf24]',
  Failed: 'bg-[#fef2f2] text-[#df1b41] dark:bg-[#df1b41]/20 dark:text-[#f87171]',
  Draft: 'bg-[#f0f2f5] text-[#697386] dark:bg-[#2a2a2a] dark:text-[#a0a0a0]',
}};

const getAccuracyColor = (val) => {{
  if (val === null || val === undefined) return 'text-[#697386] dark:text-[#666666]';
  if (val >= 80) return 'text-[#1a9e6e] dark:text-[#34d399]';
  if (val >= 60) return 'text-[#c9870c] dark:text-[#fbbf24]';
  return 'text-[#df1b41] dark:text-[#f87171]';
}};

// ── Component ────────────────────────────────────────────────────────────────
export default function ReportsPage() {{
  const [reports, setReports] = useState(REPORTS);
  const [selectedRows, setSelectedRows] = useState(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  
  const [openMenuId, setOpenMenuId] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // New States
  const {{ addToast }} = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [confirmConfig, setConfirmConfig] = useState({{ title: '', description: '', action: () => {{}}, confirmLabel: '', confirmVariant: 'primary' }});
  
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedReportForDetail, setSelectedReportForDetail] = useState(null);

  const ITEMS_PER_PAGE = 8;
  const menuRef = useRef(null);

  // ── Close menu on click outside ──────────────────────────────────────────
  useEffect(() => {{
    if (openMenuId === null) return;
    const handleClickOutside = (e) => {{
      if (menuRef.current && !menuRef.current.contains(e.target)) {{
        setOpenMenuId(null);
      }}
    }};
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }}, [openMenuId]);

  // ── Close modal on Escape ────────────────────────────────────────────────
  useEffect(() => {{
    if (!isModalOpen && !isDetailModalOpen && !isConfirmModalOpen) return;
    const handleEsc = (e) => {{
      if (e.key === 'Escape') {{
        setIsModalOpen(false);
        setIsDetailModalOpen(false);
        setIsConfirmModalOpen(false);
      }}
    }};
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }}, [isModalOpen, isDetailModalOpen, isConfirmModalOpen]);

  // ── Filtering ────────────────────────────────────────────────────────────
  const filteredReports = reports.filter((r) => {{
    // Search
    if (searchQuery) {{
      const q = searchQuery.toLowerCase();
      if (
        !r.name.toLowerCase().includes(q) &&
        !r.subtitle.toLowerCase().includes(q) &&
        !r.type.toLowerCase().includes(q) &&
        !r.dataSource.toLowerCase().includes(q)
      ) {{
        return false;
      }}
    }}
    // Status
    if (statusFilter !== 'all' && r.status !== statusFilter) return false;
    // Type
    if (typeFilter !== 'all' && r.type !== typeFilter) return false;
    // Date
    if (dateFilter !== 'all') {{
      const reportDate = new Date(r.createdAt);
      const daysDiff = (new Date() - reportDate) / (1000 * 60 * 60 * 24);
      if (dateFilter === '7d' && daysDiff > 7) return false;
      if (dateFilter === '30d' && daysDiff > 30) return false;
      if (dateFilter === '90d' && daysDiff > 90) return false;
    }}
    return true;
  }});

  // Reset pagination on filter change
  useEffect(() => {{
    setCurrentPage(1);
  }}, [searchQuery, statusFilter, typeFilter, dateFilter]);

  const totalPages = Math.ceil(filteredReports.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedReports = filteredReports.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  // ── Checkbox logic ───────────────────────────────────────────────────────
  const allVisibleSelected =
    paginatedReports.length > 0 &&
    paginatedReports.every((r) => selectedRows.has(r.id));

  const toggleAll = () => {{
    if (allVisibleSelected) {{
      setSelectedRows((prev) => {{
        const next = new Set([...prev]);
        paginatedReports.forEach(r => next.delete(r.id));
        return next;
      }});
    }} else {{
      setSelectedRows((prev) => {{
        const next = new Set([...prev]);
        paginatedReports.forEach(r => next.add(r.id));
        return next;
      }});
    }}
  }};

  const toggleRow = (id) => {{
    setSelectedRows((prev) => {{
      const next = new Set([...prev]);
      if (next.has(id)) {{
        next.delete(id);
      }} else {{
        next.add(id);
      }}
      return next;
    }});
  }};

  // ── Actions ──────────────────────────────────────────────────────────────
  const handleMenuToggle = (e, id) => {{
    e.stopPropagation();
    setOpenMenuId((prev) => (prev === id ? null : id));
  }};

  const handleBulkDelete = () => {{
    setConfirmConfig({{
      title: 'Delete Reports',
      description: `Are you sure you want to delete ${{selectedRows.size}} reports?`,
      confirmLabel: 'Delete',
      confirmVariant: 'danger',
      action: async () => {{
        setIsProcessing(true);
        try {{
          await Promise.all(Array.from(selectedRows).map(id => mockApi.deleteReport(id)));
          setReports((prev) => prev.filter((r) => !selectedRows.has(r.id)));
          setSelectedRows(new Set());
          addToast(`Deleted ${{selectedRows.size}} reports`, 'success');
        }} catch (err) {{
          addToast('Failed to delete reports', 'error');
        }} finally {{
          setIsProcessing(false);
        }}
      }}
    }});
    setIsConfirmModalOpen(true);
  }};
  
  const handleBulkDownload = () => {{
    addToast(`Downloading ${{selectedRows.size}} reports...`, 'info');
  }};

  const handleDelete = (id) => {{
    setOpenMenuId(null);
    setConfirmConfig({{
      title: 'Delete Report',
      description: 'Are you sure you want to delete this report?',
      confirmLabel: 'Delete',
      confirmVariant: 'danger',
      action: async () => {{
        setIsProcessing(true);
        try {{
          await mockApi.deleteReport(id);
          setReports((prev) => prev.filter((r) => r.id !== id));
          setSelectedRows((prev) => {{
            const next = new Set([...prev]);
            next.delete(id);
            return next;
          }});
          addToast('Report deleted', 'success');
        }} catch (err) {{
          addToast('Failed to delete report', 'error');
        }} finally {{
          setIsProcessing(false);
        }}
      }}
    }});
    setIsConfirmModalOpen(true);
  }};

  const handleDuplicate = (report) => {{
    const newReport = {{
      ...report,
      id: Date.now(),
      name: `${{report.name}} (Copy)`,
      createdAt: new Date().toLocaleDateString('en-US', {{ month: 'short', day: 'numeric', year: 'numeric' }})
    }};
    setReports((prev) => [newReport, ...prev]);
    addToast('Report duplicated', 'success');
    setOpenMenuId(null);
  }};

  const handleAddReport = async (e) => {{
    e.preventDefault();
    const formData = new FormData(e.target);
    const name = formData.get('name');
    const type = formData.get('type');
    const dataSource = formData.get('dataSource');
    const subtitle = formData.get('description') || 'Custom Report';
    
    if (!name) return;

    setIsProcessing(true);
    try {{
      const newReport = await mockApi.createReport({{
        name,
        type,
        dataSource,
        subtitle,
        accuracy: null,
        createdAt: new Date().toLocaleDateString('en-US', {{ month: 'short', day: 'numeric', year: 'numeric' }})
      }});
      setReports((prev) => [newReport, ...prev]);
      addToast('Report created', 'success');
      setIsModalOpen(false);
    }} catch (err) {{
      addToast('Failed to create report', 'error');
    }} finally {{
      setIsProcessing(false);
    }}
  }};

  const handlePrevPage = () => setCurrentPage((p) => Math.max(1, p - 1));
  const handleNextPage = () => setCurrentPage((p) => Math.min(totalPages, p + 1));

  return (
    <div className="page-enter">
      {{/* ── 1. PAGE HEADER ─────────────────────────────────────────────────── */}}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-xl font-semibold text-[#0a2540] dark:text-[#f5f5f5]">Reports</h1>
          <p className="text-sm text-[#697386] dark:text-[#a0a0a0] mt-1">
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

      {{/* ── 2. FILTER BAR ──────────────────────────────────────────────────── */}}
      <div className="mt-6 flex flex-wrap items-center gap-3">
        {{/* Search */}}
        <div className="flex-1 min-w-[200px] relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#697386] dark:text-[#a0a0a0] w-4 h-4 pointer-events-none" />
          <input
            type="text"
            placeholder="Search reports…"
            value={{searchQuery}}
            onChange={{(e) => setSearchQuery(e.target.value)}}
            className="w-full h-9 border border-[#e3e8ef] dark:border-[#2a2a2a] rounded-md pl-10 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#0570de] bg-white dark:bg-[#161616] text-[#0a2540] dark:text-[#f5f5f5] placeholder:text-[#697386] dark:placeholder-[#666666]"
          />
        </div>

        {{/* Status select */}}
        <select
          value={{statusFilter}}
          onChange={{(e) => setStatusFilter(e.target.value)}}
          className="h-9 border border-[#e3e8ef] dark:border-[#2a2a2a] rounded-md px-3 pr-8 text-sm bg-white dark:bg-[#161616] appearance-none text-[#425466] dark:text-[#f5f5f5] cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#0570de]"
        >
          <option value="all">All Statuses</option>
          <option value="Complete">Complete</option>
          <option value="Processing">Processing</option>
          <option value="Failed">Failed</option>
          <option value="Draft">Draft</option>
        </select>

        {{/* Type select */}}
        <select
          value={{typeFilter}}
          onChange={{(e) => setTypeFilter(e.target.value)}}
          className="h-9 border border-[#e3e8ef] dark:border-[#2a2a2a] rounded-md px-3 pr-8 text-sm bg-white dark:bg-[#161616] appearance-none text-[#425466] dark:text-[#f5f5f5] cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#0570de]"
        >
          <option value="all">All Types</option>
          <option value="Financial">Financial</option>
          <option value="Risk">Risk</option>
          <option value="Compliance">Compliance</option>
          <option value="Custom">Custom</option>
        </select>

        {{/* Date select */}}
        <select
          value={{dateFilter}}
          onChange={{(e) => setDateFilter(e.target.value)}}
          className="h-9 border border-[#e3e8ef] dark:border-[#2a2a2a] rounded-md px-3 pr-8 text-sm bg-white dark:bg-[#161616] appearance-none text-[#425466] dark:text-[#f5f5f5] cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#0570de]"
        >
          <option value="all">All Dates</option>
          <option value="7d">Last 7 days</option>
          <option value="30d">Last 30 days</option>
          <option value="90d">Last 90 days</option>
        </select>
      </div>

      {{/* ── 3. BULK ACTIONS BAR ────────────────────────────────────────────── */}}
      <div
        className={{cn(
          'transition-all overflow-hidden',
          selectedRows.size > 0
            ? 'mt-4 max-h-20 opacity-100'
            : 'max-h-0 opacity-0'
        )}}
      >
        <div className="bg-[#0a2540] dark:bg-[#1a1a1a] text-white rounded-lg px-4 py-3 flex items-center justify-between border dark:border-[#2a2a2a]">
          <span className="text-sm font-medium">
            {{selectedRows.size}} selected
          </span>
          <div className="flex gap-2">
            <button 
              onClick={{handleBulkDownload}}
              className="bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded-md px-3 py-1.5 text-sm flex items-center gap-1.5 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              Download
            </button>
            <button 
              onClick={{handleBulkDelete}}
              className="bg-[#df1b41] hover:bg-[#c5183a] text-white rounded-md px-3 py-1.5 text-sm flex items-center gap-1.5 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Delete
            </button>
          </div>
        </div>
      </div>

      {{/* ── 4. TABLE CARD ──────────────────────────────────────────────────── */}}
      <div className="mt-4 bg-white dark:bg-[#111111] border border-[#e3e8ef] dark:border-[#1f1f1f] rounded-lg overflow-hidden">
        {{/* Results count */}}
        <div className="px-6 py-3 border-b border-[#e3e8ef] dark:border-[#1f1f1f]">
          <span className="text-sm text-[#697386] dark:text-[#a0a0a0]">
            Showing {{filteredReports.length}} reports
          </span>
        </div>

        {{/* Table */}}
        <div className="overflow-x-auto min-h-[300px]">
          <table className="w-full">
            <thead className="bg-[#f6f8fa] dark:bg-[#161616]">
              <tr>
                <th className="w-12 py-3 px-4">
                  <input
                    type="checkbox"
                    checked={{allVisibleSelected}}
                    onChange={{toggleAll}}
                    className="w-4 h-4 rounded border-gray-300 dark:border-[#2a2a2a] accent-[#0570de] cursor-pointer"
                  />
                </th>
                <th className="py-3 px-4 text-left text-xs font-medium text-[#697386] dark:text-[#a0a0a0] uppercase tracking-wider">
                  Report
                </th>
                <th className="py-3 px-4 text-left text-xs font-medium text-[#697386] dark:text-[#a0a0a0] uppercase tracking-wider">
                  Type
                </th>
                <th className="py-3 px-4 text-left text-xs font-medium text-[#697386] dark:text-[#a0a0a0] uppercase tracking-wider">
                  Status
                </th>
                <th className="py-3 px-4 text-left text-xs font-medium text-[#697386] dark:text-[#a0a0a0] uppercase tracking-wider">
                  Data Source
                </th>
                <th className="py-3 px-4 text-right text-xs font-medium text-[#697386] dark:text-[#a0a0a0] uppercase tracking-wider">
                  Accuracy
                </th>
                <th className="py-3 px-4 text-left text-xs font-medium text-[#697386] dark:text-[#a0a0a0] uppercase tracking-wider">
                  Created
                </th>
                <th className="w-12 py-3 px-4 text-right text-xs font-medium text-[#697386] dark:text-[#a0a0a0] uppercase tracking-wider">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>

            <tbody>
              {{paginatedReports.length === 0 ? (
                <tr>
                  <td colSpan={{8}} className="py-12 text-center text-[#697386] dark:text-[#a0a0a0]">
                    No reports found
                  </td>
                </tr>
              ) : (
                paginatedReports.map((report) => (
                  <tr
                    key={{report.id}}
                    className="hover:bg-[#f6f8fa] dark:hover:bg-[#1a1a1a] border-b border-[#e3e8ef] dark:border-[#1f1f1f] transition-colors group last:border-b-0"
                  >
                    {{/* Checkbox */}}
                    <td className="py-3 px-4">
                      <input
                        type="checkbox"
                        checked={{selectedRows.has(report.id)}}
                        onChange={{() => toggleRow(report.id)}}
                        onClick={{(e) => e.stopPropagation()}}
                        className="w-4 h-4 rounded border-gray-300 dark:border-[#2a2a2a] accent-[#0570de] cursor-pointer"
                      />
                    </td>

                    {{/* Report name */}}
                    <td className="py-3 px-4">
                      <div className="text-sm font-medium text-[#0a2540] dark:text-[#f5f5f5]">
                        {{report.name}}
                      </div>
                      <div className="text-xs text-[#697386] dark:text-[#a0a0a0] mt-0.5">
                        {{report.subtitle}}
                      </div>
                    </td>

                    {{/* Type badge */}}
                    <td className="py-3 px-4">
                      <span
                        className={{cn(
                          'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
                          TYPE_STYLES[report.type] || TYPE_STYLES.Custom
                        )}}
                      >
                        {{report.type}}
                      </span>
                    </td>

                    {{/* Status badge */}}
                    <td className="py-3 px-4">
                      <span
                        className={{cn(
                          'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
                          STATUS_STYLES[report.status] || STATUS_STYLES.Draft
                        )}}
                      >
                        {{report.status}}
                      </span>
                    </td>

                    {{/* Data Source */}}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5">
                        <Database className="w-3.5 h-3.5 text-[#697386] dark:text-[#666666]" />
                        <span className="text-sm text-[#425466] dark:text-[#a0a0a0]">
                          {{report.dataSource}}
                        </span>
                      </div>
                    </td>

                    {{/* Accuracy */}}
                    <td className="py-3 px-4 text-right">
                      <span
                        className={{cn(
                          'text-sm font-medium',
                          getAccuracyColor(report.accuracy)
                        )}}
                      >
                        {{report.accuracy !== null
                          ? `${{report.accuracy}}%`
                          : '—'}}
                      </span>
                    </td>

                    {{/* Created */}}
                    <td className="py-3 px-4">
                      <span className="text-sm text-[#697386] dark:text-[#a0a0a0]">
                        {{report.createdAt}}
                      </span>
                    </td>

                    {{/* Actions */}}
                    <td className="py-3 px-4 text-right">
                      <div className="relative" ref={{openMenuId === report.id ? menuRef : undefined}}>
                        <button
                          onClick={{(e) => handleMenuToggle(e, report.id)}}
                          className="p-1 rounded-md hover:bg-[#f0f2f5] dark:hover:bg-[#2a2a2a] transition-colors text-[#697386] dark:text-[#a0a0a0] hover:text-[#0a2540] dark:hover:text-[#f5f5f5]"
                        >
                          <MoreHorizontal className="w-4 h-4" />
                        </button>

                        {{/* Dropdown menu */}}
                        {{openMenuId === report.id && (
                          <div className="absolute right-0 top-full mt-1 bg-white dark:bg-[#161616] border border-[#e3e8ef] dark:border-[#2a2a2a] rounded-lg shadow-lg py-1 w-44 z-10 text-left">
                            <button 
                              onClick={{(e) => {{
                                e.stopPropagation();
                                setSelectedReportForDetail(report);
                                setIsDetailModalOpen(true);
                                setOpenMenuId(null);
                              }}}}
                              className="w-full px-3 py-2 text-sm hover:bg-[#f6f8fa] dark:hover:bg-[#1a1a1a] cursor-pointer flex items-center gap-2 text-[#425466] dark:text-[#a0a0a0]"
                            >
                              <Eye className="w-4 h-4" />
                              View
                            </button>
                            <button 
                              onClick={{(e) => {{
                                e.stopPropagation();
                                addToast('Preparing PDF... Download will start shortly', 'info');
                                setOpenMenuId(null);
                              }}}}
                              className="w-full px-3 py-2 text-sm hover:bg-[#f6f8fa] dark:hover:bg-[#1a1a1a] cursor-pointer flex items-center gap-2 text-[#425466] dark:text-[#a0a0a0]"
                            >
                              <Download className="w-4 h-4" />
                              Download PDF
                            </button>
                            <button 
                              onClick={{(e) => {{
                                e.stopPropagation();
                                handleDuplicate(report);
                              }}}}
                              className="w-full px-3 py-2 text-sm hover:bg-[#f6f8fa] dark:hover:bg-[#1a1a1a] cursor-pointer flex items-center gap-2 text-[#425466] dark:text-[#a0a0a0]"
                            >
                              <Copy className="w-4 h-4" />
                              Duplicate
                            </button>
                            <div className="border-t border-[#e3e8ef] dark:border-[#2a2a2a] my-1" />
                            <button 
                              onClick={{(e) => {{
                                e.stopPropagation();
                                handleDelete(report.id);
                              }}}}
                              className="w-full px-3 py-2 text-sm hover:bg-[#f6f8fa] dark:hover:bg-[#1a1a1a] cursor-pointer flex items-center gap-2 text-[#df1b41] dark:text-[#f87171]"
                            >
                              <Trash2 className="w-4 h-4" />
                              Delete
                            </button>
                          </div>
                        )}}
                      </div>
                    </td>
                  </tr>
                ))
              )}}
            </tbody>
          </table>
        </div>

        {{/* ── 5. PAGINATION ──────────────────────────────────────────────────── */}}
        <div className="px-6 py-4 flex justify-between items-center border-t border-[#e3e8ef] dark:border-[#1f1f1f]">
          <span className="text-sm text-[#697386] dark:text-[#a0a0a0]">
            Showing {{filteredReports.length === 0 ? 0 : startIndex + 1}}–{{Math.min(startIndex + ITEMS_PER_PAGE, filteredReports.length)}} of {{filteredReports.length}} reports
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={{handlePrevPage}}
              disabled={{currentPage === 1}}
              className={{cn(
                "px-3 py-1.5 text-sm rounded-md border border-[#e3e8ef] dark:border-[#1f1f1f] transition-colors",
                currentPage === 1 
                  ? "text-[#697386] dark:text-[#666666] opacity-50 cursor-not-allowed" 
                  : "text-[#425466] dark:text-[#a0a0a0] hover:bg-[#f6f8fa] dark:hover:bg-[#1a1a1a]"
              )}}
            >
              ← Previous
            </button>
            {{Array.from({{ length: totalPages }}, (_, i) => i + 1).map(p => (
              <button
                key={{p}}
                onClick={{() => setCurrentPage(p)}}
                className={{cn(
                  "px-3 py-1.5 text-sm rounded-md transition-colors",
                  currentPage === p
                    ? "bg-[#0570de] text-white border border-[#0570de]"
                    : "border border-[#e3e8ef] dark:border-[#1f1f1f] text-[#425466] dark:text-[#a0a0a0] hover:bg-[#f6f8fa] dark:hover:bg-[#1a1a1a]"
                )}}
              >
                {{p}}
              </button>
            ))}}
            <button
              onClick={{handleNextPage}}
              disabled={{currentPage === totalPages || totalPages === 0}}
              className={{cn(
                "px-3 py-1.5 text-sm rounded-md border border-[#e3e8ef] dark:border-[#1f1f1f] transition-colors",
                currentPage === totalPages || totalPages === 0
                  ? "text-[#697386] dark:text-[#666666] opacity-50 cursor-not-allowed" 
                  : "text-[#425466] dark:text-[#a0a0a0] hover:bg-[#f6f8fa] dark:hover:bg-[#1a1a1a]"
              )}}
            >
              Next →
            </button>
          </div>
        </div>
      </div>

      {{/* ── 6. NEW REPORT MODAL ────────────────────────────────────────────── */}}
      {{isModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#111111] rounded-xl w-full max-w-md shadow-2xl overflow-hidden border border-[#e3e8ef] dark:border-[#1f1f1f]">
            <div className="flex justify-between items-center p-6 border-b border-[#e3e8ef] dark:border-[#1f1f1f]">
              <h2 className="text-lg font-semibold text-[#0a2540] dark:text-[#f5f5f5]">New Report</h2>
              <button 
                onClick={{() => setIsModalOpen(false)}}
                className="text-[#697386] dark:text-[#a0a0a0] hover:text-[#0a2540] dark:hover:text-[#f5f5f5] transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={{handleAddReport}}>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[#425466] dark:text-[#a0a0a0] mb-1.5">
                    Name <span className="text-[#df1b41]">*</span>
                  </label>
                  <input
                    name="name"
                    required
                    autoFocus
                    placeholder="e.g., Q4 Analysis"
                    className="w-full h-10 px-3 rounded-md border border-[#e3e8ef] dark:border-[#2a2a2a] bg-white dark:bg-[#161616] text-[#0a2540] dark:text-[#f5f5f5] focus:outline-none focus:ring-2 focus:ring-[#0570de] placeholder:text-[#697386] dark:placeholder-[#666666]"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-[#425466] dark:text-[#a0a0a0] mb-1.5">
                    Type
                  </label>
                  <select
                    name="type"
                    className="w-full h-10 px-3 rounded-md border border-[#e3e8ef] dark:border-[#2a2a2a] bg-white dark:bg-[#161616] text-[#0a2540] dark:text-[#f5f5f5] focus:outline-none focus:ring-2 focus:ring-[#0570de]"
                  >
                    <option value="Financial">Financial</option>
                    <option value="Risk">Risk</option>
                    <option value="Compliance">Compliance</option>
                    <option value="Custom">Custom</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#425466] dark:text-[#a0a0a0] mb-1.5">
                    Data Source
                  </label>
                  <select
                    name="dataSource"
                    className="w-full h-10 px-3 rounded-md border border-[#e3e8ef] dark:border-[#2a2a2a] bg-white dark:bg-[#161616] text-[#0a2540] dark:text-[#f5f5f5] focus:outline-none focus:ring-2 focus:ring-[#0570de]"
                  >
                    <option value="Salesforce">Salesforce</option>
                    <option value="PostgreSQL">PostgreSQL</option>
                    <option value="Google Sheets">Google Sheets</option>
                    <option value="REST API">REST API</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#425466] dark:text-[#a0a0a0] mb-1.5">
                    Description
                  </label>
                  <textarea
                    name="description"
                    placeholder="Optional description"
                    rows={{3}}
                    className="w-full p-3 rounded-md border border-[#e3e8ef] dark:border-[#2a2a2a] bg-white dark:bg-[#161616] text-[#0a2540] dark:text-[#f5f5f5] focus:outline-none focus:ring-2 focus:ring-[#0570de] placeholder:text-[#697386] dark:placeholder-[#666666] resize-none"
                  />
                </div>
              </div>

              <div className="p-6 border-t border-[#e3e8ef] dark:border-[#1f1f1f] bg-[#f6f8fa] dark:bg-[#161616] flex justify-end gap-3">
                <button
                  type="button"
                  onClick={{() => setIsModalOpen(false)}}
                  className="px-4 py-2 text-sm font-medium text-[#425466] dark:text-[#a0a0a0] hover:text-[#0a2540] dark:hover:text-[#f5f5f5] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={{isProcessing}}
                  className="bg-[#0570de] text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-[#0462c7] transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {{isProcessing && <Loader2 className="w-4 h-4 animate-spin" />}}
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}}

      {{/* ── 7. DETAIL MODAL ────────────────────────────────────────────────── */}}
      {{isDetailModalOpen && selectedReportForDetail && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#111111] rounded-xl w-full max-w-2xl shadow-2xl overflow-hidden border border-[#e3e8ef] dark:border-[#1f1f1f]">
            <div className="flex justify-between items-center p-6 border-b border-[#e3e8ef] dark:border-[#1f1f1f]">
              <div>
                <h2 className="text-xl font-semibold text-[#0a2540] dark:text-[#f5f5f5]">
                  {{selectedReportForDetail.name}}
                </h2>
                <div className="flex items-center gap-2 mt-2">
                  <span className={{cn('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium', TYPE_STYLES[selectedReportForDetail.type] || TYPE_STYLES.Custom)}}>
                    {{selectedReportForDetail.type}}
                  </span>
                  <span className={{cn('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium', STATUS_STYLES[selectedReportForDetail.status] || STATUS_STYLES.Draft)}}>
                    {{selectedReportForDetail.status}}
                  </span>
                </div>
              </div>
              <button 
                onClick={{() => setIsDetailModalOpen(false)}}
                className="text-[#697386] dark:text-[#a0a0a0] hover:text-[#0a2540] dark:hover:text-[#f5f5f5] transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[70vh]">
              <div className="grid grid-cols-2 gap-6 mb-8">
                <div>
                  <div className="text-sm text-[#697386] dark:text-[#a0a0a0] mb-1">Created Date</div>
                  <div className="text-sm font-medium text-[#0a2540] dark:text-[#f5f5f5]">{{selectedReportForDetail.createdAt}}</div>
                </div>
                <div>
                  <div className="text-sm text-[#697386] dark:text-[#a0a0a0] mb-1">Data Source</div>
                  <div className="text-sm font-medium text-[#0a2540] dark:text-[#f5f5f5] flex items-center gap-1.5">
                    <Database className="w-4 h-4 text-[#697386]" />
                    {{selectedReportForDetail.dataSource}}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-[#697386] dark:text-[#a0a0a0] mb-1">Model Used</div>
                  <div className="text-sm font-medium text-[#0a2540] dark:text-[#f5f5f5]">
                    {{selectedReportForDetail.subtitle?.split('·')[0]?.trim() || 'Custom Model'}}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-[#697386] dark:text-[#a0a0a0] mb-1">Accuracy Score</div>
                  <div className={{cn('text-sm font-medium', getAccuracyColor(selectedReportForDetail.accuracy))}}>
                    {{selectedReportForDetail.accuracy !== null ? `${{selectedReportForDetail.accuracy}}%` : 'N/A'}}
                  </div>
                </div>
              </div>

              <div className="mb-8">
                <h3 className="text-sm font-semibold text-[#0a2540] dark:text-[#f5f5f5] mb-2">Explanation Output</h3>
                <p className="text-sm text-[#425466] dark:text-[#a0a0a0] leading-relaxed">
                  This report outlines the key drivers of the prediction model. The analysis indicates that historical transaction volumes and recent account activity are the primary indicators for this outcome. The model exhibits high confidence across the major feature splits.
                </p>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-[#0a2540] dark:text-[#f5f5f5] mb-4">Feature Importance (SHAP-style)</h3>
                <div className="space-y-4">
                  {{[
                    {{ label: 'Transaction Volume', value: 35 }},
                    {{ label: 'Account Age', value: 25 }},
                    {{ label: 'Recent Activity', value: 20 }},
                    {{ label: 'Balance History', value: 15 }},
                    {{ label: 'Credit Score', value: 5 }}
                  ].map((feat, i) => (
                    <div key={{i}}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="font-medium text-[#425466] dark:text-[#a0a0a0]">{{feat.label}}</span>
                        <span className="text-[#697386] dark:text-[#666666]">{{feat.value}}%</span>
                      </div>
                      <div className="w-full bg-[#f0f2f5] dark:bg-[#1a1a1a] rounded-full h-2">
                        <div className="bg-[#0570de] h-2 rounded-full" style={{{{ width: `${{feat.value}}%` }}}}></div>
                      </div>
                    </div>
                  ))}}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}}

      {{/* ── 8. CONFIRM MODAL ───────────────────────────────────────────────── */}}
      <ConfirmModal
        isOpen={{isConfirmModalOpen}}
        onClose={{() => setIsConfirmModalOpen(false)}}
        title={{confirmConfig.title}}
        description={{confirmConfig.description}}
        confirmLabel={{confirmConfig.confirmLabel}}
        confirmVariant={{confirmConfig.confirmVariant}}
        onConfirm={{confirmConfig.action}}
      />

      {{/* ── PROCESSING OVERLAY ─────────────────────────────────────────────── */}}
      {{isProcessing && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/10 dark:bg-black/40">
          <Loader2 className="w-8 h-8 animate-spin text-[#0570de]" />
        </div>
      )}}
    </div>
  );
}}
"""

with open('/Users/alumnoad/SolvAI/SolvAI/frontend/src/pages/ReportsPage.jsx', 'w') as f:
    f.write(new_content)

