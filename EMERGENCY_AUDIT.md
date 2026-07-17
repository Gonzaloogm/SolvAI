━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## 1. PRODUCTION HEALTH CHECK
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
### 1.1 Health endpoint
{"status":"ok","version":"0.1.0"}
HTTP:200
### 1.2 Login attempt (demo account)
{"access_token":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIyNTk0MGNmZC1mYjNjLTQ1ODktOGI1MC0yOTA4ZTJjNTRlMmYiLCJ0b2tlbl90eXBlIjoiYWNjZXNzIiwiZXhwIjoxNzg0MTI1MjIzfQ.pq8B9KCzaJuwZ7Em5u74P4HpUUB2shQG1JWLgajN7oE","refresh_token":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIyNTk0MGNmZC1mYjNjLTQ1ODktOGI1MC0yOTA4ZTJjNTRlMmYiLCJ0b2tlbl90eXBlIjoicmVmcmVzaCIsImV4cCI6MTc4NjExMjQyM30.RcONwfQOuy193fKbjbBnPdSKdRvUVDaq3fEktNGmWJ8","token_type":"bearer"}
HTTP:200
### 1.3 Login attempt (gongarmart)
{"detail":"Invalid email or password"}
HTTP:401
### 1.4 Available routes (openapi)
Total routes: 65
  /admin/cleanup-failed-reports
  /admin/create-beta-user
  /admin/create-promo
  /admin/promo-stats
  /admin/test-crypto
  /alerts/
  /alerts/read-all
  /alerts/test
  /alerts/{alert_id}
  /alerts/{alert_id}/read
  /api-keys/
  /api-keys/{key_id}
  /auth/admin/reset-demo-password
  /auth/change-password
  /auth/login
  /auth/me
  /auth/refresh-token
  /auth/register
  /auth/validate-promo
  /billing/apply-promo
  /billing/create-checkout-session
  /billing/create-report-checkout
  /billing/subscription
  /billing/webhook
  /data-sources/
  /data-sources/available-integrations
  /data-sources/belvo/institutions
  /data-sources/connect/belvo
  /data-sources/connect/stripe
  /data-sources/connect/{type}
  /data-sources/paypal/callback
  /data-sources/paypal/connect
  /data-sources/upload
  /data-sources/upload/confirm
  /data-sources/xero/callback
  /data-sources/xero/connect
  /data-sources/{source_id}/sync
  /data-sources/{source_type}
  /health
  /lender-matching/manifesto
  /lender-matching/{report_id}
  /organizations/{id}
  /public/report/{token}
  /public/report/{token}/pdf
  /reports/pl-statement
  /reports/pl-statement/pdf
  /simulate/score
  /solvency-reports/
  /solvency-reports/demo-transactions
  /solvency-reports/mortgage
  /solvency-reports/rental
  /solvency-reports/score-history
  /solvency-reports/{id}
  /solvency-reports/{id}/pdf
  /solvency-reports/{report_id}/share
  /users/me
  /v1/assess
  /v1/assess/{report_id}
  /v1/verify/{token}
  /verify/authorize/{token}
  /verify/request
  /verify/status/{request_id}
  /webhooks/stripe
  /webhooks/stripe-billing
  /webhooks/xero

### 1.5 Cloud Run services status
NAME             TYPE   STATUS  MEMORY
solvai-api       Ready  True    1Gi
solvai-frontend  Ready  True    512Mi
solvai-worker    Ready  True    2Gi

### 1.6 Recent error logs (API)

### 1.7 Recent error logs (Worker)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## 2. FRONTEND BUILD STATUS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
### 2.1 Frontend build

> solvai-frontend@0.1.0 build
> vite build

vite v5.4.21 building for production...
transforming...
✓ 2468 modules transformed.
rendering chunks...
computing gzip size...
dist/index.html                   1.52 kB │ gzip:   0.75 kB
dist/assets/index-CDoz7a2b.css   64.56 kB │ gzip:  11.81 kB
dist/assets/index-DrVzN_zL.js   960.20 kB │ gzip: 271.98 kB

