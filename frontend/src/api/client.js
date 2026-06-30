import axios from 'axios';

// ─── Axios Instance ───────────────────────────────────────────────────────────
const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

// ─── Request Interceptor: attach JWT ─────────────────────────────────────────
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('solvai_token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ─── Response Interceptor: handle 401 ────────────────────────────────────────
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('solvai_token');
      localStorage.removeItem('solvai_user');
      // Hard redirect to login
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// ─── Auth ─────────────────────────────────────────────────────────────────────
export const auth = {
  /**
   * Register a new user + org.
   * POST /auth/register
   */
  register: (email, password, org_name) =>
    apiClient.post('/auth/register', { email, password, organization_name: org_name }),

  /**
   * Login — returns { access_token, refresh_token, token_type }
   * POST /auth/login
   */
  login: (email, password) =>
    apiClient.post('/auth/login', { email, password }),

  /**
   * Refresh JWT.
   * POST /auth/refresh-token
   */
  refreshToken: (refreshToken) =>
    apiClient.post('/auth/refresh-token', { refresh_token: refreshToken }),
};

// ─── Organizations ────────────────────────────────────────────────────────────
export const organizations = {
  get: (id) => apiClient.get(`/organizations/${id}`),
  update: (id, data) => apiClient.patch(`/organizations/${id}`, data),
};

// ─── Users ────────────────────────────────────────────────────────────────────
export const users = {
  me: () => apiClient.get('/users/me'),
  updateMe: (data) => apiClient.patch('/users/me', data),
};

// ─── Data Sources ─────────────────────────────────────────────────────────────
export const dataSources = {
  /**
   * Connect a new data source.
   * POST /data-sources/connect/{type}
   */
  connect: (type, connectionDetails) =>
    apiClient.post(`/data-sources/connect/${type}`, {
      connection_details: connectionDetails,
    }),

  /**
   * List all data sources for current org.
   * GET /data-sources
   */
  list: () => apiClient.get('/data-sources/'),

  uploadCSV: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return apiClient.post('/data-sources/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  confirmUpload: (uploadToken) =>
    apiClient.post('/data-sources/upload/confirm', { upload_token: uploadToken }),
    
  authXero: () => apiClient.get('/data-sources/xero/auth'),
  
  connectPayPal: () => apiClient.post('/data-sources/connect/paypal'),

  getBelvoInstitutions: () => apiClient.get('/data-sources/belvo/institutions'),
  connectBelvo: (data) => apiClient.post('/data-sources/connect/belvo', data),
};

// ─── Solvency Reports ─────────────────────────────────────────────────────────
export const solvencyReports = {
  /**
   * Trigger new report generation.
   * POST /solvency-reports
   */
  create: (data = {}) => apiClient.post('/solvency-reports/', data),

  /**
   * Trigger new rental certificate generation.
   * POST /solvency-reports/rental
   */
  createRental: (data = {}) => apiClient.post('/solvency-reports/rental', data),

  /**
   * Get a single report.
   * GET /solvency-reports/{id}
   */
  get: (id) => apiClient.get(`/solvency-reports/${id}`),

  /**
   * List all reports for current org.
   * GET /solvency-reports
   */
  list: () => apiClient.get('/solvency-reports/'),

  /**
   * Get raw transactions for demo.
   * GET /solvency-reports/demo-transactions
   */
  getDemoTransactions: () => apiClient.get('/solvency-reports/demo-transactions'),

  /**
   * Get score history.
   * GET /solvency-reports/score-history
   */
  getScoreHistory: () => apiClient.get('/solvency-reports/score-history'),

  /**
   * Download the WeasyPrint PDF for a completed report.
   * GET /solvency-reports/{id}/pdf
   */
  getPDF: (id) => apiClient.get(`/solvency-reports/${id}/pdf`, { responseType: 'blob' }),

  /**
   * Create share link for a report.
   */
  createShare: (id, data) => apiClient.post(`/solvency-reports/${id}/share`, data),

  /**
   * Disable share link for a report.
   */
  deleteShare: (id) => apiClient.delete(`/solvency-reports/${id}/share`),
};

// ─── Lender Matching ──────────────────────────────────────────────────────────
export const lenderMatching = {
  /**
   * Fetch lender matches for a report.
   * GET /lender-matching/{reportId}
   */
  get: (reportId) => apiClient.get(`/lender-matching/${reportId}`),
};

// ─── Billing ────────────────────────────────────────────────────────────────
export const billing = {
  /**
   * Get subscription details
   * GET /billing/subscription
   */
  getSubscription: () => apiClient.get('/billing/subscription'),
};

// ─── Alerts ───────────────────────────────────────────────────────────────────
export const alerts = {
  getAll: () => apiClient.get('/alerts/'),
  markRead: (id) => apiClient.patch(`/alerts/${id}/read`),
  markAllRead: () => apiClient.patch('/alerts/read-all'),
  delete: (id) => apiClient.delete(`/alerts/${id}`),
};

// ─── API Keys ──────────────────────────────────────────────────────────────────
export const apiKeys = {
  getAll: () => apiClient.get('/api-keys/'),
  create: (data) => apiClient.post('/api-keys/', data),
  revoke: (id) => apiClient.delete(`/api-keys/${id}`),
};

export default apiClient;
