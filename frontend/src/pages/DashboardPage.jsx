import React, { useState } from 'react';
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
} from 'lucide-react';

const cn = (...classes) => classes.filter(Boolean).join(' ');

export default function DashboardPage({ onNavigate }) {
  const [syncingSources, setSyncingSources] = useState({});
  const [syncedSources, setSyncedSources] = useState({});

  const handleSync = (name) => {
    setSyncingSources((prev) => ({ ...prev, [name]: true }));
    setTimeout(() => {
      setSyncingSources((prev) => ({ ...prev, [name]: false }));
      setSyncedSources((prev) => ({ ...prev, [name]: true }));
    }, 2000);
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

  const activityItems = [
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
  ];

  const typeBadgeStyles = {
    Financial: 'bg-[#eff6ff] dark:bg-[#0570de]/20 text-[#0570de] dark:text-[#60a5fa]',
    Risk: 'bg-[#fffbeb] dark:bg-[#c9870c]/20 text-[#c9870c] dark:text-[#fcd34d]',
    Compliance: 'bg-[#ecfdf5] dark:bg-[#1a9e6e]/20 text-[#1a9e6e] dark:text-[#34d399]',
  };

  const statusBadgeStyles = {
    Complete: 'bg-[#ecfdf5] dark:bg-[#1a9e6e]/20 text-[#1a9e6e] dark:text-[#34d399]',
    Processing: 'bg-[#fffbeb] dark:bg-[#c9870c]/20 text-[#c9870c] dark:text-[#fcd34d]',
    Failed: 'bg-[#fef2f2] dark:bg-[#df1b41]/20 text-[#df1b41] dark:text-[#f87171]',
  };

  return (
    <div className="page-enter">
      {/* Page Header */}
      <div>
        <h1 className="text-xl font-semibold text-[#0a2540] dark:text-[#f5f5f5]">Dashboard</h1>
        <p className="text-sm text-[#697386] dark:text-[#666666]">
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
              className="bg-white dark:bg-[#111111] border border-[#e3e8ef] dark:border-[#1f1f1f] rounded-lg p-5 px-6 transition-colors hover:border-[#cbd5e1] dark:hover:border-[#333333]"
            >
              <div className="flex justify-between">
                <span className="text-xs font-medium text-[#697386] dark:text-[#666666] uppercase tracking-wider">
                  {card.label}
                </span>
                <Icon className="text-[#697386] dark:text-[#666666] w-5 h-5" />
              </div>
              <div className="text-2xl font-semibold text-[#0a2540] dark:text-[#f5f5f5] mt-2">
                {card.value}
              </div>
              <div className="mt-1">
                {card.trend && (
                  <span className="rounded-full px-2.5 py-0.5 text-xs font-medium bg-[#ecfdf5] dark:bg-[#1a9e6e]/20 text-[#1a9e6e] dark:text-[#34d399]">
                    {card.trend}
                  </span>
                )}
                {card.subtitle && (
                  <span className="text-sm text-[#697386] dark:text-[#666666]">
                    {card.subtitle}
                  </span>
                )}
                {card.badge && (
                  <span className="rounded-full px-2.5 py-0.5 text-xs font-medium bg-[#ecfdf5] dark:bg-[#1a9e6e]/20 text-[#1a9e6e] dark:text-[#34d399]">
                    {card.badge}
                  </span>
                )}
                {card.progress !== undefined && (
                  <div className="h-1.5 bg-[#e3e8ef] dark:bg-[#2a2a2a] rounded-full mt-1">
                    <div
                      className="bg-[#0570de] dark:bg-[#3b82f6] rounded-full h-full"
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
        <div className="col-span-3 bg-white dark:bg-[#111111] border border-[#e3e8ef] dark:border-[#1f1f1f] rounded-lg p-5 px-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-base font-semibold text-[#0a2540] dark:text-[#f5f5f5]">
              Recent reports
            </h2>
            <button
              onClick={() => onNavigate && onNavigate('reports')}
              className="text-sm text-[#0570de] dark:text-[#60a5fa] hover:underline cursor-pointer bg-transparent border-none p-0"
            >
              View all reports →
            </button>
          </div>
          <div className="w-full overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-[#f6f8fa] dark:bg-[#161616]">
                  <th className="text-left text-xs font-medium text-[#697386] dark:text-[#666666] uppercase tracking-wider py-3 px-4">
                    Report name
                  </th>
                  <th className="text-left text-xs font-medium text-[#697386] dark:text-[#666666] uppercase tracking-wider py-3 px-4">
                    Type
                  </th>
                  <th className="text-left text-xs font-medium text-[#697386] dark:text-[#666666] uppercase tracking-wider py-3 px-4">
                    Status
                  </th>
                  <th className="text-left text-xs font-medium text-[#697386] dark:text-[#666666] uppercase tracking-wider py-3 px-4">
                    Created
                  </th>
                  <th className="text-right text-xs font-medium text-[#697386] dark:text-[#666666] uppercase tracking-wider py-3 px-4">
                    Accuracy
                  </th>
                  <th className="text-right text-xs font-medium text-[#697386] dark:text-[#666666] uppercase tracking-wider py-3 px-4">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {reports.map((report, index) => (
                  <tr
                    key={report.name}
                    onClick={() => onNavigate && onNavigate('reports')}
                    className={cn(
                      'hover:bg-[#f6f8fa] dark:hover:bg-[#1a1a1a] transition-colors cursor-pointer',
                      index < reports.length - 1 &&
                        'border-b border-[#e3e8ef] dark:border-[#1f1f1f]'
                    )}
                  >
                    <td className="py-3 px-4 text-sm font-medium text-[#0a2540] dark:text-[#f5f5f5]">
                      {report.name}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={cn(
                          'rounded-full px-2.5 py-0.5 text-xs font-medium',
                          typeBadgeStyles[report.type]
                        )}
                      >
                        {report.type}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={cn(
                          'rounded-full px-2.5 py-0.5 text-xs font-medium',
                          statusBadgeStyles[report.status]
                        )}
                      >
                        {report.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-sm text-[#697386] dark:text-[#666666]">
                      {report.created}
                    </td>
                    <td className="py-3 px-4 text-right text-sm">
                      {report.accuracy ? (
                        <span className="text-[#1a9e6e] dark:text-[#34d399] font-medium">
                          {report.accuracy}
                        </span>
                      ) : (
                        <span className="text-[#697386] dark:text-[#666666]">—</span>
                      )}
                    </td>
                    <td className="py-3 px-4" onClick={(e) => e.stopPropagation()}>
                      <div className="flex gap-2 justify-end">
                        <Eye className="w-4 h-4 text-[#697386] dark:text-[#666666] hover:text-[#0a2540] dark:hover:text-[#f5f5f5] cursor-pointer" />
                        {report.hasDownload && (
                          <Download className="w-4 h-4 text-[#697386] dark:text-[#666666] hover:text-[#0a2540] dark:hover:text-[#f5f5f5] cursor-pointer" />
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
          <div className="bg-white dark:bg-[#111111] border border-[#e3e8ef] dark:border-[#1f1f1f] rounded-lg p-5 px-6">
            <h2 className="text-base font-semibold text-[#0a2540] dark:text-[#f5f5f5] mb-4">
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
                        'border-b border-[#e3e8ef] dark:border-[#1f1f1f]'
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
                      <span className="text-sm font-medium text-[#0a2540] dark:text-[#f5f5f5]">
                        {source.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div
                        className={cn(
                          'w-2 h-2 rounded-full',
                          source.connected
                            ? 'bg-[#1a9e6e] dark:bg-[#34d399]'
                            : 'bg-[#df1b41] dark:bg-[#f87171]'
                        )}
                      />
                      <span className="text-xs text-[#697386] dark:text-[#666666]">
                        {syncingSources[source.name]
                          ? 'Syncing...'
                          : syncedSources[source.name]
                          ? 'Just now'
                          : source.lastSync}
                      </span>
                      {source.connected && (
                        <button
                          onClick={() => handleSync(source.name)}
                          disabled={syncingSources[source.name]}
                          className="ml-1 p-1 text-[#697386] dark:text-[#666666] hover:text-[#0a2540] dark:hover:text-[#f5f5f5] rounded-md transition-colors"
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
          </div>

          {/* Usage This Month Card */}
          <div className="bg-white dark:bg-[#111111] border border-[#e3e8ef] dark:border-[#1f1f1f] rounded-lg p-5 px-6">
            <h2 className="text-base font-semibold text-[#0a2540] dark:text-[#f5f5f5] mb-4">
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
                      <span className="text-[#425466] dark:text-[#a0a0a0]">{item.label}</span>
                      <span className="text-[#697386] dark:text-[#666666]">
                        {currentDisplay}
                        {item.unit} / {maxDisplay}
                        {item.unit}
                      </span>
                    </div>
                    <div className="h-1.5 bg-[#e3e8ef] dark:bg-[#2a2a2a] rounded-full mt-2">
                      <div
                        className="bg-[#0570de] dark:bg-[#3b82f6] rounded-full h-full"
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
      <div className="bg-white dark:bg-[#111111] border border-[#e3e8ef] dark:border-[#1f1f1f] rounded-lg p-5 px-6 mt-6">
        <h2 className="text-base font-semibold text-[#0a2540] dark:text-[#f5f5f5] mb-2">
          Recent activity
        </h2>
        <div>
          {activityItems.map((item, index) => (
            <div
              key={index}
              className={cn(
                'flex items-start gap-3 py-3',
                index < activityItems.length - 1 &&
                  'border-b border-[#e3e8ef] dark:border-[#1f1f1f]'
              )}
            >
              <div
                className={cn(
                  'w-2 h-2 rounded-full mt-1.5 flex-shrink-0',
                  item.color
                )}
              />
              <div className="flex-1">
                <p className="text-sm text-[#425466] dark:text-[#a0a0a0]">{item.text}</p>
                <p className="text-xs text-[#697386] dark:text-[#666666] mt-0.5">{item.time}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