(!) Some chunks are larger than 500 kB after minification. Consider:
- Using dynamic import() to code-split the application
- Use build.rollupOptions.output.manualChunks to improve chunking: https://rollupjs.org/configuration-options/#output-manualchunks
- Adjust chunk size limit for this warning via build.chunkSizeWarningLimit.
✓ built in 5.00s
Exit code: 0

### 2.2 Console errors in source
src/pages/AccountPage.jsx:27:     } catch (err) {
src/pages/AccountPage.jsx:28:       console.error('Account fetch error:', err);
src/pages/AccountPage.jsx:77:   } catch (error) {
src/pages/AccountPage.jsx:102:   } catch (error) {
src/pages/AccountPage.jsx:146: } catch (error) {
src/pages/AccountPage.jsx:648: } catch (err) {
src/pages/verify/VerifyTrack.jsx:23:      } catch (err) {
src/pages/verify/VerifyPortal.jsx:35:    } catch (err) {
src/pages/verify/VerifyAuthorize.jsx:21:      } catch (err) {
src/pages/verify/VerifyAuthorize.jsx:41:    } catch (err) {
src/pages/DashboardPage.jsx:48:     console.error("Failed to dismiss alert:", e);
src/pages/DashboardPage.jsx:76:     } catch (err) {
src/pages/DashboardPage.jsx:77:       console.error('Dashboard fetch error:', err);
src/pages/DashboardPage.jsx:90:     if (!newId) throw new Error('No report ID returned');
src/pages/DashboardPage.jsx:114:   } catch (err) {
src/pages/DashboardPage.jsx:407:     throw new Error('No download URL returned');
src/pages/DashboardPage.jsx:410:   console.error('PDF download error:', e);
src/pages/SettingsPage.jsx:151:   } catch (error) {
src/pages/SettingsPage.jsx:152:     console.error("Failed to load API keys", error);
src/pages/SettingsPage.jsx:182: } catch (error) {
src/pages/SettingsPage.jsx:198:   } catch (error) {
src/pages/SettingsPage.jsx:210:   } catch (error) {
src/pages/SettingsPage.jsx:247:    } catch (error) {
src/pages/Login.jsx:77:    } catch (err) {
src/pages/Pricing.jsx:85: if (!res.ok) throw new Error('Failed to create checkout session');
src/pages/Pricing.jsx:88: } catch (err) {
src/pages/Pricing.jsx:89: console.error(err);
src/pages/Pricing.jsx:90: console.error('Error initiating checkout. Please try again.');
src/pages/PublicReport.jsx:18:      .catch(err => {
src/pages/ReportDetail.jsx:153: } catch (err) {

### 2.3 API base URL configured
src/components/ReportDetailModal.jsx:332:  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://solvai-api-879357866699.europe-west1.run.app';
src/components/ReportDetailModal.jsx:437:        `${API_BASE_URL}/solvency-reports/${report.id}/pdf`,
src/components/IntelligenceTerminal.jsx:31: const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'https://solvai-api-879357866699.europe-west1.run.app';
src/api/client.js:5:  baseURL: import.meta.env.VITE_API_BASE_URL || 'https://solvai-api-879357866699.europe-west1.run.app',
src/pages/Pricing.jsx:78: const baseUrl = import.meta.env.VITE_API_BASE_URL || 'https://solvai-api-879357866699.europe-west1.run.app';
src/pages/PublicReport.jsx:7:const API_BASE = import.meta.env.VITE_API_URL || 'https://solvai-api-879357866699.europe-west1.run.app';
src/pages/PublicReport.jsx:16:    axios.get(`${API_BASE}/public/report/${token}`)
src/pages/ReportDetail.jsx:281: const baseUrl = import.meta.env.VITE_API_BASE_URL || 'https://solvai-api-879357866699.europe-west1.run.app';

### 2.4 Auth token key used
src/api/client.js:15:    const token = localStorage.getItem('solvai_token');
src/api/client.js:16:    if (token) {
src/api/client.js:17:      config.headers['Authorization'] = `Bearer ${token}`;
src/api/client.js:29:      localStorage.removeItem('solvai_token');
src/api/client.js:30:      localStorage.removeItem('solvai_user');
src/api/client.js:51:   * Login — returns { access_token, refresh_token, token_type }
src/api/client.js:66:   * POST /auth/refresh-token
src/api/client.js:68:  refreshToken: (refreshToken) =>
src/api/client.js:69:    apiClient.post('/auth/refresh-token', { refresh_token: refreshToken }),
src/api/client.js:112:  confirmUpload: (uploadToken) =>
src/api/client.js:113:    apiClient.post('/data-sources/upload/confirm', { upload_token: uploadToken }),
src/pages/Login.jsx:66:      const token = data.access_token;
src/pages/Login.jsx:67:      localStorage.setItem('solvai_token', token);
src/pages/Login.jsx:70:        const payload = JSON.parse(atob(token.split('.')[1]));
src/pages/Login.jsx:71:        localStorage.setItem('solvai_user', JSON.stringify(payload));
src/components/Sidebar.jsx:68: const raw = localStorage.getItem('solvai_user');
src/components/Sidebar.jsx:72: const token = localStorage.getItem('solvai_token');
src/components/Sidebar.jsx:73: if (!token) return null;
src/components/Sidebar.jsx:74: const payload = JSON.parse(atob(token.split('.')[1]));
src/components/Sidebar.jsx:104:      // Keep localStorage in sync with real profile so fallbacks are fresh
src/components/Sidebar.jsx:106:        localStorage.setItem('solvai_user', JSON.stringify(res.data));
src/components/Sidebar.jsx:111:      localStorage.removeItem('solvai_token');
src/components/Sidebar.jsx:112:      localStorage.removeItem('solvai_user');
src/components/Sidebar.jsx:123: localStorage.removeItem('solvai_token');
src/components/Sidebar.jsx:124: localStorage.removeItem('solvai_user');

### 2.5 Login page - what happens on submit
53:  const handleSubmit = async (e) => {
117:          <form className="flex flex-col gap-4" onSubmit={handleSubmit} noValidate>

### 2.6 Duplicate page files
AccountPage.jsx
ApiDocs.jsx
CheckoutSuccess.jsx
DashboardPage.jsx
DataSourcesPage.jsx
DemoComparisonPage.jsx
LandingPage.jsx
Login.jsx
Pricing.jsx
Privacy.jsx
PublicReport.jsx
Register.jsx
ReportDetail.jsx
ReportsPage.jsx
SettingsPage.jsx
Terms.jsx
verify

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## 3. BACKEND CODE HEALTH
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
### 3.1 Backend imports OK
/Users/alumnoad/SolvAI/SolvAI/backend/.venv/lib/python3.11/site-packages/requests/__init__.py:109: RequestsDependencyWarning: urllib3 (2.7.0) or chardet (7.4.3)/charset_normalizer (3.4.7) doesn't match a supported version!
  warnings.warn(
Traceback (most recent call last):
  File "<string>", line 1, in <module>
  File "/Users/alumnoad/SolvAI/SolvAI/backend/app/main.py", line 11, in <module>
    from app.api import auth, data_sources, lender_matching, organizations, solvency_reports, users, webhooks, ws_terminal, billing, admin, public_reports, alerts, api_keys, public_api, simulate, reports, verify
  File "/Users/alumnoad/SolvAI/SolvAI/backend/app/api/reports.py", line 8, in <module>
    from weasyprint import HTML
  File "/Users/alumnoad/SolvAI/SolvAI/backend/.venv/lib/python3.11/site-packages/weasyprint/__init__.py", line 371, in <module>
    from .css import preprocess_stylesheet  # noqa: I001, E402
    ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "/Users/alumnoad/SolvAI/SolvAI/backend/.venv/lib/python3.11/site-packages/weasyprint/css/__init__.py", line 29, in <module>
    from ..text.fonts import FontConfiguration
  File "/Users/alumnoad/SolvAI/SolvAI/backend/.venv/lib/python3.11/site-packages/weasyprint/text/fonts.py", line 17, in <module>
    from .constants import (  # isort:skip
  File "/Users/alumnoad/SolvAI/SolvAI/backend/.venv/lib/python3.11/site-packages/weasyprint/text/constants.py", line 5, in <module>
    from .ffi import pango
  File "/Users/alumnoad/SolvAI/SolvAI/backend/.venv/lib/python3.11/site-packages/weasyprint/text/ffi.py", line 476, in <module>
    gobject = _dlopen(
              ^^^^^^^^
  File "/Users/alumnoad/SolvAI/SolvAI/backend/.venv/lib/python3.11/site-packages/weasyprint/text/ffi.py", line 464, in _dlopen
    return ffi.dlopen(names[0], flags)  # pragma: no cover
           ^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "/Users/alumnoad/SolvAI/SolvAI/backend/.venv/lib/python3.11/site-packages/cffi/api.py", line 150, in dlopen
    lib, function_cache = _make_ffi_library(self, name, flags)
                          ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "/Users/alumnoad/SolvAI/SolvAI/backend/.venv/lib/python3.11/site-packages/cffi/api.py", line 834, in _make_ffi_library
    backendlib = _load_backend_lib(backend, libname, flags)
                 ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "/Users/alumnoad/SolvAI/SolvAI/backend/.venv/lib/python3.11/site-packages/cffi/api.py", line 829, in _load_backend_lib
    raise OSError(msg)
OSError: cannot load library 'libgobject-2.0-0': dlopen(libgobject-2.0-0, 0x0002): tried: 'libgobject-2.0-0' (no such file), '/System/Volumes/Preboot/Cryptexes/OSlibgobject-2.0-0' (no such file), '/usr/lib/libgobject-2.0-0' (no such file, not in dyld cache), 'libgobject-2.0-0' (no such file).  Additionally, ctypes.util.find_library() did not manage to locate a library called 'libgobject-2.0-0'

-----

WeasyPrint could not import some external libraries. Please carefully follow the installation steps before reporting an issue:
https://doc.courtbouillon.org/weasyprint/stable/first_steps.html#installation
https://doc.courtbouillon.org/weasyprint/stable/first_steps.html#troubleshooting 

-----


### 3.2 All registered routes
/Users/alumnoad/SolvAI/SolvAI/backend/.venv/lib/python3.11/site-packages/requests/__init__.py:109: RequestsDependencyWarning: urllib3 (2.7.0) or chardet (7.4.3)/charset_normalizer (3.4.7) doesn't match a supported version!
  warnings.warn(
Traceback (most recent call last):
  File "<string>", line 2, in <module>
  File "/Users/alumnoad/SolvAI/SolvAI/backend/app/main.py", line 11, in <module>
    from app.api import auth, data_sources, lender_matching, organizations, solvency_reports, users, webhooks, ws_terminal, billing, admin, public_reports, alerts, api_keys, public_api, simulate, reports, verify
  File "/Users/alumnoad/SolvAI/SolvAI/backend/app/api/reports.py", line 8, in <module>
    from weasyprint import HTML
  File "/Users/alumnoad/SolvAI/SolvAI/backend/.venv/lib/python3.11/site-packages/weasyprint/__init__.py", line 371, in <module>
    from .css import preprocess_stylesheet  # noqa: I001, E402
    ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "/Users/alumnoad/SolvAI/SolvAI/backend/.venv/lib/python3.11/site-packages/weasyprint/css/__init__.py", line 29, in <module>
    from ..text.fonts import FontConfiguration
  File "/Users/alumnoad/SolvAI/SolvAI/backend/.venv/lib/python3.11/site-packages/weasyprint/text/fonts.py", line 17, in <module>
    from .constants import (  # isort:skip
  File "/Users/alumnoad/SolvAI/SolvAI/backend/.venv/lib/python3.11/site-packages/weasyprint/text/constants.py", line 5, in <module>
    from .ffi import pango
  File "/Users/alumnoad/SolvAI/SolvAI/backend/.venv/lib/python3.11/site-packages/weasyprint/text/ffi.py", line 476, in <module>
    gobject = _dlopen(
              ^^^^^^^^
  File "/Users/alumnoad/SolvAI/SolvAI/backend/.venv/lib/python3.11/site-packages/weasyprint/text/ffi.py", line 464, in _dlopen
    return ffi.dlopen(names[0], flags)  # pragma: no cover
           ^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "/Users/alumnoad/SolvAI/SolvAI/backend/.venv/lib/python3.11/site-packages/cffi/api.py", line 150, in dlopen
    lib, function_cache = _make_ffi_library(self, name, flags)
                          ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "/Users/alumnoad/SolvAI/SolvAI/backend/.venv/lib/python3.11/site-packages/cffi/api.py", line 834, in _make_ffi_library
    backendlib = _load_backend_lib(backend, libname, flags)
                 ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "/Users/alumnoad/SolvAI/SolvAI/backend/.venv/lib/python3.11/site-packages/cffi/api.py", line 829, in _load_backend_lib
    raise OSError(msg)
OSError: cannot load library 'libgobject-2.0-0': dlopen(libgobject-2.0-0, 0x0002): tried: 'libgobject-2.0-0' (no such file), '/System/Volumes/Preboot/Cryptexes/OSlibgobject-2.0-0' (no such file), '/usr/lib/libgobject-2.0-0' (no such file, not in dyld cache), 'libgobject-2.0-0' (no such file).  Additionally, ctypes.util.find_library() did not manage to locate a library called 'libgobject-2.0-0'

-----

WeasyPrint could not import some external libraries. Please carefully follow the installation steps before reporting an issue:
https://doc.courtbouillon.org/weasyprint/stable/first_steps.html#installation
https://doc.courtbouillon.org/weasyprint/stable/first_steps.html#troubleshooting 

-----


### 3.3 Auth endpoint - login function
35:            password=body.password,
86:async def login(
93:        password=body.password,
98:            detail="Invalid email or password",
153:    "/change-password",
155:    summary="Change user password",
157:async def change_password(
163:        await auth_service.change_password(
166:            current_password=body.current_password,
167:            new_password=body.new_password,
183:    "/admin/reset-demo-password",
184:    summary="Temporary endpoint to reset demo password",
186:async def reset_demo_password(db: AsyncSession = Depends(get_db)):
188:    from app.core.security import get_password_hash
195:    user.hashed_password = get_password_hash("Demo2026!")

### 3.4 Check for syntax errors in key files
OK: app/main.py
OK: app/api/auth.py
OK: app/api/solvency_reports.py
OK: app/api/billing.py
OK: app/api/data_sources.py
OK: app/tasks/report_generation.py
OK: app/services/pdf_service.py

### 3.5 PDF generation code
app/api/solvency_reports.py:147:# ── PDF endpoint MUST come BEFORE the /{id} catch-all ──────────────────────
app/api/solvency_reports.py:150:    summary="Download a solvency report as PDF",
app/api/solvency_reports.py:152:async def download_solvency_report_pdf(
app/api/solvency_reports.py:185:    # PDF download is gated. Access is granted if EITHER:
app/api/solvency_reports.py:203:                "message": "Upgrade to Pro or pay 9€ to unlock this PDF",
app/api/solvency_reports.py:209:    from app.services.pdf_service import generate_solvency_pdf
app/api/solvency_reports.py:213:        pdf_buffer = generate_solvency_pdf(report)
app/api/solvency_reports.py:216:        logger.error(f"Failed to generate PDF on the fly: {e}")
app/api/solvency_reports.py:219:            detail="Failed to generate PDF.",
app/services/pdf_service.py:11:from weasyprint import HTML
app/services/pdf_service.py:24:def generate_solvency_pdf(report: SolvencyReport) -> io.BytesIO:
app/services/pdf_service.py:26:    Generate a professional PDF using WeasyPrint and an HTML template.
app/services/pdf_service.py:393:    # 6. RENDER & GENERATE PDF
app/services/pdf_service.py:400:        # empty strings, making template bugs immediately visible in the PDF output.

### 3.6 PDF endpoint exact code

### 3.7 Environment variables present
✅ DATABASE_URL: True
❌ SECRET_KEY: False
✅ GEMINI_API_KEY: True
✅ STRIPE_SECRET_KEY: True
✅ STRIPE_WEBHOOK_SECRET: True
✅ FRONTEND_URL: https://solvai-frontend-879357866699.europe-west1.run.app
❌ GCS_BUCKET: False
❌ RESEND_API_KEY: False

### 3.8 Alembic migration status
INFO  [alembic.runtime.migration] Context impl PostgresqlImpl.
INFO  [alembic.runtime.migration] Will assume transactional DDL.
21996ee8541d (head)
Rev: 062b3083626a
Parent: 001
Path: /Users/alumnoad/SolvAI/SolvAI/backend/alembic/versions/062b3083626a_add_pgvector_and_lender_manifests.py

    Add pgvector and lender_manifests
    
    Revision ID: 062b3083626a
    Revises: 001
    Create Date: 2026-06-24 16:41:53.401018

Rev: 001
Parent: <base>
Path: /Users/alumnoad/SolvAI/SolvAI/backend/alembic/versions/001_initial_schema.py

    Initial schema: organizations, users, financial_data_sources, solvency_reports
    
    Revision ID: 001
    Revises:
    Create Date: 2026-06-13 00:00:00.000000


### 3.9 Database tables
Tables: ['alembic_version', 'alerts', 'api_keys', 'financial_data_sources', 'lender_manifests', 'organizations', 'promo_codes', 'solvency_reports', 'users', 'verification_requests']
solvency_reports columns:
  id: uuid
  user_id: uuid
  organization_id: uuid
  status: text
  report_data: jsonb
  generated_at: timestamp with time zone
  created_at: timestamp with time zone
  updated_at: timestamp with time zone
  is_deleted: boolean
  deleted_at: timestamp with time zone
  overall_score: integer
  rating: text
  generated_month: text
  share_token: text
  share_enabled: boolean
  share_expires_at: timestamp with time zone
  report_type: character varying
  document_uri: text
  pdf_unlocked: boolean
  pdf_unlocked_at: timestamp with time zone
  stripe_payment_intent_id: character varying

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## 4. LAST GIT CHANGES (what broke things)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
### 4.1 Recent commits
29472a7 fixes
53fffb7 fixes 3
63a04d9 fix: add @types/react + csstype peer deps to lockfile; fix PDF button, markdown render, revenue avg, currency symbol
6f6ec21 fix: sync package-lock.json after adding react-markdown
4a6fda4 fixes 2
2e3bdcb auth & interface fixes
06c5651 interface updagrades & data sources enhancements
62e8deb fixes
6a87230 landing page, user types & auth impl
ff42dd9 Update SOLVAI_COMPREHENSIVE_REPORT.md

### 4.2 Files changed in last 3 commits
backend/app/api/data_sources.py
backend/app/api/solvency_reports.py
backend/app/api/webhooks.py
backend/app/core/config.py
backend/app/services/csv_service.py
backend/app/services/paypal_service.py
backend/app/services/xero_service.py
backend/app/tasks/report_generation.py
backend/e2e_report.json
backend/e2e_report.pdf
backend/requirements.txt
backend/test_db.py
backend/test_freemium.py
backend/test_stripe.py
frontend/package-lock.json
frontend/package.json
frontend/src/api/client.js
frontend/src/components/ReportDetailModal.jsx
frontend/src/pages/DataSourcesPage.jsx
frontend/src/pages/ReportsPage.jsx
trigger_pro_report.py
trigger_pro_report2.py

### 4.3 Changes to auth files
diff --git a/frontend/src/api/client.js b/frontend/src/api/client.js
index 6589a76..807117e 100644
--- a/frontend/src/api/client.js
+++ b/frontend/src/api/client.js
@@ -112,9 +112,9 @@ export const dataSources = {
   confirmUpload: (uploadToken) =>
     apiClient.post('/data-sources/upload/confirm', { upload_token: uploadToken }),
     
-  authXero: () => apiClient.get('/data-sources/xero/auth'),
+  getXeroAuthUrl: () => apiClient.get('/data-sources/xero/connect'),
   
-  connectPayPal: () => apiClient.post('/data-sources/connect/paypal'),
+  getPayPalAuthUrl: () => apiClient.get('/data-sources/paypal/connect'),
 
   getBelvoInstitutions: () => apiClient.get('/data-sources/belvo/institutions'),
   connectBelvo: (data) => apiClient.post('/data-sources/connect/belvo', data),
@@ -152,6 +152,12 @@ export const solvencyReports = {
    */
   list: () => apiClient.get('/solvency-reports/'),
 
+  /**
+   * Soft-delete a report.
+   * DELETE /solvency-reports/{id}
+   */
+  delete: (id) => apiClient.delete(`/solvency-reports/${id}`),
+
   /**
    * Get raw transactions for demo.
    * GET /solvency-reports/demo-transactions

### 4.4 Changes to PDF files
diff --git a/backend/app/api/solvency_reports.py b/backend/app/api/solvency_reports.py
index a09ada0..00887c2 100644
--- a/backend/app/api/solvency_reports.py
+++ b/backend/app/api/solvency_reports.py
@@ -306,6 +306,41 @@ async def get_score_history(
     return history
 
 
+@router.delete(
+    "/{id}",
+    status_code=status.HTTP_204_NO_CONTENT,
+    summary="Soft-delete a solvency report",
+)
+async def delete_solvency_report(
+    id: uuid.UUID,
+    current_user: User = Depends(get_current_user),
+    db: AsyncSession = Depends(get_db),
+):
+    result = await db.execute(
+        select(SolvencyReport).where(
+            SolvencyReport.id == id,
+            SolvencyReport.is_deleted.is_(False),
+        )
+    )
+    report = result.scalar_one_or_none()
+
+    if report is None:
+        raise HTTPException(
+            status_code=status.HTTP_404_NOT_FOUND,
+            detail="Solvency report not found",
+        )
+    if report.user_id != current_user.id:
+        raise HTTPException(
+            status_code=status.HTTP_403_FORBIDDEN,
+            detail="You do not have access to this report",
+        )
+
+    report.is_deleted = True
+    report.deleted_at = datetime.now(timezone.utc)
+    await db.flush()
+    await db.commit()
+
+
 @router.get(
     "/{id}",
     response_model=SolvencyReportResponse,
diff --git a/backend/app/tasks/report_generation.py b/backend/app/tasks/report_generation.py
index 7a4b90a..b543a6e 100644
--- a/backend/app/tasks/report_generation.py
+++ b/backend/app/tasks/report_generation.py
@@ -350,12 +350,8 @@ def _build_financial_summary(sources) -> dict:
         f"source_ids={[str(s.id) for s in sources]}"
     )
 
-    # Per-source-type revenue contributions
-    avg_monthly_map = {
-        "XERO": 5_800,
-        "PAYPAL": 3_400,
-        "MANUAL_UPLOAD": 4_000,
-    }
+    # Per-source-type revenue contributions (populated from real data only)
+    avg_monthly_map = {}
 
     platform_breakdown = {}
     

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## 5. PRODUCTION DATABASE STATE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
### 5.1 Connect to production DB and check users
ERROR: (gcloud.sql.connect) Cloud SQL Proxy (v2) couldn't be found in PATH. Either install the component with `gcloud components install cloud-sql-proxy` or see https://github.com/GoogleCloudPlatform/cloud-sql-proxy/

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## 6. CURRENT FILE STRUCTURE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
### 6.1 Frontend pages
frontend/src/pages/AccountPage.jsx
frontend/src/pages/ApiDocs.jsx
frontend/src/pages/CheckoutSuccess.jsx
frontend/src/pages/DashboardPage.jsx
frontend/src/pages/DataSourcesPage.jsx
frontend/src/pages/DemoComparisonPage.jsx
frontend/src/pages/LandingPage.jsx
frontend/src/pages/Login.jsx
frontend/src/pages/Pricing.jsx
frontend/src/pages/Privacy.jsx
frontend/src/pages/PublicReport.jsx
frontend/src/pages/Register.jsx
frontend/src/pages/ReportDetail.jsx
frontend/src/pages/ReportsPage.jsx
frontend/src/pages/SettingsPage.jsx
frontend/src/pages/Terms.jsx
frontend/src/pages/verify/VerifyAuthorize.jsx
frontend/src/pages/verify/VerifyPortal.jsx
frontend/src/pages/verify/VerifyTrack.jsx

### 6.2 Backend API files
backend/app/api/__init__.py
backend/app/api/admin.py
backend/app/api/alerts.py
backend/app/api/api_keys.py
backend/app/api/auth.py
backend/app/api/billing.py
backend/app/api/data_sources.py
backend/app/api/lender_matching.py
backend/app/api/organizations.py
backend/app/api/public_api.py
backend/app/api/public_reports.py
backend/app/api/reports.py
backend/app/api/simulate.py
backend/app/api/solvency_reports.py
backend/app/api/users.py
backend/app/api/verify.py
backend/app/api/webhooks.py
backend/app/api/ws_terminal.py

### 6.3 Backend services
backend/app/services/__init__.py
backend/app/services/agent_orchestrator.py
backend/app/services/alert_service.py
backend/app/services/auth_service.py
backend/app/services/belvo_service.py
backend/app/services/csv_service.py
backend/app/services/email_service.py
backend/app/services/gemini_service.py
backend/app/services/invoice_upload_service.py
backend/app/services/lender_service.py
backend/app/services/paypal_service.py
backend/app/services/pdf_service.py
backend/app/services/quant_service.py
backend/app/services/storage_service.py
backend/app/services/stripe_service.py
backend/app/services/xero_service.py

### 6.4 Backend tasks
backend/app/tasks/__init__.py
backend/app/tasks/report_generation.py

### 6.5 Dockerfile content (backend)
# ── Stage 1: builder ──────────────────────────────────────────────────────────
FROM python:3.11-slim AS builder

WORKDIR /app

# Install build dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    libffi-dev \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --upgrade pip \
    && pip install --no-cache-dir --prefix=/install -r requirements.txt

# ── Stage 2: runtime ──────────────────────────────────────────────────────────
FROM python:3.11-slim AS runtime

WORKDIR /app

# Install runtime system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq5 \
    fontconfig \
    libpango-1.0-0 \
    libpangoft2-1.0-0 \
    libpangocairo-1.0-0 \
    libcairo2 \
    libgdk-pixbuf-2.0-0 \
    libglib2.0-0 \
    libffi-dev \
    shared-mime-info \
    && rm -rf /var/lib/apt/lists/*

# Copy installed packages from builder
COPY --from=builder /install /usr/local

# Copy application code
COPY app/ ./app/

### 6.6 cloudbuild.yaml summary
5:  entrypoint: 'npm'
11:  entrypoint: 'npm'
15:- name: 'gcr.io/cloud-builders/docker'
16:  args: ['build', '-t', 'europe-west1-docker.pkg.dev/$PROJECT_ID/solvai/solvai-api:latest', './backend']
19:- name: 'gcr.io/cloud-builders/docker'
20:  args: ['push', 'europe-west1-docker.pkg.dev/$PROJECT_ID/solvai/solvai-api:latest']
24:  entrypoint: gcloud
30:    - 'europe-west1-docker.pkg.dev/$PROJECT_ID/solvai/solvai-api:latest'
33:    - '--memory'
42:    - '--memory'
49:  entrypoint: gcloud
56:    - 'europe-west1-docker.pkg.dev/$PROJECT_ID/solvai/solvai-api:latest'
62:    - '--command=alembic'
66:  entrypoint: gcloud
78:  entrypoint: gcloud
84:    - 'europe-west1-docker.pkg.dev/$PROJECT_ID/solvai/solvai-api:latest'
98:    - '--memory'
109:      API_URL=$$(gcloud run services describe solvai-api --region=europe-west1 --format="value(status.url)")
114:- name: 'gcr.io/cloud-builders/docker'
120:      docker build --build-arg VITE_API_BASE_URL=$$API_URL -t europe-west1-docker.pkg.dev/$PROJECT_ID/solvai/solvai-frontend:latest ./frontend
123:- name: 'gcr.io/cloud-builders/docker'
124:  args: ['push', 'europe-west1-docker.pkg.dev/$PROJECT_ID/solvai/solvai-frontend:latest']
128:  entrypoint: gcloud
134:    - 'europe-west1-docker.pkg.dev/$PROJECT_ID/solvai/solvai-frontend:latest'
146:      FRONTEND_URL=$$(gcloud run services describe solvai-frontend --region=europe-west1 --format="value(status.url)")
147:      gcloud run services update solvai-api --region=europe-west1 --update-env-vars="^@^CORS_ORIGINS=[\"$$FRONTEND_URL\", \"https://solvai-frontend-879357866699.europe-west1.run.app\", \"http://localhost:5173\"]"
150:  - 'europe-west1-docker.pkg.dev/$PROJECT_ID/solvai/solvai-api:latest'
151:  - 'europe-west1-docker.pkg.dev/$PROJECT_ID/solvai/solvai-frontend:latest'
