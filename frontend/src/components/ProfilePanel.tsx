import { Bell, Mail, MapPin, Phone, User } from 'lucide-react';
import type { Customer } from '../types/portal';

type ProfilePanelProps = {
  customer: Customer;
  serviceNotes: string[];
};

export function ProfilePanel({ customer, serviceNotes }: ProfilePanelProps) {
  const profileItems = [
    { icon: <User size={17} />, label: 'Intestatario', value: customer.name },
    { icon: <Mail size={17} />, label: 'Email', value: customer.email },
    { icon: <Phone size={17} />, label: 'Cellulare', value: customer.mobile || 'Non indicato' },
    { icon: <MapPin size={17} />, label: 'Indirizzo fornitura', value: customer.address },
  ];

  return (
    <aside className="profile-column">
      <section className="panel profile-panel">
        <div className="avatar" aria-hidden="true">
          {customer.name
            .split(' ')
            .map((part) => part[0])
            .join('')
            .slice(0, 2)}
        </div>
        <h2>{customer.name}</h2>
        <p>{customer.accountNo}</p>
        <span className="status-pill">{customer.status}</span>
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
      </section>

      <section className="panel notice-panel">
        <div className="panel-heading compact">
          <h2>Comunicazioni</h2>
          <Bell size={18} />
        </div>
        <ul>
          {serviceNotes.map((note) => (
            <li key={note}>{note}</li>
          ))}
        </ul>
      </section>
    </aside>
  );
}
