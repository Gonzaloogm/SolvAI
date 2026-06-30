import re

with open('/tmp/DataSourcesPage.jsx.bak', 'r') as f:
    text = f.read()

# We know the duplicated block starts with `     <form onSubmit={handleConnect} className="p-5 space-y-4">` around line 786.
# Let's find the exact bad string:
bad_string = """  className="bg-[#0570de] text-white rounded-md px-4 py-2 text-sm font-medium hover:bg-[#0462c7] transition-colors flex items-center gap-2 disabled:opacity-50"
     <form onSubmit={handleConnect} className="p-5 space-y-4">"""

good_string = """  className="bg-[#0570de] text-white rounded-md px-4 py-2 text-sm font-medium hover:bg-[#0462c7] transition-colors flex items-center gap-2 disabled:opacity-50"
  >
  {isConnecting && <Loader2 className="w-4 h-4 animate-spin" />}
  {isConnecting ? 'Connecting...' : 'Connect'}
  </button>
  </div>
  </form>
  )}
  </div>
  </div>
  )}"""

# First, locate the position of bad_string
idx = text.find(bad_string)
if idx != -1:
    # Delete everything from idx up to the end of the duplicated form (which is just before " {/* DISCONNECT MODAL */}")
    disconnect_idx = text.find("{/* DISCONNECT MODAL */}")
    text = text[:idx] + good_string + "\n\n " + text[disconnect_idx:]
else:
    print("bad_string not found")

with open('src/pages/DataSourcesPage.jsx', 'w') as f:
    f.write(text)
