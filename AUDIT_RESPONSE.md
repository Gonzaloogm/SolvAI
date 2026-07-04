# SolvAI Read-Only Audit Report

## Audit Summary & Exact Terminal Output

---

### 1. Sidebar bottom section
**Command executed:**
```bash
cat frontend/src/components/Sidebar.jsx | \
  grep -n -E "EN|demo@|cycleLanguage|LANGUAGES|userProfile|currentUser|email|plan|logout|Logout" | head -40
```
**Exact Output:**
```text
57:const IconLogout = () => (
99:  const [userProfile, setUserProfile] = useState(null);
112: const handleLogout = () => {
118:  const userEmail = userProfile?.email ?? userInfo?.email ?? userInfo?.sub ?? 'Account';
119:  const userPlan = userProfile?.organization?.plan ?? 'free';
167: {/* ── Bottom: user + logout ── */}
172: <span className="sidebar__user-email" title={userEmail}>
177:     {userPlan} plan
192:   className="sidebar__logout"
193:   onClick={handleLogout}
194:   title={t('nav.logout')}
195:   aria-label={t('nav.logout')}
197:   <IconLogout />
349: .sidebar__user-email {
357: .sidebar__logout {
371: .sidebar__logout:hover {
```

---

### 2. How user data reaches the sidebar
**Command executed:**
```bash
grep -rn -E "AuthContext|useAuth|UserContext|currentUser|userProfile|user\.email|user\.plan" \
  frontend/src/ --include="*.jsx" --include="*.js" | grep -v "node_modules" | head -30
```
**Exact Output:**
```text
frontend/src/components/Sidebar.jsx:99:  const [userProfile, setUserProfile] = useState(null);
frontend/src/components/Sidebar.jsx:118:  const userEmail = userProfile?.email ?? userInfo?.email ?? userInfo?.sub ?? 'Account';
frontend/src/components/Sidebar.jsx:119:  const userPlan = userProfile?.organization?.plan ?? 'free';
```
**Analysis:** `Sidebar.jsx` does NOT use `AuthContext` or `useAuth`. Instead, `Sidebar` manages its own internal `userProfile` state (`useState(null)`) and fetches it directly via `apiClient.get('/users/me')` on mount (`useEffect`). `userInfo` is fallback-read from `getUser()` (stored in `localStorage` under `solvai_auth_user`).

---

### 3. Delete account - frontend handler
**Command executed:**
```bash
grep -n -E "deleteAccount|delete.*account|DELETE.*account|handleDelete" \
  frontend/src/pages/AccountPage.jsx | head -20
```
**Exact Output:**
```text
521: <p className={`text-sm font-medium ${textPrimary}`}>{t('settings.deleteAccount')}</p>
523: {t('settings.deleteAccountDesc')}
532: {t('settings.deleteAccount')}
```
**Analysis & Line Code (Lines 647–654 in `AccountPage.jsx`):**
The frontend Delete Account modal in `AccountPage.jsx` currently only shows a toast message locally and resets local state when submitted:
```jsx
<form onSubmit={(e) => {
  e.preventDefault();
  if (deleteConfirm === 'DELETE') {
    setShowDeleteModal(false);
    addToast("Account deleted", "success");
    setDeleteConfirm('');
  }
}}>
```
It does **NOT** call `apiClient.deleteAccount()` or send any API request to the backend.

---

### 4. Delete account - API client
**Command executed:**
```bash
grep -n -E "deleteAccount|delete.*me|DELETE" frontend/src/api/client.js | head -20
```
**Exact Output:**
```text
82:  deleteAccount: () => apiClient.delete('/users/me'),
```
**Analysis:** The API client method `deleteAccount` exists on line 82 of `frontend/src/api/client.js` and targets `DELETE /users/me`.

---

### 5. Delete account - backend endpoint
**Command executed:**
```bash
grep -rn -E "delete.*user|delete.*account|DELETE.*me|/users/me" \
  backend/app/api/ --include="*.py" | head -20
```
**Exact Output:**
*(No direct match for regex pattern `/users/me` or `DELETE.*me` because of route decorator split)*

**Detailed Endpoint Findings (`backend/app/api/users.py:56–66`):**
```python
56:@router.delete(
57:    "/me",
58:    summary="Delete the currently authenticated user",
59:)
60:async def delete_me(
61:    current_user: User = Depends(get_current_user),
62:    db: AsyncSession = Depends(get_db),
63:) -> dict:
64:    current_user.is_deleted = True
65:    await db.flush()
66:    return {"status": "deleted"}
```
Mounted in `backend/app/main.py` with prefix `/users`, making the full endpoint URL `DELETE /users/me`.

---

### 6. Promo codes - backend endpoint exists?
**Command executed:**
```bash
grep -rn -E "validate.promo|validate_promo|promo_code|promo_codes" \
  backend/app/api/ --include="*.py" | head -20
```
**Exact Output:**
```text
backend/app/api/auth.py:13:from app.schemas.promo_code import PromoValidateRequest, PromoValidateResponse
backend/app/api/auth.py:38:            promo_code=body.promo_code,
backend/app/api/auth.py:54:    "/validate-promo",
backend/app/api/auth.py:58:async def validate_promo(
backend/app/api/auth.py:62:    from app.models.promo_code import PromoCode
backend/app/api/billing.py:195:    from app.models.promo_code import PromoCode
backend/app/api/admin.py:11:from app.schemas.promo_code import PromoCodeCreate, PromoCodeResponse
backend/app/api/admin.py:14:from app.models.promo_code import PromoCode
```

---

