import { MapPin, Phone, ArrowUpRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { Customer } from '../types/portal';

type ProfilePanelProps = {
  customer: Customer;
  serviceNotes: string[];
};

export function ProfilePanel({ customer, serviceNotes: _serviceNotes }: ProfilePanelProps) {
  const profileItems = [
    ...(customer.phone || customer.mobile ? [{ icon: <Phone size={17} />, label: 'Recapito', value: customer.mobile || customer.phone }] : []),
    { icon: <MapPin size={17} />, label: 'Indirizzo fornitura', value: customer.address },
  ];

  return (
    <aside className="profile-column">
      <section className="panel profile-panel">
        <div className="profile-summary-heading">
        <div className="avatar" aria-hidden="true">
          {customer.name
            .split(' ')
            .map((part) => part[0])
            .join('')
            .slice(0, 2)}
        </div>
        <div><h2>{customer.name}</h2><p>{customer.accountNo}</p></div>
        <span className="status-pill">{customer.status}</span>
        </div>
        <div className="profile-list">
          {profileItems.map((item) => (
            <div className="profile-item" key={item.label}>
              <span>{item.icon}</span>
              <div>
                <small>{item.label}</small>
                <strong>{item.value}</strong>
              </div>
            </div>
          ))}
        </div>
        <Link className="profile-manage-link" to="/portal/profilo">Gestisci il profilo <ArrowUpRight size={17} /></Link>
      </section>

      {/* <section className="panel notice-panel">
        <div className="panel-heading compact">
          <h2>Comunicazioni</h2>
          <Bell size={18} />
        </div>
        <ul>
          {serviceNotes.map((note) => (
            <li key={note}>{note}</li>
          ))}
        </ul>
      </section> */}
    </aside>
  );
}
