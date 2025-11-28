import { useEffect, useState, type ReactNode } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { auth } from './firebaseConfig';
import LoginPage from './pages/LoginPage';
import WorkboardPage from './pages/WorkboardPage';
import ApplicationDetailPage from './pages/ApplicationDetailPage';
import AdminPage from './pages/AdminPage';
import DashboardLayout from './layouts/DashboardLayout';

function RequireAuth({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for dev bypass
    const isDevBypass = localStorage.getItem('ampac_dev_bypass') === 'true';
    if (isDevBypass) {
      setUser({ uid: 'dev-user', email: 'dev@ampac.com' } as User);
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-surfaceHighlight text-textSecondary">Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;

  return children;
}

export default function App() {
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
          <Route path="admin" element={<AdminPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
