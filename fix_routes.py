import re

with open("backend/app/api/data_sources.py", "r") as f:
    content = f.read()

# Find the generic connect_data_source endpoint
pattern = r'@router\.post\(\s*"/connect/\{type\}"[\s\S]*?async def connect_data_source[\s\S]*?return DataSourceResponse\.model_validate\(source\)'
match = re.search(pattern, content)
if match:
    # Remove it from the original location
    block = match.group(0)
    content = content.replace(block, "")
    
    # Append it to the end of the file
    content = content + "\n\n" + block + "\n"
    
    with open("backend/app/api/data_sources.py", "w") as f:
        f.write(content)
    print("Fixed data_sources.py")
else:
    print("Could not find the block to move")
