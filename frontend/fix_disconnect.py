with open('src/pages/DataSourcesPage.jsx', 'r') as f:
    content = f.read()

old_state = """ const [available, setAvailable] = useState([]);"""
new_state = """ const [available, setAvailable] = useState([]);
 const [availabilityMap, setAvailabilityMap] = useState({});"""
content = content.replace(old_state, new_state)

old_fetch = """        const availability = availRes.data;"""
new_fetch = """        const availability = availRes.data;
        setAvailabilityMap(availability);"""
content = content.replace(old_fetch, new_fetch)


old_disconnect = """ return [
 ...prev,
 {
 name: sourceToRemove.name,
 iconBg: sourceToRemove.iconBg,
 Icon: sourceToRemove.Icon,
 available: true,
 badge: sourceToRemove.badge || 'Integration'
 }
 ];"""

new_disconnect = """ const staticDef = staticIntegrationsList.find(i => i.name === sourceToRemove.name);
 return [
 ...prev,
 {
 name: sourceToRemove.name,
 iconBg: sourceToRemove.iconBg,
 Icon: sourceToRemove.Icon,
 available: staticDef ? (availabilityMap?.[staticDef.key]?.available ?? false) : false,
 badge: sourceToRemove.badge || 'Integration'
 }
 ];"""

content = content.replace(old_disconnect, new_disconnect)

with open('src/pages/DataSourcesPage.jsx', 'w') as f:
    f.write(content)
