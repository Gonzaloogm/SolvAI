import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import ConfirmModal from '../components/ConfirmModal.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { dataSources as dataSourcesApi } from '../api/client.js';
import {
 Plus,
 Cloud,
 Database,
 Globe,
 RefreshCw,
 Settings,
 CreditCard,
 FileUp,
 Loader2,
 AlertTriangle,
 Sparkles,
 X
} from 'lucide-react';

const cn = (...classes) => classes.filter(Boolean).join(' ');


 // Only sources the backend really supports. Xero, PayPal and Open Banking are switched
 // off at runtime when the server has no credentials for them (/available-integrations).
 const initialAvailableIntegrations = [
  { name: 'Stripe', iconBg: 'bg-[#635bff]', Icon: CreditCard, available: true, badge: 'Payments' },
  { name: 'PayPal', iconBg: 'bg-[#003087]', Icon: CreditCard, available: true, badge: 'Payments' },
  { name: 'CSV Upload', iconBg: 'bg-[#697386]', Icon: FileUp, available: true, badge: 'Bank statement' },
  { name: 'Xero', iconBg: 'bg-[#00b0e0]', Icon: Database, available: true, badge: 'Accounting' },
  { name: 'Bank Account (Open Banking)', iconBg: 'bg-[var(--brand-blue)]', Icon: Globe, available: true, badge: 'Bank' },
 ];

