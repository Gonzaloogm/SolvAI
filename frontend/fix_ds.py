import sys

def main():
    with open('src/pages/DataSourcesPage.jsx', 'r') as f:
        lines = f.readlines()
        
    out = []
    for line in lines:
        if 'const [loading, setLoading] = useState(true);' in line:
            out.append(line)
            out.append('  const [csvFile, setCsvFile] = useState(null);\n')
            out.append('  const [uploadPreview, setUploadPreview] = useState(null);\n')
            out.append('  const [belvoInstitutions, setBelvoInstitutions] = useState(null);\n')
            out.append('  const [belvoCountry, setBelvoCountry] = useState("Spain");\n')
            continue
            
        if 'const fetchData = async () => {' in line:
            out.append(line)
            out.append('      try {\n')
            out.append('        const belvoRes = await dataSourcesApi.getBelvoInstitutions();\n')
            out.append('        setBelvoInstitutions(belvoRes.data);\n')
            out.append('      } catch (e) { console.error(e); }\n')
            continue
            
        if 'const isXero = typeLower === \'xero\';' in line:
            out.append(line)
            out.append('          const isBelvo = typeLower === \'belvo\';\n')
            out.append('          const isPayPal = typeLower === \'paypal\';\n')
            out.append('          let iconBg = \'bg-[#336791]\';\n')
            out.append('          let Icon = Cloud;\n')
            out.append('          let badge = \'Source\';\n')
            out.append('          if (isStripe) { iconBg = \'bg-[#635bff]\'; Icon = CreditCard; badge = \'Payments\'; }\n')
            out.append('          else if (isXero) { iconBg = \'bg-[#00b0e0]\'; Icon = Database; badge = \'Accounting\'; }\n')
            out.append('          else if (isBelvo) { iconBg = \'bg-[#0570de]\'; Icon = Globe; badge = \'Bank\'; }\n')
            out.append('          else if (isPayPal) { iconBg = \'bg-[#003087]\'; Icon = CreditCard; badge = \'Payments\'; }\n')
            continue
            
        if 'return {' in line and 'name: (s.source_type' in lines[lines.index(line) + 1]:
            # This is the return statement inside mapped
            out.append(line)
            continue
            
        if 'name: (s.source_type' in line and 'iconBg: isStripe' in lines[lines.index(line) + 1]:
            out.append('            name: (s.source_type || s.type || \'Source\').charAt(0).toUpperCase() + (s.source_type || s.type || \'Source\').slice(1).toLowerCase(),\n')
            out.append('            iconBg,\n')
            out.append('            Icon,\n')
            continue
            
        if 'iconBg: isStripe' in line or 'Icon: isStripe' in line or 'badge: isStripe' in line:
            if 'badge: isStripe' in line:
                out.append('            badge,\n')
            continue
            
        if 'records: s.record_count' in line:
            out.append('            records: s.record_count?.toLocaleString() || s.connection_details?.records_count?.toLocaleString() || \'0\',\n')
            continue
            
        if '} ) : (' in line.replace(" ", "") and '<form onSubmit={handleConnect}' in ''.join(lines[lines.index(line):lines.index(line)+3]):
            # This is where we insert the Belvo form
            out.append('  ) : connectModal.name === \'Bank Account (Open Banking)\' ? (\n')
            out.append('    <form onSubmit={async (e) => {\n')
            out.append('      e.preventDefault();\n')
            out.append('      setIsConnecting(true);\n')
            out.append('      const fd = new FormData(e.target);\n')
            out.append('      const data = Object.fromEntries(fd.entries());\n')
            out.append('      try {\n')
            out.append('        await dataSourcesApi.connectBelvo(data);\n')
            out.append('        addToast("Bank connected successfully!", "success");\n')
            out.append('        setConnectModal(null);\n')
            out.append('        window.location.reload();\n')
            out.append('      } catch (err) {\n')
            out.append('        addToast("Failed to connect bank", "error");\n')
            out.append('      } finally {\n')
            out.append('        setIsConnecting(false);\n')
            out.append('      }\n')
            out.append('    }} className="p-5 space-y-4">\n')
            out.append('      <p className="text-sm text-secondary mb-4">\n')
            out.append('        Connect your bank account securely using Open Banking to analyze your financial history.\n')
            out.append('      </p>\n')
            out.append('      {belvoInstitutions ? (\n')
            out.append('        <>\n')
            out.append('          <div>\n')
            out.append('            <label className="block text-sm font-medium text-primary mb-1">Country</label>\n')
            out.append('            <select className="w-full text-sm border border-border rounded-md p-2 bg-card text-primary focus:outline-none focus:ring-2 focus:ring-[#0570de]/20 focus:border-[#0570de]" value={belvoCountry} onChange={(e) => setBelvoCountry(e.target.value)}>\n')
            out.append('              {Object.keys(belvoInstitutions).map(c => <option key={c} value={c}>{c}</option>)}\n')
            out.append('            </select>\n')
            out.append('          </div>\n')
            out.append('          <div>\n')
            out.append('            <label className="block text-sm font-medium text-primary mb-1">Bank</label>\n')
            out.append('            <select name="institution" className="w-full text-sm border border-border rounded-md p-2 bg-card text-primary focus:outline-none focus:ring-2 focus:ring-[#0570de]/20 focus:border-[#0570de]" required>\n')
            out.append('              {belvoInstitutions[belvoCountry]?.map(inst => <option key={inst.id} value={inst.id}>{inst.name}</option>)}\n')
            out.append('            </select>\n')
            out.append('          </div>\n')
            out.append('          <div>\n')
            out.append('            <label className="block text-sm font-medium text-primary mb-1">Username</label>\n')
            out.append('            <input type="text" name="username" required className="w-full text-sm border border-border rounded-md p-2 bg-card text-primary focus:outline-none focus:ring-2 focus:ring-[#0570de]/20 focus:border-[#0570de]" placeholder="Online banking username" />\n')
            out.append('          </div>\n')
            out.append('          <div>\n')
            out.append('            <label className="block text-sm font-medium text-primary mb-1">Password</label>\n')
            out.append('            <input type="password" name="password" required className="w-full text-sm border border-border rounded-md p-2 bg-card text-primary focus:outline-none focus:ring-2 focus:ring-[#0570de]/20 focus:border-[#0570de]" placeholder="Online banking password" />\n')
            out.append('          </div>\n')
            out.append('          <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-border">\n')
            out.append('            <button type="button" onClick={() => setConnectModal(null)} className="px-4 py-2 text-sm font-medium text-muted hover:text-primary transition-colors">Cancel</button>\n')
            out.append('            <button type="submit" disabled={isConnecting} className="bg-[#0570de] text-white rounded-md px-4 py-2 text-sm font-medium hover:bg-[#0462c7] transition-colors flex items-center gap-2 disabled:opacity-50">\n')
            out.append('              {isConnecting && <Loader2 className="w-4 h-4 animate-spin" />}\n')
            out.append('              {isConnecting ? "Connecting..." : "Connect Bank"}\n')
            out.append('            </button>\n')
            out.append('          </div>\n')
            out.append('        </>\n')
            out.append('      ) : (\n')
            out.append('        <div className="flex items-center gap-2 text-sm text-muted"><Loader2 className="w-4 h-4 animate-spin" />Loading supported banks...</div>\n')
            out.append('      )}\n')
            out.append('    </form>\n')
            out.append(line)
            continue
            
        out.append(line)
        
    with open('src/pages/DataSourcesPage.jsx', 'w') as f:
        f.writelines(out)

if __name__ == '__main__':
    main()
