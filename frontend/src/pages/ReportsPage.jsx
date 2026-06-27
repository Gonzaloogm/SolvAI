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
} from 'lucide-react';

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
  Financial: 'bg-[#eff6ff] text-[#0570de]',
  Risk: 'bg-[#fffbeb] text-[#c9870c]',
  Compliance: 'bg-[#ecfdf5] text-[#1a9e6e]',
  Custom: 'bg-[#f0f2f5] text-[#697386]',
};

const STATUS_STYLES = {
  Complete: 'bg-[#ecfdf5] text-[#1a9e6e]',
  Processing: 'bg-[#fffbeb] text-[#c9870c]',
  Failed: 'bg-[#fef2f2] text-[#df1b41]',
  Draft: 'bg-[#f0f2f5] text-[#697386]',
};

const getAccuracyColor = (val) => {
  if (val === null || val === undefined) return 'text-[#697386]';
  if (val >= 80) return 'text-[#1a9e6e]';
  if (val >= 60) return 'text-[#c9870c]';
  return 'text-[#df1b41]';
};

// ── Component ────────────────────────────────────────────────────────────────
export default function ReportsPage() {
  const [selectedRows, setSelectedRows] = useState(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [openMenuId, setOpenMenuId] = useState(null);

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

  // ── Filtering ────────────────────────────────────────────────────────────
  const filteredReports = REPORTS.filter((r) => {
    // Search
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (
        !r.name.toLowerCase().includes(q) &&
        !r.subtitle.toLowerCase().includes(q)
      ) {
        return false;
      }
    }
    // Status
    if (statusFilter !== 'all' && r.status !== statusFilter) return false;
    // Type
    if (typeFilter !== 'all' && r.type !== typeFilter) return false;
    return true;
  });

  // ── Checkbox logic ───────────────────────────────────────────────────────
  const allVisibleSelected =
    filteredReports.length > 0 &&
    filteredReports.every((r) => selectedRows.has(r.id));

  const toggleAll = () => {
    if (allVisibleSelected) {
      setSelectedRows(new Set());
    } else {
      setSelectedRows(new Set(filteredReports.map((r) => r.id)));
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

  // ── Action menu toggle ──────────────────────────────────────────────────
  const handleMenuToggle = (e, id) => {
    e.stopPropagation();
    setOpenMenuId((prev) => (prev === id ? null : id));
  };

  return (
    <div className="page-enter">
      {/* ── 1. PAGE HEADER ─────────────────────────────────────────────────── */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-xl font-semibold text-[#0a2540]">Reports</h1>
          <p className="text-sm text-[#697386] mt-1">
            View and manage your AI explainability reports
          </p>
        </div>
        <button className="bg-[#0570de] text-white rounded-lg px-4 py-2.5 text-sm font-medium hover:bg-[#0462c7] flex items-center gap-2 transition-colors">
          <Plus className="w-4 h-4" />
          New Report
        </button>
      </div>

      {/* ── 2. FILTER BAR ──────────────────────────────────────────────────── */}
      <div className="mt-6 flex items-center gap-3">
        {/* Search */}
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#697386] w-4 h-4 pointer-events-none" />
          <input
            type="text"
            placeholder="Search reports…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-9 border border-[#e3e8ef] rounded-md pl-10 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#0570de] bg-white text-[#0a2540] placeholder:text-[#697386]"
          />
        </div>

        {/* Status select */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="h-9 border border-[#e3e8ef] rounded-md px-3 pr-8 text-sm bg-white appearance-none text-[#425466] cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#0570de]"
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
          className="h-9 border border-[#e3e8ef] rounded-md px-3 pr-8 text-sm bg-white appearance-none text-[#425466] cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#0570de]"
        >
          <option value="all">All Types</option>
          <option value="Financial">Financial</option>
          <option value="Risk">Risk</option>
          <option value="Compliance">Compliance</option>
        </select>

        {/* Date select */}
        <select
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value)}
          className="h-9 border border-[#e3e8ef] rounded-md px-3 pr-8 text-sm bg-white appearance-none text-[#425466] cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#0570de]"
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
        <div className="bg-[#0a2540] text-white rounded-lg px-4 py-3 flex items-center justify-between">
          <span className="text-sm font-medium">
            {selectedRows.size} selected
          </span>
          <div className="flex gap-2">
            <button className="bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded-md px-3 py-1.5 text-sm flex items-center gap-1.5 transition-colors">
              <Download className="w-3.5 h-3.5" />
              Download
            </button>
            <button className="bg-[#df1b41] hover:bg-[#c5183a] text-white rounded-md px-3 py-1.5 text-sm flex items-center gap-1.5 transition-colors">
              <Trash2 className="w-3.5 h-3.5" />
              Delete
            </button>
          </div>
        </div>
      </div>

      {/* ── 4. TABLE CARD ──────────────────────────────────────────────────── */}
      <div className="mt-4 bg-white border border-[#e3e8ef] rounded-lg overflow-hidden">
        {/* Results count */}
        <div className="px-6 py-3 border-b border-[#e3e8ef]">
          <span className="text-sm text-[#697386]">
            Showing {filteredReports.length} reports
          </span>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-[#f6f8fa]">
              <tr>
                <th className="w-12 py-3 px-4">
                  <input
                    type="checkbox"
                    checked={allVisibleSelected}
                    onChange={toggleAll}
                    className="w-4 h-4 rounded border-gray-300 accent-[#0570de] cursor-pointer"
                  />
                </th>
                <th className="py-3 px-4 text-left text-xs font-medium text-[#697386] uppercase tracking-wider">
                  Report
                </th>
                <th className="py-3 px-4 text-left text-xs font-medium text-[#697386] uppercase tracking-wider">
                  Type
                </th>
                <th className="py-3 px-4 text-left text-xs font-medium text-[#697386] uppercase tracking-wider">
                  Status
                </th>
                <th className="py-3 px-4 text-left text-xs font-medium text-[#697386] uppercase tracking-wider">
                  Data Source
                </th>
                <th className="py-3 px-4 text-right text-xs font-medium text-[#697386] uppercase tracking-wider">
                  Accuracy
                </th>
                <th className="py-3 px-4 text-left text-xs font-medium text-[#697386] uppercase tracking-wider">
                  Created
                </th>
                <th className="w-12 py-3 px-4 text-right text-xs font-medium text-[#697386] uppercase tracking-wider">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>

            <tbody>
              {filteredReports.map((report) => (
                <tr
                  key={report.id}
                  className="hover:bg-[#f6f8fa] transition-colors cursor-pointer group"
                >
                  {/* Checkbox */}
                  <td className="py-3 px-4 border-b border-[#e3e8ef]">
                    <input
                      type="checkbox"
                      checked={selectedRows.has(report.id)}
                      onChange={() => toggleRow(report.id)}
                      onClick={(e) => e.stopPropagation()}
                      className="w-4 h-4 rounded border-gray-300 accent-[#0570de] cursor-pointer"
                    />
                  </td>

                  {/* Report name */}
                  <td className="py-3 px-4 border-b border-[#e3e8ef]">
                    <div className="text-sm font-medium text-[#0a2540]">
                      {report.name}
                    </div>
                    <div className="text-xs text-[#697386] mt-0.5">
                      {report.subtitle}
                    </div>
                  </td>

                  {/* Type badge */}
                  <td className="py-3 px-4 border-b border-[#e3e8ef]">
                    <span
                      className={cn(
                        'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
                        TYPE_STYLES[report.type] || TYPE_STYLES.Custom
                      )}
                    >
                      {report.type}
                    </span>
                  </td>

                  {/* Status badge */}
                  <td className="py-3 px-4 border-b border-[#e3e8ef]">
                    <span
                      className={cn(
                        'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
                        STATUS_STYLES[report.status] || STATUS_STYLES.Draft
                      )}
                    >
                      {report.status}
                    </span>
                  </td>

                  {/* Data Source */}
                  <td className="py-3 px-4 border-b border-[#e3e8ef]">
                    <div className="flex items-center gap-1.5">
                      <Database className="w-3.5 h-3.5 text-[#697386]" />
                      <span className="text-sm text-[#425466]">
                        {report.dataSource}
                      </span>
                    </div>
                  </td>

                  {/* Accuracy */}
                  <td className="py-3 px-4 border-b border-[#e3e8ef] text-right">
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
                  <td className="py-3 px-4 border-b border-[#e3e8ef]">
                    <span className="text-sm text-[#697386]">
                      {report.createdAt}
                    </span>
                  </td>

                  {/* Actions */}
                  <td className="py-3 px-4 border-b border-[#e3e8ef] text-right">
                    <div className="relative" ref={openMenuId === report.id ? menuRef : undefined}>
                      <button
                        onClick={(e) => handleMenuToggle(e, report.id)}
                        className="p-1 rounded-md hover:bg-[#f0f2f5] transition-colors text-[#697386] hover:text-[#0a2540]"
                      >
                        <MoreHorizontal className="w-4 h-4" />
                      </button>

                      {/* Dropdown menu */}
                      {openMenuId === report.id && (
                        <div className="absolute right-0 top-full mt-1 bg-white border border-[#e3e8ef] rounded-lg shadow-lg py-1 w-44 z-10">
                          <button className="w-full px-3 py-2 text-sm hover:bg-[#f6f8fa] cursor-pointer flex items-center gap-2 text-[#425466]">
                            <Eye className="w-4 h-4" />
                            View
                          </button>
                          <button className="w-full px-3 py-2 text-sm hover:bg-[#f6f8fa] cursor-pointer flex items-center gap-2 text-[#425466]">
                            <Download className="w-4 h-4" />
                            Download PDF
                          </button>
                          <button className="w-full px-3 py-2 text-sm hover:bg-[#f6f8fa] cursor-pointer flex items-center gap-2 text-[#425466]">
                            <Copy className="w-4 h-4" />
                            Duplicate
                          </button>
                          <div className="border-t border-[#e3e8ef] my-1" />
                          <button className="w-full px-3 py-2 text-sm hover:bg-[#f6f8fa] cursor-pointer flex items-center gap-2 text-[#df1b41]">
                            <Trash2 className="w-4 h-4" />
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* ── 5. PAGINATION ──────────────────────────────────────────────────── */}
        <div className="px-6 py-4 flex justify-between items-center border-t border-[#e3e8ef]">
          <span className="text-sm text-[#697386]">
            Showing 1–8 of 12 reports
          </span>
          <div className="flex items-center gap-1">
            <button className="px-3 py-1.5 text-sm rounded-md border border-[#e3e8ef] text-[#697386] opacity-50 cursor-not-allowed">
              ← Previous
            </button>
            <button className="px-3 py-1.5 text-sm rounded-md bg-[#0570de] text-white">
              1
            </button>
            <button className="px-3 py-1.5 text-sm rounded-md border border-[#e3e8ef] text-[#425466] hover:bg-[#f6f8fa] transition-colors">
              2
            </button>
            <button className="px-3 py-1.5 text-sm rounded-md border border-[#e3e8ef] text-[#425466] hover:bg-[#f6f8fa] transition-colors">
              3
            </button>
            <button className="px-3 py-1.5 text-sm rounded-md border border-[#e3e8ef] text-[#425466] hover:bg-[#f6f8fa] transition-colors">
              Next →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
