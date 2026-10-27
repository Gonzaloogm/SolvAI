const LABELS = {
  STRIPE: 'Stripe',
  PAYPAL: 'PayPal',
  MANUAL_UPLOAD: 'Bank statement (CSV)',
  XERO: 'Xero',
  BELVO: 'Open Banking',
};

// Display name for a data-source type as the API returns it (e.g. "PAYPAL" -> "PayPal")
export function platformLabel(type) {
  const key = String(type || '').toUpperCase();
  return LABELS[key] || key.charAt(0) + key.slice(1).toLowerCase();
}
