import { useState } from 'react';
import type { FormEvent } from 'react';
import { ArrowLeft, Droplets, Send } from 'lucide-react';
import { Link } from 'react-router-dom';
import { BrandLogo } from '../components/BrandLogo';
import { requestRegistration } from '../services/api';

type RegisterForm = {
  numeroUtenza: string;
  nome: string;
  cognome: string;
  fiscalCode: string;
  interno: string;
  meterSerial: string;
  mobile: string;
  password: string;
  confirmPassword: string;
};

const initialForm: RegisterForm = {
  numeroUtenza: '',
  nome: '',
  cognome: '',
  fiscalCode: '',
  interno: '',
  meterSerial: '',
  mobile: '',
  password: '',
  confirmPassword: '',
};

export function RegisterPage() {
  const [form, setForm] = useState(initialForm);
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  function updateField(field: keyof RegisterForm, value: string) {
    setForm((currentForm) => ({ ...currentForm, [field]: value }));
    if (status !== 'idle') {
      setStatus('idle');
      setMessage('');
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus('submitting');
    setMessage('');

    if (form.password !== form.confirmPassword) {
      setStatus('error');
      setMessage('Le password non coincidono.');
      return;
    }

    try {
      const result = await requestRegistration({
        numeroUtenza: form.numeroUtenza,
        nome: form.nome,
        cognome: form.cognome,
        fiscalCode: form.fiscalCode,
        interno: form.interno,
        meterSerial: form.meterSerial,
        mobile: form.mobile,
        password: form.password,
      });
      setStatus('success');
      setMessage(result.message);
    } catch (caughtError) {
      setStatus('error');
      setMessage(
        caughtError instanceof Error
          ? caughtError.message
          : 'Non e stato possibile creare l account.',
      );
    }
  }

  return (
    <main className="register-page">
      <section className="register-hero" aria-label="Registrazione portale Idromardi">
        <BrandLogo className="login-logo" />
        <div className="portal-badge">
          <Droplets size={15} />
          Registrazione utenza
        </div>
        <div className="login-copy">
          <h1>Richiedi l'accesso al portale clienti.</h1>
          <p>
            Inserisci i dati utenza. Se il codice fiscale non e presente in
            archivio, useremo anche interno, matricola o cellulare per la verifica.
          </p>
        </div>
      </section>

      <section className="register-panel">
        <div className="register-card">
          <Link className="back-link" to="/">
            <ArrowLeft size={17} />
            Torna al login
          </Link>
          <div>
            <p className="eyebrow">Nuovo accesso</p>
            <h2>Registrati</h2>
            <p>
              Il numero utenza puo essere semplice, ad esempio 40010001, oppure
              includere piu utenti, ad esempio 40010001/2. Il condominio viene
              ricavato automaticamente.
            </p>
          </div>
          <form onSubmit={handleSubmit}>
            <label>
              Numero utenza
              <input
                inputMode="text"
                value={form.numeroUtenza}
                onChange={(event) =>
                  updateField('numeroUtenza', event.target.value.replace(/\s+/g, ''))
                }
                placeholder="40010001/2"
                pattern="^400[0-9]+000[0-9]+(/[0-9]+)*$"
                title="Formato richiesto: 400[condominio]000[utenza], es. 40010001 oppure 40010001/2"
                required
              />
            </label>
            <div className="form-grid">
              <label>
                Nome
                <input
                  value={form.nome}
                  onChange={(event) => updateField('nome', event.target.value)}
                  placeholder="Mario"
                  required
                />
              </label>
              <label>
                Cognome
                <input
                  value={form.cognome}
                  onChange={(event) => updateField('cognome', event.target.value)}
                  placeholder="Rossi"
                  required
                />
              </label>
            </div>
            <label>
              Codice fiscale
              <input
                value={form.fiscalCode}
                onChange={(event) => updateField('fiscalCode', event.target.value.toUpperCase())}
                placeholder="Il tuo codice fiscale"
                required
              />
            </label>
            <div className="form-grid">
              <label>
                Interno <span className="optional-label">opzionale</span>
                <input
                  value={form.interno}
                  onChange={(event) => updateField('interno', event.target.value)}
                  placeholder="Es. 4B"
                />
              </label>
              <label>
                Cellulare <span className="optional-label">opzionale</span>
                <input
                  inputMode="tel"
                  value={form.mobile}
                  onChange={(event) => updateField('mobile', event.target.value)}
                  placeholder="Es. 370..."
                />
              </label>
            </div>
            <label>
              Matricola contatore <span className="optional-label">opzionale</span>
              <input
                value={form.meterSerial}
                onChange={(event) => updateField('meterSerial', event.target.value)}
                placeholder="Se disponibile"
              />
            </label>
            <label>
              Password
              <input
                type="password"
                minLength={8}
                value={form.password}
                onChange={(event) => updateField('password', event.target.value)}
                required
              />
            </label>
            <label>
              Conferma password
              <input
                type="password"
                minLength={8}
                value={form.confirmPassword}
                onChange={(event) => updateField('confirmPassword', event.target.value)}
                required
              />
            </label>
            {message && (
              <p className={status === 'success' ? 'form-success' : 'form-error'}>{message}</p>
            )}
            <button
              className="primary-button login-submit"
              type="submit"
              disabled={status === 'submitting' || status === 'success'}
            >
              <Send size={18} />
              {status === 'submitting'
                ? 'Verifica in corso...'
                : status === 'success'
                  ? 'Account creato'
                  : 'Crea account'}
            </button>
            {status === 'success' && (
              <Link className="register-button" to="/">
                Vai al login
              </Link>
            )}
          </form>
        </div>
      </section>
    </main>
  );
}
