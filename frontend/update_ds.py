import re

with open('src/pages/DataSourcesPage.jsx', 'r') as f:
    content = f.read()

old_list = """ const initialAvailableIntegrations = [
  { name: 'MySQL', iconBg: 'bg-[#00758f]', Icon: Database, available: true, badge: 'Database' },
  { name: 'MongoDB', iconBg: 'bg-[#1a9e6e]', Icon: HardDrive, available: true, badge: 'Database' },
  { name: 'Snowflake', iconBg: 'bg-[#29b5e8]', Icon: Cloud, available: true, badge: 'Data Warehouse' },
  { name: 'BigQuery', iconBg: 'bg-[#4285f4]', Icon: BarChart3, available: true, badge: 'Data Warehouse' },
  { name: 'HubSpot', iconBg: 'bg-[#ff7a59]', Icon: Users, available: false, badge: 'CRM' },
  { name: 'Stripe', iconBg: 'bg-[#635bff]', Icon: CreditCard, available: true, badge: 'Payments' },
  { name: 'Xero', iconBg: 'bg-[#00b0e0]', Icon: Database, available: true, badge: 'Accounting' },
  { name: 'PayPal', iconBg: 'bg-[#003087]', Icon: CreditCard, available: true, badge: 'Payments' },
  { name: 'Bank Account (Open Banking)', iconBg: 'bg-[#0570de]', Icon: Globe, available: true, badge: 'Bank' },
  { name: 'Notion', iconBg: 'bg-[#0a2540]', Icon: FileText, available: false, badge: 'Docs' },
  { name: 'CSV Upload', iconBg: 'bg-[#697386]', Icon: FileUp, available: true, badge: 'File' },
  { name: 'Amazon S3', iconBg: 'bg-[#ff9900]', Icon: HardDrive, available: false, badge: 'Storage' },
  { name: 'Airtable', iconBg: 'bg-[#18bfff]', Icon: LayoutGrid, available: false, badge: 'Spreadsheet' },
  { name: 'Tableau', iconBg: 'bg-[#e97627]', Icon: BarChart2, available: false, badge: 'BI' },
  { name: 'Kafka', iconBg: 'bg-[#0a2540]', Icon: Server, available: false, badge: 'Event Stream' },
];"""

new_list = """ const staticIntegrationsList = [
  { key: 'mysql', name: 'MySQL', iconBg: 'bg-[#00758f]', Icon: Database, badge: 'Database' },
  { key: 'mongodb', name: 'MongoDB', iconBg: 'bg-[#1a9e6e]', Icon: HardDrive, badge: 'Database' },
  { key: 'snowflake', name: 'Snowflake', iconBg: 'bg-[#29b5e8]', Icon: Cloud, badge: 'Data Warehouse' },
  { key: 'bigquery', name: 'BigQuery', iconBg: 'bg-[#4285f4]', Icon: BarChart3, badge: 'Data Warehouse' },
  { key: 'hubspot', name: 'HubSpot', iconBg: 'bg-[#ff7a59]', Icon: Users, badge: 'CRM' },
  { key: 'stripe', name: 'Stripe', iconBg: 'bg-[#635bff]', Icon: CreditCard, badge: 'Payments' },
  { key: 'xero', name: 'Xero', iconBg: 'bg-[#00b0e0]', Icon: Database, badge: 'Accounting' },
  { key: 'paypal', name: 'PayPal', iconBg: 'bg-[#003087]', Icon: CreditCard, badge: 'Payments' },
  { key: 'belvo', name: 'Bank Account (Open Banking)', iconBg: 'bg-[#0570de]', Icon: Globe, badge: 'Bank' },
  { key: 'notion', name: 'Notion', iconBg: 'bg-[#0a2540]', Icon: FileText, badge: 'Docs' },
  { key: 'csv_upload', name: 'CSV Upload', iconBg: 'bg-[#697386]', Icon: FileUp, badge: 'File' },
  { key: 'amazon_s3', name: 'Amazon S3', iconBg: 'bg-[#ff9900]', Icon: HardDrive, badge: 'Storage' },
  { key: 'airtable', name: 'Airtable', iconBg: 'bg-[#18bfff]', Icon: LayoutGrid, badge: 'Spreadsheet' },
  { key: 'tableau', name: 'Tableau', iconBg: 'bg-[#e97627]', Icon: BarChart2, badge: 'BI' },
  { key: 'kafka', name: 'Kafka', iconBg: 'bg-[#0a2540]', Icon: Server, badge: 'Event Stream' },
];"""

content = content.replace(old_list, new_list)

old_state = """ const [available, setAvailable] = useState(initialAvailableIntegrations);"""
new_state = """ const [available, setAvailable] = useState([]);"""

content = content.replace(old_state, new_state)

old_fetch = """        const res = await dataSourcesApi.list();"""
new_fetch = """        const [res, availRes] = await Promise.all([
          dataSourcesApi.list(),
          dataSourcesApi.getAvailableIntegrations()
        ]);
        const availability = availRes.data;"""

content = content.replace(old_fetch, new_fetch)

old_filter = """       const connectedNames = mapped.map(c => c.name.toLowerCase());
       setAvailable(initialAvailableIntegrations.filter(a => !connectedNames.includes(a.name.toLowerCase())));"""

new_filter = """       const connectedNames = mapped.map(c => c.name.toLowerCase());
       
       const integrations = staticIntegrationsList.map(i => ({
         ...i,
         available: availability?.[i.key]?.available ?? false
       }));
       
       setAvailable(integrations.filter(a => !connectedNames.includes(a.name.toLowerCase())));"""

content = content.replace(old_filter, new_filter)

with open('src/pages/DataSourcesPage.jsx', 'w') as f:
    f.write(content)
