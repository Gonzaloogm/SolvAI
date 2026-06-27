import React from 'react';
import {
  Plus,
  Cloud,
  Database,
  FileSpreadsheet,
  Globe,
  RefreshCw,
  Settings,
  HardDrive,
  BarChart3,
  Users,
  CreditCard,
  FileText,
  FileUp,
  LayoutGrid,
  BarChart2,
  Server,
} from 'lucide-react';

const cn = (...classes) => classes.filter(Boolean).join(' ');

const connectedSources = [
  {
    name: 'Salesforce',
    iconBg: 'bg-[#0570de]',
    Icon: Cloud,
    statusColor: 'bg-[#1a9e6e]',
    statusText: 'Connected',
    statusTextColor: 'text-[#1a9e6e]',
    badge: 'CRM',
    lastSync: '2 hours ago',
    records: '24,521',
  },
  {
    name: 'PostgreSQL',
    iconBg: 'bg-[#336791]',
    Icon: Database,
    statusColor: 'bg-[#1a9e6e]',
    statusText: 'Connected',
    statusTextColor: 'text-[#1a9e6e]',
    badge: 'Database',
    lastSync: '30 min ago',
    records: '1,203,847',
  },
  {
    name: 'Google Sheets',
    iconBg: 'bg-[#1a9e6e]',
    Icon: FileSpreadsheet,
    statusColor: 'bg-[#c9870c]',
    statusText: 'Syncing',
    statusTextColor: 'text-[#c9870c]',
    badge: 'Spreadsheet',
    lastSync: 'Syncing now...',
    records: '8,432',
  },
  {
    name: 'REST API',
    iconBg: 'bg-[#c9870c]',
    Icon: Globe,
    statusColor: 'bg-[#df1b41]',
    statusText: 'Error',
    statusTextColor: 'text-[#df1b41]',
    badge: 'API',
    lastSync: 'Failed 1h ago',
    records: '0',
  },
];

const availableIntegrations = [
  { name: 'MySQL', iconBg: 'bg-[#00758f]', Icon: Database, available: true },
  { name: 'MongoDB', iconBg: 'bg-[#1a9e6e]', Icon: HardDrive, available: true },
  { name: 'Snowflake', iconBg: 'bg-[#29b5e8]', Icon: Cloud, available: true },
  { name: 'BigQuery', iconBg: 'bg-[#4285f4]', Icon: BarChart3, available: true },
  { name: 'HubSpot', iconBg: 'bg-[#ff7a59]', Icon: Users, available: false },
  { name: 'Stripe', iconBg: 'bg-[#635bff]', Icon: CreditCard, available: false },
  { name: 'Notion', iconBg: 'bg-[#0a2540]', Icon: FileText, available: false },
  { name: 'CSV Upload', iconBg: 'bg-[#697386]', Icon: FileUp, available: true },
  { name: 'Amazon S3', iconBg: 'bg-[#ff9900]', Icon: HardDrive, available: false },
  { name: 'Airtable', iconBg: 'bg-[#18bfff]', Icon: LayoutGrid, available: false },
  { name: 'Tableau', iconBg: 'bg-[#e97627]', Icon: BarChart2, available: false },
  { name: 'Kafka', iconBg: 'bg-[#0a2540]', Icon: Server, available: false },
];

export default function DataSourcesPage() {
  return (
    <div className="page-enter">
      {/* PAGE HEADER */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-xl font-semibold text-[#0a2540]">Data Sources</h1>
          <p className="text-sm text-[#697386] mt-1">
            Manage your connected data integrations
          </p>
        </div>
        <button className="bg-[#0570de] text-white rounded-lg px-4 py-2.5 text-sm font-medium hover:bg-[#0462c7] flex items-center gap-2 transition-colors">
          <Plus className="w-4 h-4" />
          Connect source
        </button>
      </div>

      {/* CONNECTED SOURCES */}
      <div className="grid grid-cols-2 gap-4 mt-6">
        {connectedSources.map((source) => {
          const SourceIcon = source.Icon;
          return (
            <div
              key={source.name}
              className="bg-white border border-[#e3e8ef] rounded-lg p-5 hover:shadow-[0_1px_3px_rgba(0,0,0,0.08)] transition-shadow"
            >
              {/* Top row */}
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    'w-10 h-10 rounded-lg flex items-center justify-center text-white',
                    source.iconBg
                  )}
                >
                  <SourceIcon className="w-5 h-5" />
                </div>
                <span className="text-sm font-semibold text-[#0a2540]">
                  {source.name}
                </span>
                <span className="rounded-full px-2.5 py-0.5 text-xs font-medium bg-[#f0f2f5] text-[#697386]">
                  {source.badge}
                </span>
              </div>

              {/* Status row */}
              <div className="flex items-center gap-2 mt-3">
                <span
                  className={cn('w-2 h-2 rounded-full', source.statusColor)}
                />
                <span className={cn('text-sm', source.statusTextColor)}>
                  {source.statusText}
                </span>
              </div>

              {/* Info grid */}
              <div className="grid grid-cols-2 gap-4 mt-4">
                <div>
                  <p className="text-xs text-[#697386]">Last sync</p>
                  <p className="text-sm text-[#0a2540]">{source.lastSync}</p>
                </div>
                <div>
                  <p className="text-xs text-[#697386]">Records</p>
                  <p className="text-sm text-[#0a2540]">{source.records}</p>
                </div>
              </div>

              {/* Actions row */}
              <div className="mt-4 pt-4 border-t border-[#e3e8ef] flex items-center gap-3">
                <button className="text-sm font-medium text-[#0570de] border border-[#e3e8ef] rounded-md px-3 py-1.5 hover:bg-[#f6f8fa] flex items-center gap-1.5 transition-colors">
                  <RefreshCw className="w-3.5 h-3.5" />
                  Sync now
                </button>
                <button className="p-1.5 rounded-md hover:bg-[#f6f8fa] transition-colors">
                  <Settings className="w-4 h-4 text-[#697386]" />
                </button>
                <span className="ml-auto text-sm text-[#df1b41] hover:underline cursor-pointer">
                  Disconnect
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* AVAILABLE INTEGRATIONS */}
      <div className="mt-8">
        <h2 className="text-base font-semibold text-[#0a2540]">
          Add a new source
        </h2>
        <p className="text-sm text-[#697386] mt-1">
          Connect a new data source to start generating reports
        </p>

        <div className="grid grid-cols-4 gap-3 mt-4">
          {availableIntegrations.map((integration) => {
            const IntIcon = integration.Icon;
            return (
              <div
                key={integration.name}
                className={cn(
                  'bg-white border border-[#e3e8ef] rounded-lg p-4 flex flex-col items-center text-center hover:shadow-[0_1px_3px_rgba(0,0,0,0.08)] transition-shadow cursor-pointer',
                  !integration.available && 'opacity-60'
                )}
              >
                <div
                  className={cn(
                    'w-10 h-10 rounded-lg flex items-center justify-center text-white',
                    integration.iconBg
                  )}
                >
                  <IntIcon className="w-5 h-5" />
                </div>
                <span className="text-sm font-medium text-[#0a2540] mt-3">
                  {integration.name}
                </span>
                {integration.available ? (
                  <span className="text-xs text-[#0570de] font-medium hover:underline mt-2">
                    Connect
                  </span>
                ) : (
                  <span className="bg-[#f0f2f5] text-[#697386] text-xs rounded-full px-2 py-0.5 mt-2">
                    Coming soon
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
