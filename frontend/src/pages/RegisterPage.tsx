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
  email: string;
};

const initialForm: RegisterForm = {
  numeroUtenza: '',
  nome: '',
  cognome: '',
  email: '',
};

export function RegisterPage() {
  const [form, setForm] = useState(initialForm);
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  function updateField(field: keyof RegisterForm, value: string) {
    setForm((currentForm) => ({ ...currentForm, [field]: value }));
    if (status === 'success') {
      setStatus('idle');
      setMessage('');
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus('submitting');
    setMessage('');

    try {
      const result = await requestRegistration(form);
      setStatus('success');
      setMessage(result.message);
    } catch (caughtError) {
      setStatus('error');
      setMessage(
        caughtError instanceof Error
          ? caughtError.message
          : 'Non e stato possibile inviare la richiesta.',
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
            Inserisci il numero utenza e i tuoi dati. Se la ricerca conferma
            una corrispondenza, riceverai un codice via email.
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
                maxLength={12}
                pattern="[0-9]{8}(/[0-9]+)?"
                value={form.numeroUtenza}
                onChange={(event) => updateField('numeroUtenza', event.target.value)}
                placeholder="40010001/2"
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
              Email
              <input
                type="email"
                value={form.email}
                onChange={(event) => updateField('email', event.target.value)}
                placeholder="nome@email.com"
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
                  ? 'Codice inviato'
                  : 'Cerca utenza'}
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}