### 7. Promo codes - in main.py router?
**Command executed:**
```bash
grep -n -E "promo|validate" backend/app/main.py | head -10
```
**Exact Output:**
*(No output matches "promo" or "validate" in `main.py` directly)*

**Analysis:** `main.py` registers the routers containing promo endpoints via:
```python
app.include_router(auth.router, prefix="/auth", tags=["Auth"])
app.include_router(admin.router, prefix="/admin", tags=["Admin"])
app.include_router(billing.router, prefix="/billing", tags=["Billing"])
```
The endpoint POST `/auth/validate-promo` is defined in `auth.py` and mounted under `/auth`.

---

### 8. Promo codes - register accepts them?
**Command executed:**
```bash
grep -n -E "promo_code|RegisterRequest|class Register" backend/app/api/auth.py | head -20
```
**Exact Output:**
```text
12:from app.schemas.auth import LoginRequest, RefreshRequest, RegisterRequest, TokenResponse, ChangePasswordRequest
13:from app.schemas.promo_code import PromoValidateRequest, PromoValidateResponse
27:    body: RegisterRequest,
38:            promo_code=body.promo_code,
62:    from app.models.promo_code import PromoCode
```
**Analysis:** In `backend/app/api/auth.py` line 38, `register` passes `promo_code=body.promo_code` to `auth_service.register_user(...)`. `RegisterRequest` in `backend/app/schemas/auth.py` includes `promo_code: Optional[str] = None`.

---

### 9. Stripe checkout - can we add promo codes?
**Command executed:**
```bash
grep -n -E "checkout|promotion_code|allow_promotion" backend/app/api/billing.py | head -20
```
**Exact Output:**
```text
29:@router.post('/create-checkout-session')
30:async def create_checkout_session(
40:        session = stripe.checkout.Session.create(
49:                f"?checkout=success&plan={body.plan}"
53:                f"?checkout=cancelled"
61:            allow_promotion_codes=True,
63:        return {'checkout_url': session.url, 'session_id': session.id}
121:    if event['type'] == 'checkout.session.completed':
141:                logger.error(f"Database error during checkout.session.completed: {db_err}")
```
**Analysis:** Line 61 in `backend/app/api/billing.py` explicitly sets `allow_promotion_codes=True` when creating Stripe checkout sessions.

---

### 10. Production DB `promo_codes` table contents
**Command executed:**
```bash
gcloud sql instances list --project=solvai-prod --format="value(name)" | head -1
```
**Instance Name:** `solvai-db`

**Exact SQL Query Results (`SELECT code, plan, max_uses, uses_count, is_active FROM promo_codes;`):**

| code | plan | max_uses | uses_count | is_active |
| :--- | :--- | :--- | :--- | :--- |
| **SOLVAI-FOUNDER** | `pro` | 100 | 0 | `true` (`t`) |
| **HACKATHON2026** | `pro` | 50 | 0 | `true` (`t`) |
| **BETA-ACCESS** | `pro` | 25 | 0 | `true` (`t`) |
| **LANDLORD-PRO** | `pro` | 20 | 0 | `true` (`t`) |
| **GESTOR-PRO** | `pro` | 20 | 0 | `true` (`t`) |

---

### 11. Landing page - what changed?
**Command executed:**
```bash
git log --oneline -5
git diff HEAD~1 HEAD -- frontend/src/pages/LandingPage.jsx | head -60
```
**Exact Output:**
`git log --oneline -5`:
```text
06c5651 interface updagrades & data sources enhancements
62e8deb fixes
6a87230 landing page, user types & auth impl
ff42dd9 Update SOLVAI_COMPREHENSIVE_REPORT.md
46666bd mocks erradication and pdf generation enhanced
```
`git diff HEAD~1 HEAD -- frontend/src/pages/LandingPage.jsx`:
*(No output between HEAD~1 and HEAD)*

*(Note: `git diff HEAD~2 HEAD -- frontend/src/pages/LandingPage.jsx` shows quote escaping change in LandingPage.jsx line 356: `"SolvAI cut..."` -> `&quot;SolvAI cut...&quot;`)*

---

### 12. Current App.jsx routing
**Command executed:**
```bash
grep -n -E "Route|Landing|Login|Register|PrivateRoute|Navigate" frontend/src/App.jsx | head -30
```
**Exact Output:**
```text
28:import Login from './pages/Login.jsx';
29:import Register from './pages/Register.jsx';
32:import LandingPage from './pages/LandingPage.jsx';
38:import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
67:function Sidebar({ activePage, onNavigate, mobileOpen, onClose }) {
69: const navigate = useNavigate();
150: onNavigate(item.id);
207:function ProtectedRoute({ children }) {
210:    return <Navigate to="/login" replace />;
215:function PublicRoute({ children }) {
218:    return <Navigate to="/dashboard" replace />;
228:          <Routes>
229:            <Route path="/" element={<PublicRoute><LandingPage /></PublicRoute>} />
230:            <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
231:            <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />
232:            <Route path="/privacy" element={<Privacy />} />
233:            <Route path="/terms" element={<Terms />} />
234:            <Route path="/r/:token" element={<PublicReport />} />
235:            <Route path="/verify" element={<VerifyPortal />} />
236:            <Route path="/verify/authorize/:token" element={<VerifyAuthorize />} />
237:            <Route path="/verify/track/:id" element={<VerifyTrack />} />
238:            <Route path="/*" element={
239:              <ProtectedRoute>
241:              </ProtectedRoute>
243:          </Routes>
252: const navigate = useNavigate();
265: onNavigate={(id) => navigate(`/${id}`)}
286: <PageComponent key={activePage} onNavigate={(id) => navigate(`/${id}`)} />
```
