import { Home, LogOut, User, MessageCircle } from 'lucide-react';
import { NavLink, Outlet } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { supportApi } from '../services/supportApi';
import { BrandLogo } from '../components/BrandLogo';

type DashboardLayoutProps = {
  onLogout: () => void;
};

export function DashboardLayout({ onLogout }: DashboardLayoutProps) {
  const [unread, setUnread] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    const update = () => {
      if (document.visibilityState !== 'visible') return;
      void supportApi<{ unreadRequests: number }>('summary', undefined, controller.signal)
        .then(result => { if (!controller.signal.aborted) setUnread(result.unreadRequests); }).catch(() => {});
    };
    update(); const timer = window.setInterval(update, 30000);
    window.addEventListener('customer-support-read', update); document.addEventListener('visibilitychange', update);
    return () => { controller.abort(); window.clearInterval(timer); window.removeEventListener('customer-support-read', update); document.removeEventListener('visibilitychange', update); };
  }, []);
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
          <NavLink to="/portal/richieste"><MessageCircle size={18} />Le mie richieste{unread > 0 && <span className="customer-support-nav-count" aria-label={`${unread} richieste con nuove risposte`}>{unread}</span>}</NavLink>
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
