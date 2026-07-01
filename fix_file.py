with open('frontend/src/pages/DataSourcesPage.jsx', 'r') as f:
    text = f.read()

# Replace initialAvailableIntegrations
old_integrations = """ const ALL_INTEGRATIONS = [
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
if old_integrations in text:
    pass
else:
    print("Cannot find old integrations")

print("Doing replacements via simple replace")

text = text.replace("const [available, setAvailable] = useState(initialAvailableIntegrations);", "")

# 1. Inside fetchData
old_fetch = """       const connectedNames = mapped.map(c => c.name.toLowerCase());
       setAvailable(initialAvailableIntegrations.filter(a => !connectedNames.includes(a.name.toLowerCase())));
     } catch (e) {"""
new_fetch = """       const connectedNames = mapped.map(c => c.name.toLowerCase());
     } catch (e) {"""
text = text.replace(old_fetch, new_fetch)

# 2. Add integrations logic after useEffect
old_use_effect_end = """   fetchData();
 }, [t]);"""
new_use_effect_end = """   fetchData();

   if (dataSourcesApi.getAvailableIntegrations) {
     dataSourcesApi.getAvailableIntegrations()
       .then(r => setAvailabilityMap(r.data || {}))
       .catch(() => console.error("Availability fetch failed, using static list"));
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
text = text.replace(old_use_effect_end, new_use_effect_end)

# 3. Handle confirmDisconnect
old_disconnect = """ const confirmDisconnect = () => {
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
 };"""
new_disconnect = """ const confirmDisconnect = async () => {
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
text = text.replace(old_disconnect, new_disconnect)

# 4. Handle handleConnect
old_handle_connect = """ setConnected((prev) => [...prev, sourceToAdd]);
 setAvailable((prev) => prev.filter((a) => a.name !== connectModal.name));
 addToast("Connected successfully", "success");"""
new_handle_connect = """ setConnected((prev) => [...prev, sourceToAdd]);
 addToast("Connected successfully", "success");"""
text = text.replace(old_handle_connect, new_handle_connect)

with open('frontend/src/pages/DataSourcesPage.jsx', 'w') as f:
    f.write(text)
