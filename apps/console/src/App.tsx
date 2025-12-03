import { useEffect, useState, type ReactNode } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useIsAuthenticated, useMsal } from "@azure/msal-react";
import LoginPage from './pages/LoginPage';
import WorkboardPage from './pages/WorkboardPage';
import ApplicationDetailPage from './pages/ApplicationDetailPage';
import AdminPage from './pages/AdminPage';
import VenturesDashboard from './pages/VenturesDashboard';
import BrainPage from './pages/BrainPage';
import DashboardLayout from './layouts/DashboardLayout';
import { useNotifications } from './hooks/useNotifications';

function RequireAuth({ children }: { children: ReactNode }) {
  const isAuthenticated = useIsAuthenticated();
  const { instance } = useMsal();
  const [isDevBypass, setIsDevBypass] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const bypass = localStorage.getItem('ampac_dev_bypass') === 'true';
    setIsDevBypass(bypass);
    
    // If not authenticated and not bypass, try silent SSO if possible or just finish checking
    // MSAL handles its own loading state usually, but we need to combine it with our bypass logic
    setChecking(false);
  }, [isAuthenticated]);

  if (checking) return <div className="min-h-screen flex items-center justify-center bg-surfaceHighlight text-textSecondary">Loading...</div>;

  if (!isAuthenticated && !isDevBypass) {
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
          <Route path="admin" element={<AdminPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
