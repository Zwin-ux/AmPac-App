import { useEffect, useState, type ReactNode } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useIsAuthenticated } from "@azure/msal-react";
import LoginPage from './pages/LoginPage';
import WorkboardPage from './pages/WorkboardPage';
import ApplicationDetailPage from './pages/ApplicationDetailPage';
import AdminPage from './pages/AdminPage';
import VenturesDashboard from './pages/VenturesDashboard';
import BrainPage from './pages/BrainPage';
import PaymentsPage from './pages/PaymentsPage';
import TeamsIntegrationPage from './pages/TeamsIntegrationPage';
import DashboardLayout from './layouts/DashboardLayout';
import { AuthCallbackPage } from './pages/AuthCallbackPage';
import { useNotifications } from './hooks/useNotifications';

function RequireAuth({ children }: { children: ReactNode }) {
  const isAuthenticated = useIsAuthenticated();
  const [isDevBypass, setIsDevBypass] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    // REMOVED: Dev bypass for security
    // const bypass = localStorage.getItem('ampac_dev_bypass') === 'true';
    // setIsDevBypass(bypass);

    // MSAL handles its own loading state usually
    setChecking(false);
  }, [isAuthenticated]);

  if (checking) return <div className="min-h-screen flex items-center justify-center bg-surfaceHighlight text-textSecondary">Loading...</div>;

  // REMOVED: Dev bypass for security
  // if (!isAuthenticated && !isDevBypass) {
  //   return <Navigate to="/login" replace />;
  // }
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

export default function App() {
  useNotifications();

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/auth/callback" element={<AuthCallbackPage />} />
        <Route path="/" element={
          <RequireAuth>
            <DashboardLayout />
          </RequireAuth>
        }>
          <Route index element={<WorkboardPage />} />
          <Route path="applications/:id" element={<ApplicationDetailPage />} />
          <Route path="search" element={<div className="p-8 text-textSecondary">Search Page (Coming Soon)</div>} />
          <Route path="ventures" element={<VenturesDashboard />} />
          <Route path="brain" element={<BrainPage />} />
          <Route path="payments" element={<PaymentsPage />} />
          <Route path="teams" element={<TeamsIntegrationPage />} />
          <Route path="admin" element={<AdminPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
