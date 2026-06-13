import axios from 'axios';

// ─── Axios Instance ───────────────────────────────────────────────────────────
const apiClient = axios.create({
  baseURL: 'http://localhost:8000',
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
    apiClient.post('/auth/register', { email, password, org_name }),

  /**
   * Login — returns { access_token, token_type, ... }
   * POST /auth/token  (OAuth2 form-encoded or JSON depending on backend)
   */
  login: (email, password) => {
    const formData = new URLSearchParams();
    formData.append('username', email);
    formData.append('password', password);
    return apiClient.post('/auth/token', formData, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
  },

  /**
   * Refresh JWT.
   * POST /auth/refresh
   */
  refreshToken: (refreshToken) =>
    apiClient.post('/auth/refresh', { refresh_token: refreshToken }),
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
  list: () => apiClient.get('/data-sources'),
};

// ─── Solvency Reports ─────────────────────────────────────────────────────────
export const solvencyReports = {
  /**
   * Trigger new report generation.
   * POST /solvency-reports
   */
  create: () => apiClient.post('/solvency-reports'),

  /**
   * Get a single report.
   * GET /solvency-reports/{id}
   */
  get: (id) => apiClient.get(`/solvency-reports/${id}`),

  /**
   * List all reports for current org.
   * GET /solvency-reports
   */
  list: () => apiClient.get('/solvency-reports'),
};

// ─── Lender Matching ──────────────────────────────────────────────────────────
export const lenderMatching = {
  /**
   * Fetch lender matches for a report.
   * GET /lender-matching/{reportId}
   */
  get: (reportId) => apiClient.get(`/lender-matching/${reportId}`),
};

export default apiClient;
