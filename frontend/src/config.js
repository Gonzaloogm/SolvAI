// Same-origin API under /api (the reverse proxy routes it), unless VITE_API_BASE_URL
// points elsewhere, e.g. http://localhost:8000 when running `npm run dev`.
export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/$/, '');

// WebSocket base matching API_BASE_URL (ws:// or wss:// like the page itself)
export function wsBaseUrl() {
  const url = new URL(API_BASE_URL, window.location.origin);
  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
  return url.toString().replace(/\/$/, '');
}
