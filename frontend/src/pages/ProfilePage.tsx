import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Mail, MapPin, Phone, Save, User } from 'lucide-react';
import { getCurrentPortalData, updatePortalProfile } from '../services/api';
import type { PortalData, PortalProfileUpdate } from '../types/portal';

export function ProfilePage() {
  const [data, setData] = useState<PortalData | null>(null);
  const [form, setForm] = useState<PortalProfileUpdate>({
    phone: '',
    mobile: '',
    fiscalCode: '',
  });
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const email = window.localStorage.getItem('idromardi_email') || '';

  useEffect(() => {
    void getCurrentPortalData(email).then((portalData) => {
      setData(portalData);
      setForm({
        phone: portalData.customer.phone || '',
        mobile: portalData.customer.mobile || '',
        fiscalCode: portalData.customer.fiscalCode || '',
      });
    });
  }, [email]);

  function updateField(field: keyof PortalProfileUpdate, value: string) {
    setForm((currentForm) => ({ ...currentForm, [field]: value }));
    setStatus('idle');
    setMessage('');
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus('submitting');
    setMessage('');

    try {
      const nextData = await updatePortalProfile(email, form);
      setData(nextData);
      setStatus('success');
      setMessage('Profilo aggiornato correttamente.');
    } catch (caughtError) {
      setStatus('error');
      setMessage(caughtError instanceof Error ? caughtError.message : 'Aggiornamento non riuscito.');
    }
  }

  if (!data) {
    return <main className="dashboard loading-state">Caricamento profilo...</main>;
  }

  const { customer } = data;

  return (
    <main className="dashboard profile-page">
      <header className="dashboard-header">
        <div>
          <p className="eyebrow">Profilo</p>
          <h1>Dati personali</h1>
          <span>Gestisci i dati esposti nel portale clienti.</span>
        </div>
      </header>

      <div className="profile-page-grid">
        <section className="panel profile-details-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Riepilogo</p>
              <h2>Utenza collegata</h2>
            </div>
            <span className="status-pill">{customer.status}</span>
          </div>
          <div className="profile-list">
            <div className="profile-item">
              <span><User size={17} /></span>
              <div>
                <small>Intestatario</small>
                <strong>{customer.name}</strong>
              </div>
            </div>
            <div className="profile-item">
              <span><Mail size={17} /></span>
              <div>
                <small>Email accesso</small>
                <strong>{customer.email}</strong>
              </div>
            </div>
            <div className="profile-item">
              <span><MapPin size={17} /></span>
              <div>
                <small>Fornitura</small>
                <strong>{customer.meterNo}</strong>
              </div>
            </div>
          </div>
        </section>

        <section className="panel editable-profile-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Modifica</p>
              <h2>Dati di contatto</h2>
            </div>
            <Phone size={20} />
          </div>
          <form className="profile-form" onSubmit={handleSubmit}>
            <label>
              Telefono
              <input
                value={form.phone}
                onChange={(event) => updateField('phone', event.target.value)}
                placeholder="+39 ..."
              />
            </label>
            <label>
              Cellulare
              <input
                value={form.mobile}
                onChange={(event) => updateField('mobile', event.target.value)}
                placeholder="+39 ..."
              />
            </label>
            <label>
              Codice fiscale
              <input
                value={form.fiscalCode}
                onChange={(event) => updateField('fiscalCode', event.target.value)}
                placeholder="Codice fiscale"
              />
            </label>
            {message && (
              <p className={status === 'success' ? 'form-success' : 'form-error'}>{message}</p>
            )}
            <button className="primary-button" type="submit" disabled={status === 'submitting'}>
              <Save size={18} />
              {status === 'submitting' ? 'Salvataggio...' : 'Salva modifiche'}
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}
