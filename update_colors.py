import os
import glob

replacements = {
    'bg-[#0570de]': 'bg-[var(--brand-blue)]',
    'bg-[#0462c7]': 'bg-[var(--brand-blue-hover)]',
    'text-[#0570de]': 'text-[var(--brand-blue)]',
    'border-[#0570de]': 'border-[var(--brand-blue)]',
    'ring-[#0570de]': 'ring-[var(--brand-blue)]',
    
    'text-[#0a2540]': 'text-[var(--text-primary)]',
    'bg-[#0a2540]': 'bg-[var(--text-primary)]',
    
    'bg-[#f6f8fa]': 'bg-[var(--bg-page)]',
    'bg-[#e3e8ef]': 'bg-[var(--border-color)]',
    
    'border-[#e3e8ef]': 'border-border',
    'text-[#697386]': 'text-muted',
}

for filepath in glob.glob("frontend/src/components/*.jsx"):
    with open(filepath, 'r') as f:
        content = f.read()
    
    for old, new in replacements.items():
        content = content.replace(old, new)
        
    with open(filepath, 'w') as f:
        f.write(content)

print("Colors updated in components")
