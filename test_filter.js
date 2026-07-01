const staticIntegrationsList = [
  { key: 'mysql', name: 'MySQL' },
  { key: 'mongodb', name: 'MongoDB' },
  { key: 'snowflake', name: 'Snowflake' },
  { key: 'bigquery', name: 'BigQuery' },
  { key: 'hubspot', name: 'HubSpot' },
  { key: 'stripe', name: 'Stripe' },
  { key: 'xero', name: 'Xero' },
  { key: 'paypal', name: 'PayPal' },
  { key: 'belvo', name: 'Bank Account (Open Banking)' },
  { key: 'notion', name: 'Notion' },
  { key: 'csv_upload', name: 'CSV Upload' },
  { key: 'amazon_s3', name: 'Amazon S3' },
  { key: 'airtable', name: 'Airtable' },
  { key: 'tableau', name: 'Tableau' },
  { key: 'kafka', name: 'Kafka' },
];
const availability = {
  stripe: { available: true },
  csv_upload: { available: true },
  xero: { available: false },
  paypal: { available: false },
  belvo: { available: false },
  mysql: { available: false },
  mongodb: { available: false },
  snowflake: { available: false },
  bigquery: { available: false },
  hubspot: { available: false },
  notion: { available: false },
  amazon_s3: { available: false },
  airtable: { available: false },
  tableau: { available: false },
  kafka: { available: false },
};
const connectedNames = ["stripe", "paypal", "csv upload"];
const integrations = staticIntegrationsList.map(i => ({
  ...i,
  available: availability?.[i.key]?.available ?? false
}));
const available = integrations.filter(a => !connectedNames.includes(a.name.toLowerCase()));
console.log(available.map(a => a.name));
