import { Home, LogOut, User, MessageCircle, FileText } from 'lucide-react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { supportApi } from '../services/supportApi';
import { BrandLogo } from '../components/BrandLogo';
import { ChatWidget } from '../components/ChatWidget';

type DashboardLayoutProps = {
  onLogout: () => void;
};

export function DashboardLayout({ onLogout }: DashboardLayoutProps) {
  const location = useLocation();
  const active = location.pathname.endsWith('/profilo') ? 'profile' : location.pathname.endsWith('/richieste') ? 'requests' : location.hash === '#invoices' ? 'invoices' : 'overview';
  const [unread, setUnread] = useState(0);
  useEffect(() => {
    if (location.hash === '#invoices') document.getElementById('invoices')?.scrollIntoView({ block: 'start' });
    else window.scrollTo({ top: 0, behavior: 'instant' });
  }, [location.pathname, location.hash]);
  const navigation = [
    { key: 'overview', to: '/portal', label: 'Riepilogo', icon: Home },
    { key: 'invoices', to: '/portal#invoices', label: 'Bollette', icon: FileText },
    { key: 'requests', to: '/portal/richieste', label: 'Richieste', icon: MessageCircle },
    { key: 'profile', to: '/portal/profilo', label: 'Profilo', icon: User },
  ];
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
      <a className="portal-skip-link" href="#portal-content">Vai al contenuto</a>
      <header className="mobile-portal-header">
        <Link to="/portal" aria-label="Idromardi, riepilogo"><BrandLogo /></Link>
        <span>Area clienti</span>
        <button type="button" onClick={onLogout} aria-label="Esci dal portale" title="Esci"><LogOut size={20} /></button>
      </header>
      <aside className="sidebar">
        <div className="brand-lockup">
          <BrandLogo className="brand-logo" />
        </div>
        <nav aria-label="Navigazione cliente">
          {navigation.map(({ key, to, label, icon: Icon }) => <Link key={key} to={to} className={active === key ? 'is-active' : ''} aria-current={active === key ? 'page' : undefined}>
            <span className="portal-nav-icon"><Icon size={21} />{key === 'requests' && unread > 0 && <span className="customer-support-nav-count" aria-label={`${unread} richieste con nuove risposte`}>{unread > 99 ? '99+' : unread}</span>}</span>
            <span>{label}</span>
          </Link>)}
        </nav>
        <button className="logout-button" type="button" onClick={onLogout}>
          <LogOut size={18} />
          Esci
        </button>
      </aside>
      <div className="portal-content" id="portal-content" tabIndex={-1}><Outlet /></div>
      <ChatWidget />
    </div>
  );
}
