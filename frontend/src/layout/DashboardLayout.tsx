import { CreditCard, FileText, Gauge, Home, LogOut, User } from 'lucide-react';
import { NavLink, Outlet } from 'react-router-dom';
import { BrandLogo } from '../components/BrandLogo';

type DashboardLayoutProps = {
  onLogout: () => void;
};

export function DashboardLayout({ onLogout }: DashboardLayoutProps) {
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand-lockup">
          <BrandLogo className="brand-logo" />
        </div>
        <nav aria-label="Navigazione cliente">
          <a href="/portal#overview">
            <Home size={18} />
            Riepilogo
          </a>
          <a href="/portal#consumption">
            <Gauge size={18} />
            Consumi
          </a>
          <a href="/portal#invoices">
            <FileText size={18} />
            Fatture
          </a>
          <a href="/portal#payments">
            <CreditCard size={18} />
            Pagamenti
          </a>
          <NavLink to="/portal/profilo">
            <User size={18} />
            Profilo
          </NavLink>
        </nav>
        <button className="logout-button" type="button" onClick={onLogout}>
          <LogOut size={18} />
          Esci
        </button>
      </aside>
      <Outlet />
    </div>
  );
}
