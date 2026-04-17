import { useState } from 'react';
import { Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import { ProtectedRoute } from './components/ProtectedRoute';
import { DashboardLayout } from './layout/DashboardLayout';
import { DashboardPage } from './pages/DashboardPage';
import { LoginPage } from './pages/LoginPage';
import { NotFoundPage } from './pages/NotFoundPage';

export default function App() {
  const [token, setToken] = useState(() => window.localStorage.getItem('idromardi_token'));
  const navigate = useNavigate();

  function handleLogin(nextToken: string) {
    window.localStorage.setItem('idromardi_token', nextToken);
    setToken(nextToken);
  }

  function handleLogout() {
    window.localStorage.removeItem('idromardi_token');
    setToken(null);
    navigate('/');
  }

  return (
    <Routes>
      <Route
        path="/"
        element={token ? <Navigate to="/portal" replace /> : <LoginPage onLogin={handleLogin} />}
      />
      <Route
        path="/portal"
        element={
          <ProtectedRoute isAuthenticated={Boolean(token)}>
            <DashboardLayout onLogout={handleLogout} />
          </ProtectedRoute>
        }
      >
        <Route index element={<DashboardPage />} />
      </Route>
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
