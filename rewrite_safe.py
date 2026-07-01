import re

with open("frontend/src/pages/DataSourcesPage.jsx", "r") as f:
    content = f.read()

# Replace imports to make sure we don't have unused ones
# Wait, let's just replace initialAvailableIntegrations -> ALL_INTEGRATIONS
all_integrations = """const ALL_INTEGRATIONS = [
  // FINANCIAL PLATFORMS
  { key: 'stripe', name: 'Stripe', type: 'Payments', color: '#635bff', defaultAvailable: true, iconBg: 'bg-[#635bff]', Icon: CreditCard },
  { key: 'csv_upload', name: 'CSV Upload', type: 'File Import', color: '#0570de', defaultAvailable: true, iconBg: 'bg-[#697386]', Icon: FileUp },
  { key: 'xero', name: 'Xero', type: 'Accounting', color: '#13b5ea', defaultAvailable: false, iconBg: 'bg-[#00b0e0]', Icon: Database },
  { key: 'paypal', name: 'PayPal', type: 'Payments', color: '#003087', defaultAvailable: false, iconBg: 'bg-[#003087]', Icon: CreditCard },
  { key: 'belvo', name: 'Bank Account (Open Banking)', type: 'Open Banking', color: '#0f172a', defaultAvailable: false, iconBg: 'bg-[#0570de]', Icon: Globe },
  // DB SOURCES
  { key: 'mysql', name: 'MySQL', type: 'Database', color: '#4479a1', defaultAvailable: false, iconBg: 'bg-[#00758f]', Icon: Database },
  { key: 'mongodb', name: 'MongoDB', type: 'Database', color: '#4db33d', defaultAvailable: false, iconBg: 'bg-[#1a9e6e]', Icon: HardDrive },
  { key: 'snowflake', name: 'Snowflake', type: 'Data Warehouse', color: '#29b5e8', defaultAvailable: false, iconBg: 'bg-[#29b5e8]', Icon: Cloud },
  { key: 'bigquery', name: 'BigQuery', type: 'Data Warehouse', color: '#4285f4', defaultAvailable: false, iconBg: 'bg-[#4285f4]', Icon: BarChart3 },
  // OTHER COMING SOON
  { key: 'hubspot', name: 'HubSpot', type: 'CRM', color: '#ff7a59', defaultAvailable: false, iconBg: 'bg-[#ff7a59]', Icon: Users },
  { key: 'notion', name: 'Notion', type: 'Productivity', color: '#000000', defaultAvailable: false, iconBg: 'bg-[#0a2540]', Icon: FileText },
  { key: 'amazon_s3', name: 'Amazon S3', type: 'Storage', color: '#ff9900', defaultAvailable: false, iconBg: 'bg-[#ff9900]', Icon: HardDrive },
  { key: 'airtable', name: 'Airtable', type: 'Database', color: '#18bfff', defaultAvailable: false, iconBg: 'bg-[#18bfff]', Icon: LayoutGrid },
  { key: 'tableau', name: 'Tableau', type: 'Analytics', color: '#e97627', defaultAvailable: false, iconBg: 'bg-[#e97627]', Icon: BarChart2 },
  { key: 'kafka', name: 'Kafka', type: 'Streaming', color: '#231f20', defaultAvailable: false, iconBg: 'bg-[#0a2540]', Icon: Server },
];"""

content = re.sub(r'const initialAvailableIntegrations = \[.*?\];', all_integrations, content, flags=re.DOTALL)

# Update state
state_replace = """ const [connected, setConnected] = useState([]);
 const [availabilityMap, setAvailabilityMap] = useState({});"""
content = re.sub(r'const \[connected, setConnected\] = useState\(\[\]\);\n const \[available, setAvailable\] = useState\(initialAvailableIntegrations\);', state_replace, content)

# Update useEffect
use_effect = """ useEffect(() => {
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
          else if (isBelvo) { iconBg = 'bg-[#0570de]'; Icon = Globe; badge = 'Bank'; mappedName = 'Bank Account (Open Banking)'; }
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
            records: s.record_count?.toLocaleString() || s.connection_details?.records_count?.toLocaleString() || '0',
            isSyncing: false,
          };
        });
        setConnected(mapped);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();

    // Fetch availability independently
    if (dataSourcesApi.getAvailableIntegrations) {
      dataSourcesApi.getAvailableIntegrations()
        .then(r => setAvailabilityMap(r.data || {}))
        .catch(() => console.error("Could not fetch available integrations, using static defaults"));
    }
  }, [t]);

  const connectedNames = connected.map(c => c.name.toLowerCase());
  const integrations = ALL_INTEGRATIONS.map(i => ({
    ...i,
    available: availabilityMap[i.key]?.available ?? i.defaultAvailable
  })).filter(a => !connectedNames.includes(a.name.toLowerCase()));

  const showComingSoonToast = (name) => {
    addToast(`${name} integration is coming soon. Join the waitlist!`, 'info');
  };

  const handleConnectSource = async (integration) => {
    switch(integration.key) {
      case 'stripe':
      case 'csv_upload':
      case 'belvo':
        setConnectModal(integration);
        break;
      case 'xero':
        try {
          const res = await dataSourcesApi.authXero();
          window.location.href = res.data.url;
        } catch (e) {
          addToast("Failed to initiate Xero connection", "error");
        }
        break;
      case 'paypal':
        try {
          await dataSourcesApi.connectPayPal();
          addToast("PayPal connected!", "success");
          window.location.reload();
        } catch (e) {
          addToast("Failed to connect PayPal", "error");
        }
        break;
      default:
        setConnectModal(integration);
    }
  };"""