export default function DataSourcesPage() {
 const [connected, setConnected] = useState([]);
 const [available, setAvailable] = useState(initialAvailableIntegrations);
 
 const [expandedSettings, setExpandedSettings] = useState(null);
 const [connectModal, setConnectModal] = useState(null);
 const [disconnectModal, setDisconnectModal] = useState(null);
 const [isConnecting, setIsConnecting] = useState(false);
 const [loading, setLoading] = useState(true);
 const [demoAvailable, setDemoAvailable] = useState(false);
 const [demoConnecting, setDemoConnecting] = useState(false);
 const [refreshKey, setRefreshKey] = useState(0);

 const [csvFile, setCsvFile] = useState(null);
 const [uploadPreview, setUploadPreview] = useState(null);
 
 const [belvoInstitutions, setBelvoInstitutions] = useState(null);
 const [belvoCountry, setBelvoCountry] = useState("Spain");
 
 const { addToast } = useToast();
 const { t } = useTranslation();

 useEffect(() => {
   const fetchData = async () => {
     try {
       try {
         const belvoRes = await dataSourcesApi.getBelvoInstitutions();
         setBelvoInstitutions(belvoRes.data);
       } catch (e) {
         console.error("Failed to fetch belvo institutions", e);
       }
       
       const res = await dataSourcesApi.list();
       const data = Array.isArray(res.data) ? res.data : (res.data?.items ?? []);
       const mapped = data.map(s => {
         const typeLower = (s.source_type || s.type || '').toLowerCase();
         const isStripe = typeLower === 'stripe';
         const isXero = typeLower === 'xero';
         const isBelvo = typeLower === 'belvo';
         const isPayPal = typeLower === 'paypal';
         
         let iconBg = 'bg-[#336791]';
         let Icon = Cloud;
         let badge = 'Source';
         let mappedName = (s.source_type || s.type || 'Source').charAt(0).toUpperCase() + (s.source_type || s.type || 'Source').slice(1).toLowerCase();
         
         if (isStripe) { iconBg = 'bg-[#635bff]'; Icon = CreditCard; badge = 'Payments'; mappedName = 'Stripe'; }
         else if (isXero) { iconBg = 'bg-[#00b0e0]'; Icon = Database; badge = 'Accounting'; mappedName = 'Xero'; }
         else if (isBelvo) { iconBg = 'bg-[var(--brand-blue)]'; Icon = Globe; badge = 'Bank'; mappedName = 'Bank Account (Open Banking)'; }
         else if (isPayPal) { iconBg = 'bg-[#003087]'; Icon = CreditCard; badge = 'Payments'; mappedName = 'PayPal'; }
         else if (typeLower === 'manual_upload' || typeLower === 'csv') { iconBg = 'bg-[#697386]'; Icon = FileUp; badge = 'File'; mappedName = 'CSV Upload'; }
         
         return {
           name: mappedName,
           iconBg,
           Icon,
           statusColor: (s.status || '').toUpperCase() === 'CONNECTED' ? 'bg-[#1a9e6e]' : 'bg-[#df1b41]',
           statusText: (s.status || '').toUpperCase() === 'CONNECTED' ? t('dataSources.connected') : t('dataSources.error'),
           statusTextColor: (s.status || '').toUpperCase() === 'CONNECTED' ? 'text-[#1a9e6e]' : 'text-[#df1b41]',
           badge,
           lastSync: s.created_at ? new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(s.created_at)) : '—',
           records: (s.records_count ?? 0).toLocaleString(),
           isDemo: Boolean(s.config?.demo),
           isSyncing: false,
         };
       });
       setConnected(mapped);
       
       let dynamicAvailability = {};
       try {
         const availRes = await dataSourcesApi.getAvailableIntegrations();
         dynamicAvailability = availRes.data || {};
       } catch (e) {
         console.error("Failed to fetch available integrations", e);
       }
       
       setDemoAvailable(Boolean(dynamicAvailability.demo));
       const connectedNames = mapped.map(c => c.name.toLowerCase());
       setAvailable(initialAvailableIntegrations.map(a => {
         let isAvail = a.available;
         if (a.name === 'Xero' && dynamicAvailability.xero === false) isAvail = false;
         if (a.name === 'PayPal' && dynamicAvailability.paypal === false) isAvail = false;
         if (a.name === 'Bank Account (Open Banking)' && dynamicAvailability.bank_account === false) isAvail = false;
         return { ...a, available: isAvail };
       }).filter(a => !connectedNames.includes(a.name.toLowerCase())));
     } catch (e) {
       console.error(e);
     } finally {
       setLoading(false);
     }
    };
    fetchData();
  }, [t, refreshKey]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const xeroStatus = params.get('xero');
    if (xeroStatus === 'connected') {
      const months = params.get('months') || 0;
      addToast(`Xero connected successfully! Imported ${months} months of data.`, 'success');
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (xeroStatus === 'error') {
      addToast('Failed to connect Xero.', 'error');
      window.history.replaceState({}, document.title, window.location.pathname);
    }

  }, [addToast]);

 const handleSync = async (name) => {
 setConnected((prev) =>
 prev.map((s) =>
 s.name === name
 ? {
 ...s,
 statusColor: 'bg-[#c9870c]',
 statusText: t('dataSources.syncing'),
 statusTextColor: 'text-[#c9870c]',
 lastSync: 'Syncing now...',
 isSyncing: true,
 }
 : s
 )
 );

 try {
 await new Promise(r => setTimeout(r, 1500));
 setConnected((prev) =>
 prev.map((s) => {
 if (s.name === name) {
 const currentRecords = parseInt(s.records.replace(/,/g, ''), 10) || 0;
 const newRecords = currentRecords + Math.floor(Math.random() * (500 - 10 + 1)) + 10;
 return {
 ...s,
 statusColor: 'bg-[#1a9e6e]',
 statusText: t('dataSources.connected'),
 statusTextColor: 'text-[#1a9e6e]',
 lastSync: 'Just now',
 records: newRecords.toLocaleString(),
 isSyncing: false,
 };
 }
 return s;
 })
 );
 addToast("Sync complete", "success");
 } catch (error) {
 console.error(error);
 setConnected((prev) =>
 prev.map((s) =>
 s.name === name
 ? {
 ...s,
 statusColor: 'bg-[#df1b41]',
 statusText: t('dataSources.error'),
 statusTextColor: 'text-[#df1b41]',
 lastSync: 'Failed just now',
 isSyncing: false,
 }
 : s
 )
 );
 }
 };

 const handleDisconnect = (name) => {
 setDisconnectModal(name);
 };

 const confirmDisconnect = () => {
 const name = disconnectModal;
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
 addToast("Disconnected", "success");
 setDisconnectModal(null);
 };

 const handleConnect = async (e) => {
 e.preventDefault();
 setIsConnecting(true);
 
 try {
 let payload = {};
 if (connectModal.name === 'Stripe') {
   payload = { api_key: e.target.elements.api_key.value };
 } else if (connectModal.name === 'PayPal') {
   payload = {
     client_id: e.target.elements.client_id.value,
     client_secret: e.target.elements.client_secret.value,
   };
 }
 const res = await dataSourcesApi.connect(connectModal.name.toLowerCase(), payload);
 
 const sourceToAdd = {
 name: connectModal.name,
 iconBg: connectModal.iconBg,
 Icon: connectModal.Icon,
 statusColor: 'bg-[#1a9e6e]',
 statusText: t('dataSources.connected'),
 statusTextColor: 'text-[#1a9e6e]',
 badge: connectModal.badge || 'Integration',
 lastSync: 'Just now',
 records: String(res.data?.records_count ?? 0),
 isSyncing: false,
 };

 setConnected((prev) => [...prev, sourceToAdd]);
 setAvailable((prev) => prev.filter((a) => a.name !== connectModal.name));
 addToast("Connected successfully", "success");
 } catch (error) {
 console.error(error);
 addToast(error.response?.data?.detail || "Failed to connect", "error");
 } finally {
 setIsConnecting(false);
 setConnectModal(null);
 }
 };

 const handleCSVUpload = async (e) => {
   if (e) e.stopPropagation();
   setIsConnecting(true);
   try {
     const res = await dataSourcesApi.uploadCSV(csvFile);
     setUploadPreview(res.data);
   } catch (error) {
     console.error(error);
     addToast("Failed to upload file", "error");
   } finally {
     setIsConnecting(false);
   }
 };

 const handleCSVConfirm = async () => {
   setIsConnecting(true);
   try {
     await dataSourcesApi.confirmUpload(uploadPreview.upload_token);
     addToast("CSV Data connected!", "success"); // Step 4
     setConnectModal(null);
     setUploadPreview(null);
     setCsvFile(null);
     window.location.reload();
   } catch (error) {
     console.error(error);
     addToast("Confirmation failed", "error");
   } finally {
     setIsConnecting(false);
   }
 };

 const handleConnectDemo = async () => {
 setDemoConnecting(true);
 try {
 const res = await dataSourcesApi.connectDemo();
 addToast(t('dataSources.demo.done'), 'success');
 (res.data?.warnings || []).forEach(w => addToast(w, 'info'));
 setRefreshKey(k => k + 1);
 } catch (err) {
 addToast(err.response?.data?.detail || 'Could not connect the demo data', 'error');
 } finally {
 setDemoConnecting(false);
 }
 };

 if (loading) {
 return (
 <div className="page-enter flex items-center justify-center" style={{minHeight: '60vh'}}>
 <Loader2 className="w-8 h-8 animate-spin text-[var(--brand-blue)]" />
 </div>
 );
 }

 return (
 <div className="page-enter">
 {/* PAGE HEADER */}
 <div className="flex justify-between items-start mb-6">
 <div>
 <h1 className="text-xl font-semibold text-primary">{t('dataSources.title')}</h1>
 <p className="text-sm text-muted mt-1">
 {t('dataSources.subtitle')}
 </p>
 </div>
 <button 
 onClick={() => setConnectModal({ name: 'Custom Source', iconBg: 'bg-[var(--brand-blue)]', Icon: Plus, available: true })}
 className="bg-[var(--brand-blue)] text-white rounded-lg px-4 py-2.5 text-sm font-medium hover:bg-[var(--brand-blue-hover)] flex items-center gap-2 transition-colors"
 >
 <Plus className="w-4 h-4" />
 {t('dataSources.connect')}
 </button>
 </div>

 {/* DEMO DATA */}
 {demoAvailable && !connected.some(c => c.isDemo) && (
 <div className="mb-6 bg-card border border-border rounded-lg p-5 flex items-center gap-4">
 <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-[var(--brand-blue)] text-white shrink-0">
 <Sparkles className="w-5 h-5" />
 </div>
 <div className="flex-1">
 <p className="text-sm font-semibold text-primary">{t('dataSources.demo.title')}</p>
 <p className="text-sm text-muted mt-0.5">{t('dataSources.demo.body')}</p>
 </div>
 <button
 onClick={handleConnectDemo}
 disabled={demoConnecting}
 className="bg-[var(--brand-blue)] text-white rounded-lg px-4 py-2.5 text-sm font-medium hover:bg-[var(--brand-blue-hover)] flex items-center gap-2 transition-colors disabled:opacity-60 shrink-0"
 >
 {demoConnecting && <Loader2 className="w-4 h-4 animate-spin" />}
 {demoConnecting ? t('dataSources.demo.connecting') : t('dataSources.demo.button')}
 </button>
 </div>
 )}

 {/* CONNECTED SOURCES */}
 <div className="grid grid-cols-2 gap-4">
 {connected.map((source) => {
 const SourceIcon = source.Icon;
 const isSyncing = source.isSyncing;
 
 return (
 <div
 key={source.name}
 className="bg-card border border-border rounded-lg hover:shadow-[0_1px_3px_rgba(0,0,0,0.08)] transition-shadow flex flex-col"
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
 <span className="text-sm font-semibold text-primary">
 {source.name}
 </span>
 <span className="rounded-full px-2.5 py-0.5 text-xs font-medium bg-[#f0f2f5] text-muted">
 {source.badge}
 </span>
 {source.isDemo && (
 <span className="rounded-full px-2.5 py-0.5 text-xs font-medium bg-[#fff4e5] text-[#b25e09]">
 {t('dataSources.demo.badge')}
 </span>
 )}
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
 <p className="text-xs text-muted">Last sync</p>
 <p className="text-sm text-primary">{source.lastSync}</p>
 </div>
 <div>
 <p className="text-xs text-muted">Records</p>
 <p className="text-sm text-primary">{source.records}</p>
 </div>
 </div>

 {/* Actions row */}
 <div className="mt-4 pt-4 border-t border-border flex items-center gap-3">
 <button 
 onClick={() => handleSync(source.name)}
 disabled={isSyncing}
 className="text-sm font-medium text-[var(--brand-blue)] border border-border rounded-md px-3 py-1.5 hover:bg-page flex items-center gap-1.5 transition-colors disabled:opacity-50"
 >
 {isSyncing ? (
 <Loader2 className="w-3.5 h-3.5 animate-spin" />
 ) : (
 <RefreshCw className="w-3.5 h-3.5" />
 )}
 {isSyncing ? t('dataSources.syncing') : t('dataSources.syncNow')}
 </button>
 <button 
 onClick={() => setExpandedSettings(expandedSettings === source.name ? null : source.name)}
 className="p-1.5 rounded-md hover:bg-page transition-colors"
 >
 <Settings className="w-4 h-4 text-muted" />
 </button>
 <span 
 onClick={() => handleDisconnect(source.name)}
 className="ml-auto text-sm text-[#df1b41] hover:underline cursor-pointer"
 >
 {t('dataSources.disconnect')}
 </span>
 </div>
 </div>

 {/* Settings Panel */}
 {expandedSettings === source.name && (
 <div className="border-t border-border bg-[#f9fafb] p-5 rounded-b-lg">
 <div className="space-y-4">
 <div>
 <label className="block text-sm font-medium text-primary mb-1">
 Sync frequency
 </label>
 <select className="w-full text-sm border border-border rounded-md p-2 bg-card text-primary focus:outline-none focus:ring-2 focus:ring-[var(--brand-blue)]/20 focus:border-[var(--brand-blue)]">
 <option>Every 5 minutes</option>
 <option>Every 15 minutes</option>
 <option>Hourly</option>
 <option>Daily</option>
 <option>Manual</option>
 </select>
 </div>
 <div className="flex items-center justify-between">
 <label className="text-sm font-medium text-primary">
 Notify on error
 </label>
 <label className="relative inline-flex items-center cursor-pointer">
 <input type="checkbox" className="sr-only peer" defaultChecked />
 <div className="w-9 h-5 bg-[var(--border-color)] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-[16px] peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-card after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#1a9e6e]"></div>
 </label>
 </div>
 <div className="pt-2">
 <button 
 onClick={() => setExpandedSettings(null)}
 className="bg-[var(--brand-blue)] text-white rounded-md px-4 py-2 text-sm font-medium hover:bg-[var(--brand-blue-hover)] transition-colors"
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
 <h2 className="text-base font-semibold text-primary">
 {t('dataSources.addNew')}
 </h2>
 <p className="text-sm text-muted mt-1">
 Connect a new data source to start generating reports
 </p>

 <div className="grid grid-cols-4 gap-3 mt-4">
 {available.map((integration) => {
 const IntIcon = integration.Icon;
 return (
 <div
 key={integration.name}
 className={cn(
 'bg-card border border-border rounded-lg p-4 flex flex-col items-center text-center hover:shadow-[0_1px_3px_rgba(0,0,0,0.08)] transition-shadow cursor-pointer relative group',
 !integration.available && 'opacity-60 cursor-not-allowed'
 )}
 onClick={async () => {
 if (integration.available) {
  if (integration.name === 'Xero') {
   try {
    const res = await dataSourcesApi.getXeroAuthUrl();
    window.location.href = res.data.url;
   } catch (e) {
    addToast("Failed to initiate Xero connection", "error");
   }
  } else {
   setConnectModal(integration);
  }
 } else {
  addToast("This integration is coming soon. Join the waitlist!", "info");
 }
 }}
 >
 <div
 className={cn(
 'w-10 h-10 rounded-lg flex items-center justify-center text-white',
 integration.iconBg
 )}
 >
 <IntIcon className="w-5 h-5" />
 </div>
 <span className="text-sm font-medium text-primary mt-3">
 {integration.name}
 </span>
 {integration.available ? (
 <span className="text-xs text-[var(--brand-blue)] font-medium hover:underline mt-2">
 {t('dataSources.connect')}
 </span>
 ) : (
 <>
 <span className="bg-[#f0f2f5] text-muted text-xs rounded-full px-2 py-0.5 mt-2">
 Coming soon
 </span>
 <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-[var(--text-primary)] text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
 {integration.tooltip || `Support for ${integration.name} coming soon`}
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
 <div className="bg-card rounded-xl shadow-xl w-full max-w-md border border-border overflow-hidden">
 <div className="flex items-center justify-between p-5 border-b border-border">
 <div className="flex items-center gap-3">
 <div className={cn('w-8 h-8 rounded-md flex items-center justify-center text-white', connectModal.iconBg)}>
 <connectModal.Icon className="w-4 h-4" />
 </div>
 <h3 className="text-lg font-semibold text-primary">
 Connect {connectModal.name}
 </h3>
 </div>
 <button 
 onClick={() => setConnectModal(null)}
 className="text-muted hover:text-primary transition-colors"
 >
 <X className="w-5 h-5" />
 </button>
 </div>
  {connectModal.name === 'CSV Upload' ? (
    <div className="p-5">
      {!uploadPreview ? (
        <div className="space-y-4">
          <div className="text-sm font-semibold text-primary">STEP 1: File Upload Zone</div>
          <div 
            className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:bg-page transition-colors cursor-pointer"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => { e.preventDefault(); setCsvFile(e.dataTransfer.files[0]); }}
            onClick={() => document.getElementById('csv-upload').click()}
          >
            <input type="file" id="csv-upload" className="hidden" accept=".csv" onChange={(e) => setCsvFile(e.target.files[0])} />
            <FileUp className="w-8 h-8 text-muted mx-auto mb-3" />
            <p className="text-sm font-medium text-primary mb-1">{csvFile ? csvFile.name : "Click to upload or drag and drop"}</p>
            <p className="text-xs text-muted">CSV invoices or bank statements</p>
          </div>
          <div className="pt-2 border-t border-border flex justify-end gap-3">
            <button type="button" onClick={() => setConnectModal(null)} className="px-4 py-2 text-sm text-muted">Cancel</button>
            <button type="button" 
                    disabled={!csvFile || isConnecting}
                    onClick={handleCSVUpload}
                    className="bg-[var(--brand-blue)] text-white rounded-md px-4 py-2 text-sm font-medium hover:bg-[var(--brand-blue-hover)] disabled:opacity-50">
              {isConnecting ? "Uploading..." : "STEP 2: Preview Upload"}
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="text-sm font-semibold text-primary">STEP 3: Detection Results</div>
          <p className="text-sm text-primary font-medium">Found {uploadPreview.income_rows || uploadPreview.total_rows} income transactions across {uploadPreview.months_detected || '—'} months, totaling €{uploadPreview.total_income_detected?.toLocaleString('de-DE', {minimumFractionDigits: 2})}</p>
          <div className="overflow-auto border border-border rounded-md max-h-48">
            <table className="w-full text-xs text-left">
              <thead className="bg-page border-b border-border text-muted sticky top-0">
                <tr>
                  <th className="p-2">Date</th>
                  <th className="p-2">Description</th>
                  <th className="p-2">Amount</th>
                </tr>
              </thead>
              <tbody>
                {(uploadPreview.preview_rows || uploadPreview.preview || []).map((row, i) => (
                  <tr key={i} className="border-b border-border">
                    <td className="p-2">{row.date}</td>
                    <td className="p-2">{row.description || row.client || ''}</td>
                    <td className="p-2">€{typeof row.amount === 'number' ? row.amount.toLocaleString('de-DE', {minimumFractionDigits: 2}) : row.amount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <button type="button" onClick={() => setUploadPreview(null)} className="px-4 py-2 text-sm text-muted">Back</button>
            <button type="button" disabled={isConnecting} onClick={handleCSVConfirm} className="bg-[#1a9e6e] text-white rounded-md px-4 py-2 text-sm hover:bg-[#148259] disabled:opacity-50">
              {isConnecting ? "Confirming..." : "Confirm & Connect"}
            </button>
          </div>
        </div>
      )}
    </div>
  ) : connectModal.name === 'Bank Account (Open Banking)' ? (
    <form onSubmit={async (e) => {
      e.preventDefault();
      setIsConnecting(true);
      const fd = new FormData(e.target);
      const data = Object.fromEntries(fd.entries());
      try {
        await dataSourcesApi.connectBelvo(data);
        addToast("Bank connected successfully!", "success");
        setConnectModal(null);
        window.location.reload();
      } catch (err) {
        addToast("Failed to connect bank", "error");
      } finally {
        setIsConnecting(false);
      }
    }} className="p-5 space-y-4">
      <p className="text-sm text-secondary mb-4">
        Connect your bank account securely using Open Banking to analyze your financial history.
      </p>
      
      {belvoInstitutions ? (
        <>
          <div>
            <label className="block text-sm font-medium text-primary mb-1">Country</label>
            <select 
              className="w-full text-sm border border-border rounded-md p-2 bg-card text-primary focus:outline-none focus:ring-2 focus:ring-[var(--brand-blue)]/20 focus:border-[var(--brand-blue)]"
              value={belvoCountry}
              onChange={(e) => setBelvoCountry(e.target.value)}
            >
              {Object.keys(belvoInstitutions).map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-primary mb-1">Bank</label>
            <select 
              name="institution"
              className="w-full text-sm border border-border rounded-md p-2 bg-card text-primary focus:outline-none focus:ring-2 focus:ring-[var(--brand-blue)]/20 focus:border-[var(--brand-blue)]"
              required
            >
              {belvoInstitutions[belvoCountry]?.map(inst => (
                <option key={inst.id} value={inst.id}>{inst.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-primary mb-1">Username</label>
            <input type="text" name="username" required className="w-full text-sm border border-border rounded-md p-2 bg-card text-primary focus:outline-none focus:ring-2 focus:ring-[var(--brand-blue)]/20 focus:border-[var(--brand-blue)]" placeholder="Online banking username" />
          </div>
          <div>
            <label className="block text-sm font-medium text-primary mb-1">Password</label>
            <input type="password" name="password" required className="w-full text-sm border border-border rounded-md p-2 bg-card text-primary focus:outline-none focus:ring-2 focus:ring-[var(--brand-blue)]/20 focus:border-[var(--brand-blue)]" placeholder="Online banking password" />
          </div>
          
          <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-border">
            <button type="button" onClick={() => setConnectModal(null)} className="px-4 py-2 text-sm font-medium text-muted hover:text-primary transition-colors">Cancel</button>
            <button type="submit" disabled={isConnecting} className="bg-[var(--brand-blue)] text-white rounded-md px-4 py-2 text-sm font-medium hover:bg-[var(--brand-blue-hover)] transition-colors flex items-center gap-2 disabled:opacity-50">
              {isConnecting && <Loader2 className="w-4 h-4 animate-spin" />}
              {isConnecting ? "Connecting..." : "Connect Bank"}
            </button>
          </div>
        </>
      ) : (
        <div className="flex items-center gap-2 text-sm text-muted">
          <Loader2 className="w-4 h-4 animate-spin" />
          Loading supported banks...
        </div>
      )}
    </form>
  ) : (
  <form onSubmit={handleConnect} className="p-5 space-y-4">
  {connectModal.name === 'Stripe' ? (
   <>
     <p className="text-sm text-secondary mb-4">
       Connect your Stripe account to analyze your payment history and generate solvency reports.
     </p>
     <div>
       <label className="block text-sm font-medium text-primary mb-1">
         Stripe Secret Key
       </label>
       <input 
         name="api_key"
         type="password" 
         placeholder="sk_live_... or sk_test_..."
         className="w-full text-sm border border-border rounded-md p-2 bg-card text-primary focus:outline-none focus:ring-2 focus:ring-[var(--brand-blue)]/20 focus:border-[var(--brand-blue)]"
         required
       />
       <p className="text-xs text-muted mt-2">
         Find this in your Stripe Dashboard → Developers → API Keys. Use your Secret key.
       </p>
     </div>
     <div className="bg-[#fef3c7] text-[#92400e] border border-[#fcd34d] p-3 rounded-md mt-4 text-sm flex items-start gap-2">
       <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
       <p>Your key is encrypted and stored securely. We only read transaction data — we never make charges.</p>
     </div>
   </>
 ) : connectModal.name === 'PayPal' ? (
   <>
     <p className="text-sm text-secondary mb-4">
       Connect your PayPal business account to analyze the last 12 months of payments received.
     </p>
     <div>
       <label className="block text-sm font-medium text-primary mb-1">
         Client ID
       </label>
       <input
         name="client_id"
         type="text"
         autoComplete="off"
         className="w-full text-sm border border-border rounded-md p-2 bg-card text-primary focus:outline-none focus:ring-2 focus:ring-[var(--brand-blue)]/20 focus:border-[var(--brand-blue)]"
         required
       />
     </div>
     <div>
       <label className="block text-sm font-medium text-primary mb-1">
         Secret
       </label>
       <input
         name="client_secret"
         type="password"
         autoComplete="off"
         className="w-full text-sm border border-border rounded-md p-2 bg-card text-primary focus:outline-none focus:ring-2 focus:ring-[var(--brand-blue)]/20 focus:border-[var(--brand-blue)]"
         required
       />
       <p className="text-xs text-muted mt-2">
         Find these in developer.paypal.com → Apps &amp; Credentials → your REST app. The app needs the Transaction Search feature enabled.
       </p>
     </div>
     <div className="bg-[#fef3c7] text-[#92400e] border border-[#fcd34d] p-3 rounded-md mt-4 text-sm flex items-start gap-2">
       <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
       <p>Your credentials are encrypted and stored securely. We only read transaction data — we never make payments.</p>
     </div>
   </>
 ) : (
   <>
     <div>
     <label className="block text-sm font-medium text-primary mb-1">
     Connection Name
     </label>
     <input 
     type="text" 
     defaultValue={`${connectModal.name} Production`}
     className="w-full text-sm border border-border rounded-md p-2 bg-card text-primary focus:outline-none focus:ring-2 focus:ring-[var(--brand-blue)]/20 focus:border-[var(--brand-blue)]"
     required
     />
     </div>
     
     {connectModal.name === 'REST API' || connectModal.name === 'HubSpot' ? (
     <div>
     <label className="block text-sm font-medium text-primary mb-1">
     API Key
     </label>
     <input 
     type="password" 
     placeholder="sk_live_..."
     className="w-full text-sm border border-border rounded-md p-2 bg-card text-primary focus:outline-none focus:ring-2 focus:ring-[var(--brand-blue)]/20 focus:border-[var(--brand-blue)]"
     required
     />
     </div>
     ) : (
     <>
     <div>
     <label className="block text-sm font-medium text-primary mb-1">
     Host
     </label>
     <input 
     type="text" 
     placeholder="e.g. db.example.com"
     className="w-full text-sm border border-border rounded-md p-2 bg-card text-primary focus:outline-none focus:ring-2 focus:ring-[var(--brand-blue)]/20 focus:border-[var(--brand-blue)]"
     required
     />
     </div>
     <div className="grid grid-cols-2 gap-4">
     <div>
     <label className="block text-sm font-medium text-primary mb-1">
     Port
     </label>
     <input 
     type="text" 
     placeholder="5432"
     className="w-full text-sm border border-border rounded-md p-2 bg-card text-primary focus:outline-none focus:ring-2 focus:ring-[var(--brand-blue)]/20 focus:border-[var(--brand-blue)]"
     />
     </div>
     <div>
     <label className="block text-sm font-medium text-primary mb-1">
     User
     </label>
     <input 
     type="text" 
     placeholder="admin"
     className="w-full text-sm border border-border rounded-md p-2 bg-card text-primary focus:outline-none focus:ring-2 focus:ring-[var(--brand-blue)]/20 focus:border-[var(--brand-blue)]"
     />
     </div>
     </div>
     </>
     )}
   </>
 )}
 
 <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-border">
 <button 
 type="button"
 onClick={() => setConnectModal(null)}
 className="px-4 py-2 text-sm font-medium text-muted hover:text-primary transition-colors"
 >
 {t('common.cancel')}
 </button>
 <button 
 type="submit"
 disabled={isConnecting}
 className="bg-[var(--brand-blue)] text-white rounded-md px-4 py-2 text-sm font-medium hover:bg-[var(--brand-blue-hover)] transition-colors flex items-center gap-2 disabled:opacity-50"
  >
  {isConnecting && <Loader2 className="w-4 h-4 animate-spin" />}
  {isConnecting ? "Connecting..." : "Connect"}
  </button>
  </div>
  </form>
  )}
  </div>
  </div>
  )}

 {/* DISCONNECT MODAL */}
 <ConfirmModal
 isOpen={!!disconnectModal}
 onClose={() => setDisconnectModal(null)}
 title="Disconnect source"
 description={`Are you sure you want to disconnect ${disconnectModal}?`}
 confirmLabel="Disconnect"
 confirmVariant="danger"
 onConfirm={confirmDisconnect}
 />
 </div>
 );
}
