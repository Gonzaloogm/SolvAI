with open('frontend/src/pages/DataSourcesPage.jsx', 'r') as f:
    text = f.read()

old_render = """ {/* AVAILABLE INTEGRATIONS */}
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
    const res = await dataSourcesApi.authXero();
    window.location.href = res.data.url;
   } catch (e) {
    addToast("Failed to initiate Xero connection", "error");
   }
  } else if (integration.name === 'PayPal') {
   try {
    await dataSourcesApi.connectPayPal();
    addToast("PayPal connected!", "success");
    window.location.reload();
   } catch (e) {
    addToast("Failed to connect PayPal", "error");
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
 <span className="text-xs text-[#0570de] font-medium hover:underline mt-2">
 {t('dataSources.connect')}
 </span>
 ) : (
 <>
 <span className="bg-[#f0f2f5] text-muted text-xs rounded-full px-2 py-0.5 mt-2">
 Coming soon
 </span>
 <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-[#0a2540] text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
 {integration.tooltip || `Support for ${integration.name} coming soon`}
 </div>
 </>
 )}
 </div>
 );
 })}
 </div>
 </div>"""

new_render = """ {/* AVAILABLE INTEGRATIONS */}
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

if old_render in text:
    text = text.replace(old_render, new_render)
else:
    print("Could not find old render!")

with open('frontend/src/pages/DataSourcesPage.jsx', 'w') as f:
    f.write(text)