content = re.sub(r' useEffect\(\(\) => \{.*?\n  \}, \[t\]\);', use_effect, content, flags=re.DOTALL)


# Update confirmDisconnect for ALL_INTEGRATIONS
# Find the exact string from `const confirmDisconnect` to `setDisconnectModal(null);`
# It's inside confirmDisconnect
confirm_disconnect_replace = """ const confirmDisconnect = async () => {
 const name = disconnectModal;
 const sourceToRemove = connected.find((s) => s.name === name);
 
 if (sourceToRemove) {
   let sourceType = 'source';
   if (name === 'Stripe') sourceType = 'stripe';
   else if (name === 'Xero') sourceType = 'xero';
   else if (name === 'PayPal') sourceType = 'paypal';
   else if (name === 'Bank Account (Open Banking)') sourceType = 'belvo';
   else if (name === 'CSV Upload') sourceType = 'manual_upload';

   try {
     if (dataSourcesApi.disconnect) {
       await dataSourcesApi.disconnect(sourceType);
     }
   } catch (e) {
     console.error("Failed to disconnect from API", e);
     addToast("Failed to disconnect data source", "error");
     return;
   }

   setConnected((prev) => prev.filter((s) => s.name !== name));
 }
 addToast("Disconnected", "success");
 setDisconnectModal(null);
 };"""
content = re.sub(r' const confirmDisconnect = \(\) => \{.*?\n \};\n\n  const handleConnect', confirm_disconnect_replace + "\n\n  const handleConnect", content, flags=re.DOTALL)


# Update handleConnect setAvailable logic
handle_connect_replace = """  setConnected((prev) => [...prev, sourceToAdd]);
  addToast("Connected successfully", "success");"""
content = re.sub(r'  setConnected\(\(prev\) => \[\.\.\.prev, sourceToAdd\]\);\n  setAvailable\(\(prev\) => prev\.filter\(\(a\) => a\.name !== connectModal\.name\)\);\n  addToast\("Connected successfully", "success"\);', handle_connect_replace, content)


# Update AVAILABLE INTEGRATIONS section
available_integrations_replace = """ {/* AVAILABLE INTEGRATIONS */}
 <div className="mt-8">
 <h2 className="text-base font-semibold text-primary">
 {t('dataSources.addNew')}
 </h2>
 <p className="text-sm text-muted mt-1">
 Connect a new data source to start generating reports
 </p>

 <div className="grid grid-cols-4 gap-3 mt-4">
 {integrations.map((integration) => (
  <div 
    key={integration.key}
    onClick={() => integration.available 
      ? handleConnectSource(integration) 
      : showComingSoonToast(integration.name)
    }
    style={{
      padding: '24px',
      background: 'var(--bg-card)',
      border: '1px solid var(--border-color)',
      borderRadius: '8px',
      cursor: integration.available ? 'pointer' : 'default',
      opacity: integration.available ? 1 : 0.6,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '12px',
      transition: 'border-color 0.15s, box-shadow 0.15s',
    }}
    onMouseEnter={e => {
      if (integration.available) {
        e.currentTarget.style.borderColor = '#0570de';
        e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.08)';
      }
    }}
    onMouseLeave={e => {
      e.currentTarget.style.borderColor = 'var(--border-color)';
      e.currentTarget.style.boxShadow = 'none';
    }}
    className="relative group"
  >
    {/* Icon colored square */}
    <div style={{
      width: '48px', height: '48px',
      borderRadius: '10px',
      background: integration.color + '15',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '20px',
      fontWeight: 700,
      color: integration.color,
    }}>
      {integration.name[0]}
    </div>
    
    <span style={{
      fontSize: '14px',
      fontWeight: 500,
      color: 'var(--text-primary)',
      textAlign: 'center'
    }}>
      {integration.name}
    </span>
    
    {integration.available ? (
      <span style={{
        fontSize: '13px',
        color: '#0570de',
        fontWeight: 500,
      }}>
        Connect
      </span>
    ) : (
      <>
        <span style={{
          fontSize: '12px',
          color: 'var(--text-muted)',
          background: 'var(--bg-page)',
          padding: '2px 8px',
          borderRadius: '99px',
          border: '1px solid var(--border-color)',
        }}>
          Coming soon
        </span>
        <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-[#0a2540] text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
          Support for {integration.name} coming soon
        </div>
      </>
    )}
  </div>
 ))}
 </div>
 </div>"""
content = re.sub(r' \{\/\* AVAILABLE INTEGRATIONS \*\/.*?</div>\n </div>', available_integrations_replace, content, flags=re.DOTALL)

with open("frontend/src/pages/DataSourcesPage.jsx", "w") as f:
    f.write(content)
