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
  const [token, setToken] = useState(() => window.localStorage.getItem('idromardi_token'));
  const [email, setEmail] = useState(() => window.localStorage.getItem('idromardi_email') || '');
  const [mustChangePassword, setMustChangePassword] = useState(
    () => window.localStorage.getItem('idromardi_must_change_password') === 'true',
  );
  const navigate = useNavigate();

  function handleLogin(session: LoginResponse) {
    window.localStorage.setItem('idromardi_token', session.token);
    window.localStorage.setItem('idromardi_email', session.email);
    window.localStorage.setItem(
      'idromardi_must_change_password',
      String(session.mustChangePassword),
    );
    setToken(session.token);
    setEmail(session.email);
    setMustChangePassword(session.mustChangePassword);
  }

  function handleLogout() {
    window.localStorage.removeItem('idromardi_token');
    window.localStorage.removeItem('idromardi_email');
    window.localStorage.removeItem('idromardi_must_change_password');
    setToken(null);
    setEmail('');
    setMustChangePassword(false);
    navigate('/');
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
            <ChangePasswordPage email={email} onPasswordChanged={handleLogin} />
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
