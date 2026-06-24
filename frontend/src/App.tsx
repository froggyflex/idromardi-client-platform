import { useState } from 'react';
import { Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import { ProtectedRoute } from './components/ProtectedRoute';
import { DashboardLayout } from './layout/DashboardLayout';
import { DashboardPage } from './pages/DashboardPage';
import { LoginPage } from './pages/LoginPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { RegisterPage } from './pages/RegisterPage';
import { ChangePasswordPage } from './pages/ChangePasswordPage';
import { ProfilePage } from './pages/ProfilePage';
import type { LoginResponse } from './services/api';

export default function App() {
  const [token, setToken] = useState(() => window.localStorage.getItem('portalToken'));
  const [accessIdentifier, setAccessIdentifier] = useState(
    () =>
      window.localStorage.getItem('portalAccessIdentifier') ||
      window.localStorage.getItem('portalPhone') ||
      window.localStorage.getItem('portalEmail') ||
      '',
  );
  const [mustChangePassword, setMustChangePassword] = useState(
    () => window.localStorage.getItem('portalMustChangePassword') === 'true',
  );
  const navigate = useNavigate();

  function handleLogin(session: LoginResponse) {

    window.localStorage.setItem('portalToken', session.token);
    window.localStorage.setItem('portalAccessIdentifier', session.accessIdentifier);
    window.localStorage.removeItem('portalPhone');
    window.localStorage.removeItem('portalEmail');
    window.localStorage.setItem(
      'portalMustChangePassword',
      String(session.mustChangePassword),
    );
    setToken(session.token);
    setAccessIdentifier(session.accessIdentifier);
    setMustChangePassword(session.mustChangePassword);
  }

function handleLogout() {
  localStorage.removeItem("portalToken");
  localStorage.removeItem("portalAccessIdentifier");
  localStorage.removeItem("portalPhone");
  localStorage.removeItem("portalEmail");
  localStorage.removeItem("portalMustChangePassword");

  setToken(null);
  setAccessIdentifier("");
  setMustChangePassword(false);

  navigate("/");
}

  return (
    <Routes>
      <Route
        path="/"
        element={
          token ? (
            <Navigate to={mustChangePassword ? '/cambia-password' : '/portal'} replace />
          ) : (
            <LoginPage onLogin={handleLogin} />
          )
        }
      />
      <Route path="/registrati" element={<RegisterPage />} />
      <Route
        path="/cambia-password"
        element={
          <ProtectedRoute isAuthenticated={Boolean(token)}>
            <ChangePasswordPage accessIdentifier={accessIdentifier} onPasswordChanged={handleLogin} />
          </ProtectedRoute>
        }
      />
      <Route
        path="/portal"
        element={
          mustChangePassword ? (
            <Navigate to="/cambia-password" replace />
          ) : (
            <ProtectedRoute isAuthenticated={Boolean(token)}>
              <DashboardLayout onLogout={handleLogout} />
            </ProtectedRoute>
          )
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="profilo" element={<ProfilePage />} />
      </Route>
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
