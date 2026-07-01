import os
import re

frontend_dir = 'frontend/src'

for root, _, files in os.walk(frontend_dir):
    for file in files:
        if file.endswith('.jsx') or file.endswith('.tsx'):
            path = os.path.join(root, file)
            with open(path, 'r') as f:
                content = f.read()

            # Find all <IconName usage
            used_components = set(re.findall(r'<([A-Z][a-zA-Z0-9]*)', content))
            
            # Check if lucide-react is imported
            lucide_import_match = re.search(r"import\s+{([^}]+)}\s+from\s+['\"]lucide-react['\"]", content)
            if not lucide_import_match:
                continue

            imported_icons = set(re.findall(r'\b([A-Z][a-zA-Z0-9]*)\b', lucide_import_match.group(1)))
            
            missing_icons = used_components - imported_icons
            
            # Filter out non-lucide components by checking if they are imported from elsewhere
            # Or just check if they are common lucide icons (we can assume if it's missing, maybe it's lucide)
            # Actually, let's look at the actual missing components.
            real_missing = []
            for icon in missing_icons:
                if not re.search(fr"import.*\b{icon}\b.*from\s+['\"](?!\blucide-react\b).*['\"]", content) and not re.search(fr"const\s+{icon}\s*=", content) and not re.search(fr"function\s+{icon}\s*\(", content):
                    real_missing.append(icon)
                    
            if real_missing:
                print(f"File: {path}")
                print(f"Missing imports to add to lucide-react: {real_missing}")
                
                # Add them to the lucide-react import
                new_import = lucide_import_match.group(1).strip()
                if new_import.endswith(','):
                    new_import += f" {', '.join(real_missing)},"
                else:
                    new_import += f", {', '.join(real_missing)}"
                    
                new_content = content[:lucide_import_match.start(1)] + " " + new_import + " " + content[lucide_import_match.end(1):]
                with open(path, 'w') as f:
                    f.write(new_content)
                print(f"Fixed {path}")

