import { type ReactNode } from 'react';
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
import WebsiteLeadsPage from './pages/WebsiteLeadsPage';
import PreliminaryLeadsPage from './pages/PreliminaryLeadsPage';
import MarketplaceConfigPage from './pages/MarketplaceConfigPage';
import CommunityManagementPage from './pages/CommunityManagementPage';
import BusinessDirectoryPage from './pages/BusinessDirectoryPage';
import OpsConsolePage from './pages/OpsConsolePage';
import MobileCommandPage from './pages/MobileCommandPage';
import DashboardLayout from './layouts/DashboardLayout';
import { AuthCallbackPage } from './pages/AuthCallbackPage';
import { useNotifications } from './hooks/useNotifications';

function RequireAuth({ children }: { children: ReactNode }) {
  const isAuthenticated = useIsAuthenticated();

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
          <Route path="leads" element={<WebsiteLeadsPage />} />
          <Route path="pre-leads" element={<PreliminaryLeadsPage />} />
          <Route path="marketplace" element={<MarketplaceConfigPage />} />
          <Route path="community" element={<CommunityManagementPage />} />
          <Route path="businesses" element={<BusinessDirectoryPage />} />
          <Route path="ops" element={<OpsConsolePage />} />
          <Route path="mobile-command" element={<MobileCommandPage />} />
          <Route path="admin" element={<AdminPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
