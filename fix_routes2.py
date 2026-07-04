with open("backend/app/api/data_sources.py", "r") as f:
    lines = f.readlines()

start_idx = -1
end_idx = -1

for i, line in enumerate(lines):
    if '@router.post(' in line and '"/connect/{type}"' in lines[i+1]:
        start_idx = i
    if start_idx != -1 and i > start_idx and 'return DataSourceResponse.model_validate(source)' in line:
        end_idx = i
        break

if start_idx != -1 and end_idx != -1:
    block = lines[start_idx:end_idx+1]
    # Remove it
    del lines[start_idx:end_idx+1]
    # Append it at the end
    lines.append("\n\n")
    lines.extend(block)
    
    with open("backend/app/api/data_sources.py", "w") as f:
        f.writelines(lines)
    print("Successfully moved block")
else:
    print("Could not find block")
