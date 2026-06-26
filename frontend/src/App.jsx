import React from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';

import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import Dashboard from './pages/Dashboard.jsx';
import ReportDetail from './pages/ReportDetail.jsx';
import DataSources from './pages/DataSources.jsx';
import DemoComparison from './pages/DemoComparison.jsx';
import Reports from './pages/Reports.jsx';
import Pricing from './pages/Pricing.jsx';
import Account from './pages/Account.jsx';
import Settings from './pages/Settings.jsx';
import CheckoutSuccess from './pages/CheckoutSuccess.jsx';

// ─── Protected Route Wrapper ──────────────────────────────────────────────────
function ProtectedRoute({ children }) {
  const token = localStorage.getItem('solvai_token');
  const location = useLocation();

  if (!token) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
}

// ─── App ──────────────────────────────────────────────────────────────────────
export default function App() {
  React.useEffect(() => {
    const savedTheme = localStorage.getItem('solvai_theme');
    if (savedTheme) {
      document.documentElement.setAttribute('data-theme', savedTheme);
    }
  }, []);

  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/pricing" element={<Pricing />} />
      <Route path="/checkout/success" element={<CheckoutSuccess />} />

      {/* Protected routes */}
      <Route
        path="/account"
        element={
          <ProtectedRoute>
            <Account />
          </ProtectedRoute>
        }
      />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/reports"
        element={
          <ProtectedRoute>
            <Reports />
          </ProtectedRoute>
        }
      />
      <Route
        path="/reports/:id"
        element={
          <ProtectedRoute>
            <ReportDetail />
          </ProtectedRoute>
        }
      />
      <Route
        path="/data-sources"
        element={
          <ProtectedRoute>
            <DataSources />
          </ProtectedRoute>
        }
      />
      <Route
        path="/demo"
        element={
          <ProtectedRoute>
            <DemoComparison />
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings"
        element={
          <ProtectedRoute>
            <Settings />
          </ProtectedRoute>
        }
      />

      {/* Catch-all → redirect to dashboard */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
