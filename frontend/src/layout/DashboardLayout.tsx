import { Home, LogOut, User } from 'lucide-react';
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
