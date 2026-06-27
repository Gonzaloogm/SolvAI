import React, { useState } from 'react';
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
  Loader2,
  X
} from 'lucide-react';

const cn = (...classes) => classes.filter(Boolean).join(' ');

const initialConnectedSources = [
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
    isSyncing: true,
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

const initialAvailableIntegrations = [
  { name: 'MySQL', iconBg: 'bg-[#00758f]', Icon: Database, available: true, badge: 'Database' },
  { name: 'MongoDB', iconBg: 'bg-[#1a9e6e]', Icon: HardDrive, available: true, badge: 'Database' },
  { name: 'Snowflake', iconBg: 'bg-[#29b5e8]', Icon: Cloud, available: true, badge: 'Data Warehouse' },
  { name: 'BigQuery', iconBg: 'bg-[#4285f4]', Icon: BarChart3, available: true, badge: 'Data Warehouse' },
  { name: 'HubSpot', iconBg: 'bg-[#ff7a59]', Icon: Users, available: false, badge: 'CRM' },
  { name: 'Stripe', iconBg: 'bg-[#635bff]', Icon: CreditCard, available: false, badge: 'Payments' },
  { name: 'Notion', iconBg: 'bg-[#0a2540]', Icon: FileText, available: false, badge: 'Docs' },
  { name: 'CSV Upload', iconBg: 'bg-[#697386]', Icon: FileUp, available: true, badge: 'File' },
  { name: 'Amazon S3', iconBg: 'bg-[#ff9900]', Icon: HardDrive, available: false, badge: 'Storage' },
  { name: 'Airtable', iconBg: 'bg-[#18bfff]', Icon: LayoutGrid, available: false, badge: 'Spreadsheet' },
  { name: 'Tableau', iconBg: 'bg-[#e97627]', Icon: BarChart2, available: false, badge: 'BI' },
  { name: 'Kafka', iconBg: 'bg-[#0a2540]', Icon: Server, available: false, badge: 'Event Stream' },
];

export default function DataSourcesPage() {
  const [connected, setConnected] = useState(initialConnectedSources);
  const [available, setAvailable] = useState(initialAvailableIntegrations);
  
  const [expandedSettings, setExpandedSettings] = useState(null);
  const [connectModal, setConnectModal] = useState(null);

  const handleSync = (name) => {
    setConnected((prev) =>
      prev.map((s) =>
        s.name === name
          ? {
              ...s,
              statusColor: 'bg-[#c9870c]',
              statusText: 'Syncing',
              statusTextColor: 'text-[#c9870c]',
              lastSync: 'Syncing now...',
              isSyncing: true,
            }
          : s
      )
    );

    setTimeout(() => {
      setConnected((prev) =>
        prev.map((s) => {
          if (s.name === name) {
            const currentRecords = parseInt(s.records.replace(/,/g, ''), 10) || 0;
            const newRecords = currentRecords + Math.floor(Math.random() * (500 - 10 + 1)) + 10;
            return {
              ...s,
              statusColor: 'bg-[#1a9e6e]',
              statusText: 'Connected',
              statusTextColor: 'text-[#1a9e6e]',
              lastSync: 'Just now',
              records: newRecords.toLocaleString(),
              isSyncing: false,
            };
          }
          return s;
        })
      );
    }, 2000);
  };

  const handleDisconnect = (name) => {
    if (window.confirm(`Are you sure you want to disconnect ${name}?`)) {
      const sourceToRemove = connected.find((s) => s.name === name);
      setConnected((prev) => prev.filter((s) => s.name !== name));
      
      if (sourceToRemove) {
        setAvailable((prev) => {
          if (prev.some((a) => a.name === sourceToRemove.name)) return prev;
          return [
            ...prev,
            {
              name: sourceToRemove.name,
              iconBg: sourceToRemove.iconBg,
              Icon: sourceToRemove.Icon,
              available: true,
              badge: sourceToRemove.badge || 'Integration'
            },
          ];
        });
      }
    }
  };

  const handleConnect = (e) => {
    e.preventDefault();
    const sourceToAdd = {
      name: connectModal.name,
      iconBg: connectModal.iconBg,
      Icon: connectModal.Icon,
      statusColor: 'bg-[#c9870c]',
      statusText: 'Syncing',
      statusTextColor: 'text-[#c9870c]',
      badge: connectModal.badge || 'Integration',
      lastSync: 'Syncing now...',
      records: '0',
      isSyncing: true,
    };

    setConnected((prev) => [...prev, sourceToAdd]);
    setAvailable((prev) => prev.filter((a) => a.name !== connectModal.name));
    setConnectModal(null);

    setTimeout(() => {
      setConnected((prev) =>
        prev.map((s) => {
          if (s.name === sourceToAdd.name) {
            return {
              ...s,
              statusColor: 'bg-[#1a9e6e]',
              statusText: 'Connected',
              statusTextColor: 'text-[#1a9e6e]',
              lastSync: 'Just now',
              isSyncing: false,
            };
          }
          return s;
        })
      );
    }, 2000);
  };

  return (
    <div className="page-enter">
      {/* PAGE HEADER */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-xl font-semibold text-[#0a2540] dark:text-[#f5f5f5]">Data Sources</h1>
          <p className="text-sm text-[#697386] dark:text-[#a0a0a0] mt-1">
            Manage your connected data integrations
          </p>
        </div>
        <button 
          onClick={() => setConnectModal({ name: 'Custom Source', iconBg: 'bg-[#0570de]', Icon: Plus, available: true })}
          className="bg-[#0570de] text-white rounded-lg px-4 py-2.5 text-sm font-medium hover:bg-[#0462c7] flex items-center gap-2 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Connect source
        </button>
      </div>

      {/* CONNECTED SOURCES */}
      <div className="grid grid-cols-2 gap-4">
        {connected.map((source) => {
          const SourceIcon = source.Icon;
          const isSyncing = source.isSyncing;
          
          return (
            <div
              key={source.name}
              className="bg-white dark:bg-[#111111] border border-[#e3e8ef] dark:border-[#1f1f1f] rounded-lg hover:shadow-[0_1px_3px_rgba(0,0,0,0.08)] transition-shadow flex flex-col"
            >
              <div className="p-5">
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
                  <span className="text-sm font-semibold text-[#0a2540] dark:text-[#f5f5f5]">
                    {source.name}
                  </span>
                  <span className="rounded-full px-2.5 py-0.5 text-xs font-medium bg-[#f0f2f5] dark:bg-[#1f1f1f] text-[#697386] dark:text-[#a0a0a0]">
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
                    <p className="text-xs text-[#697386] dark:text-[#666666]">Last sync</p>
                    <p className="text-sm text-[#0a2540] dark:text-[#f5f5f5]">{source.lastSync}</p>
                  </div>
                  <div>
                    <p className="text-xs text-[#697386] dark:text-[#666666]">Records</p>
                    <p className="text-sm text-[#0a2540] dark:text-[#f5f5f5]">{source.records}</p>
                  </div>
                </div>

                {/* Actions row */}
                <div className="mt-4 pt-4 border-t border-[#e3e8ef] dark:border-[#1f1f1f] flex items-center gap-3">
                  <button 
                    onClick={() => handleSync(source.name)}
                    disabled={isSyncing}
                    className="text-sm font-medium text-[#0570de] border border-[#e3e8ef] dark:border-[#1f1f1f] dark:hover:bg-[#161616] rounded-md px-3 py-1.5 hover:bg-[#f6f8fa] flex items-center gap-1.5 transition-colors disabled:opacity-50"
                  >
                    {isSyncing ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <RefreshCw className="w-3.5 h-3.5" />
                    )}
                    {isSyncing ? 'Syncing...' : 'Sync now'}
                  </button>
                  <button 
                    onClick={() => setExpandedSettings(expandedSettings === source.name ? null : source.name)}
                    className="p-1.5 rounded-md hover:bg-[#f6f8fa] dark:hover:bg-[#161616] transition-colors"
                  >
                    <Settings className="w-4 h-4 text-[#697386] dark:text-[#a0a0a0]" />
                  </button>
                  <span 
                    onClick={() => handleDisconnect(source.name)}
                    className="ml-auto text-sm text-[#df1b41] hover:underline cursor-pointer"
                  >
                    Disconnect
                  </span>
                </div>
              </div>

              {/* Settings Panel */}
              {expandedSettings === source.name && (
                <div className="border-t border-[#e3e8ef] dark:border-[#1f1f1f] bg-[#f9fafb] dark:bg-[#161616] p-5 rounded-b-lg">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-[#0a2540] dark:text-[#f5f5f5] mb-1">
                        Sync frequency
                      </label>
                      <select className="w-full text-sm border border-[#e3e8ef] dark:border-[#2a2a2a] rounded-md p-2 bg-white dark:bg-[#111111] text-[#0a2540] dark:text-[#f5f5f5] focus:outline-none focus:ring-2 focus:ring-[#0570de]/20 focus:border-[#0570de]">
                        <option>Every 5 minutes</option>
                        <option>Every 15 minutes</option>
                        <option>Hourly</option>
                        <option>Daily</option>
                        <option>Manual</option>
                      </select>
                    </div>
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium text-[#0a2540] dark:text-[#f5f5f5]">
                        Notify on error
                      </label>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" className="sr-only peer" defaultChecked />
                        <div className="w-9 h-5 bg-[#e3e8ef] dark:bg-[#2a2a2a] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-[16px] peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#1a9e6e]"></div>
                      </label>
                    </div>
                    <div className="pt-2">
                      <button 
                        onClick={() => setExpandedSettings(null)}
                        className="bg-[#0570de] text-white rounded-md px-4 py-2 text-sm font-medium hover:bg-[#0462c7] transition-colors"
                      >
                        Save settings
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* AVAILABLE INTEGRATIONS */}
      <div className="mt-8">
        <h2 className="text-base font-semibold text-[#0a2540] dark:text-[#f5f5f5]">
          Add a new source
        </h2>
        <p className="text-sm text-[#697386] dark:text-[#a0a0a0] mt-1">
          Connect a new data source to start generating reports
        </p>

        <div className="grid grid-cols-4 gap-3 mt-4">
          {available.map((integration) => {
            const IntIcon = integration.Icon;
            return (
              <div
                key={integration.name}
                className={cn(
                  'bg-white dark:bg-[#111111] border border-[#e3e8ef] dark:border-[#1f1f1f] rounded-lg p-4 flex flex-col items-center text-center hover:shadow-[0_1px_3px_rgba(0,0,0,0.08)] transition-shadow cursor-pointer relative group',
                  !integration.available && 'opacity-60 cursor-not-allowed'
                )}
                onClick={() => integration.available && setConnectModal(integration)}
              >
                <div
                  className={cn(
                    'w-10 h-10 rounded-lg flex items-center justify-center text-white',
                    integration.iconBg
                  )}
                >
                  <IntIcon className="w-5 h-5" />
                </div>
                <span className="text-sm font-medium text-[#0a2540] dark:text-[#f5f5f5] mt-3">
                  {integration.name}
                </span>
                {integration.available ? (
                  <span className="text-xs text-[#0570de] font-medium hover:underline mt-2">
                    Connect
                  </span>
                ) : (
                  <>
                    <span className="bg-[#f0f2f5] dark:bg-[#1f1f1f] text-[#697386] dark:text-[#a0a0a0] text-xs rounded-full px-2 py-0.5 mt-2">
                      Coming soon
                    </span>
                    <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-[#0a2540] text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                      Support for {integration.name} coming soon
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* CONNECT MODAL */}
      {connectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 dark:bg-black/70 p-4">
          <div className="bg-white dark:bg-[#111111] rounded-xl shadow-xl w-full max-w-md border border-[#e3e8ef] dark:border-[#1f1f1f] overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-[#e3e8ef] dark:border-[#1f1f1f]">
              <div className="flex items-center gap-3">
                <div className={cn('w-8 h-8 rounded-md flex items-center justify-center text-white', connectModal.iconBg)}>
                  <connectModal.Icon className="w-4 h-4" />
                </div>
                <h3 className="text-lg font-semibold text-[#0a2540] dark:text-[#f5f5f5]">
                  Connect {connectModal.name}
                </h3>
              </div>
              <button 
                onClick={() => setConnectModal(null)}
                className="text-[#697386] hover:text-[#0a2540] dark:text-[#a0a0a0] dark:hover:text-[#f5f5f5] transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleConnect} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#0a2540] dark:text-[#f5f5f5] mb-1">
                  Connection Name
                </label>
                <input 
                  type="text" 
                  defaultValue={`${connectModal.name} Production`}
                  className="w-full text-sm border border-[#e3e8ef] dark:border-[#2a2a2a] rounded-md p-2 bg-white dark:bg-[#161616] text-[#0a2540] dark:text-[#f5f5f5] focus:outline-none focus:ring-2 focus:ring-[#0570de]/20 focus:border-[#0570de]"
                  required
                />
              </div>
              
              {connectModal.name === 'REST API' || connectModal.name === 'Stripe' || connectModal.name === 'HubSpot' ? (
                <div>
                  <label className="block text-sm font-medium text-[#0a2540] dark:text-[#f5f5f5] mb-1">
                    API Key
                  </label>
                  <input 
                    type="password" 
                    placeholder="sk_live_..."
                    className="w-full text-sm border border-[#e3e8ef] dark:border-[#2a2a2a] rounded-md p-2 bg-white dark:bg-[#161616] text-[#0a2540] dark:text-[#f5f5f5] focus:outline-none focus:ring-2 focus:ring-[#0570de]/20 focus:border-[#0570de]"
                    required
                  />
                </div>
              ) : (
                <>
                  <div>
                    <label className="block text-sm font-medium text-[#0a2540] dark:text-[#f5f5f5] mb-1">
                      Host
                    </label>
                    <input 
                      type="text" 
                      placeholder="e.g. db.example.com"
                      className="w-full text-sm border border-[#e3e8ef] dark:border-[#2a2a2a] rounded-md p-2 bg-white dark:bg-[#161616] text-[#0a2540] dark:text-[#f5f5f5] focus:outline-none focus:ring-2 focus:ring-[#0570de]/20 focus:border-[#0570de]"
                      required
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-[#0a2540] dark:text-[#f5f5f5] mb-1">
                        Port
                      </label>
                      <input 
                        type="text" 
                        placeholder="5432"
                        className="w-full text-sm border border-[#e3e8ef] dark:border-[#2a2a2a] rounded-md p-2 bg-white dark:bg-[#161616] text-[#0a2540] dark:text-[#f5f5f5] focus:outline-none focus:ring-2 focus:ring-[#0570de]/20 focus:border-[#0570de]"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[#0a2540] dark:text-[#f5f5f5] mb-1">
                        User
                      </label>
                      <input 
                        type="text" 
                        placeholder="admin"
                        className="w-full text-sm border border-[#e3e8ef] dark:border-[#2a2a2a] rounded-md p-2 bg-white dark:bg-[#161616] text-[#0a2540] dark:text-[#f5f5f5] focus:outline-none focus:ring-2 focus:ring-[#0570de]/20 focus:border-[#0570de]"
                      />
                    </div>
                  </div>
                </>
              )}
              
              <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-[#e3e8ef] dark:border-[#1f1f1f]">
                <button 
                  type="button"
                  onClick={() => setConnectModal(null)}
                  className="px-4 py-2 text-sm font-medium text-[#697386] dark:text-[#a0a0a0] hover:text-[#0a2540] dark:hover:text-[#f5f5f5] transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="bg-[#0570de] text-white rounded-md px-4 py-2 text-sm font-medium hover:bg-[#0462c7] transition-colors"
                >
                  Connect
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
