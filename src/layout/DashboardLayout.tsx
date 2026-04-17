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
          <NavLink to="/portal" end>
            <Home size={18} />
            Riepilogo
          </NavLink>
          <NavLink to="/portal#consumption">
            <Gauge size={18} />
            Consumi
          </NavLink>
          <NavLink to="/portal#invoices">
            <FileText size={18} />
            Fatture
          </NavLink>
          <NavLink to="/portal#payments">
            <CreditCard size={18} />
            Pagamenti
          </NavLink>
          <NavLink to="/portal#profile">
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
