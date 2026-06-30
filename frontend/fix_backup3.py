with open('/tmp/DataSourcesPage.jsx.bak', 'r') as f:
    lines = f.readlines()

out = []
skip = False
for i, line in enumerate(lines):
    if skip:
        if '{/* DISCONNECT MODAL */}' in line:
            skip = False
            out.append(line)
        continue
        
    if 'className="bg-[#0570de] text-white rounded-md px-4 py-2 text-sm font-medium hover:bg-[#0462c7] transition-colors flex items-center gap-2 disabled:opacity-50"' in line and '<form onSubmit={handleConnect}' in lines[i+1]:
        out.append(line)
        out.append('  >\n')
        out.append('  {isConnecting && <Loader2 className="w-4 h-4 animate-spin" />}\n')
        out.append('  {isConnecting ? "Connecting..." : "Connect"}\n')
        out.append('  </button>\n')
        out.append('  </div>\n')
        out.append('  </form>\n')
        out.append('  )}\n')
        out.append('  </div>\n')
        out.append('  </div>\n')
        out.append('  )}\n\n')
        skip = True
        continue
        
    out.append(line)
    
with open('src/pages/DataSourcesPage.jsx', 'w') as f:
    f.writelines(out)
