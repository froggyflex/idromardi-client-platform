import { useState } from 'react';
import type { FormEvent } from 'react';
import { ArrowLeft, Droplets, Eye, EyeOff, LoaderCircle, ShieldCheck, UserRoundPlus } from 'lucide-react';
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
  const [showPassword, setShowPassword] = useState(false);

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
          <h1>La tua utenza, sempre a portata di mano.</h1>
          <p>
            Bollette, consumi e assistenza in un unico spazio, ovunque ti trovi.
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
            <h2>Crea il tuo account</h2>
            <p>
              Trovi il numero utenza sulla bolletta. Inserisci i dati
              dell'intestatario per verificare la tua fornitura.
            </p>
          </div>
          <form onSubmit={handleSubmit}>
            <h3 className="registration-step"><span>1</span>I dati della tua utenza</h3>
            <label>
              Numero utenza
              <input
                inputMode="text"
                autoComplete="username"
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
                  autoComplete="given-name"
                  onChange={(event) => updateField('nome', event.target.value)}
                  placeholder="Mario"
                  required
                />
              </label>
              <label>
                Cognome
                <input
                  value={form.cognome}
                  autoComplete="family-name"
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
                autoCapitalize="characters"
                onChange={(event) => updateField('fiscalCode', event.target.value.toUpperCase())}
                placeholder="Il tuo codice fiscale"
                required
              />
            </label>
            <div className="form-grid">
              <label>
                Interno (opzionale)
                <input
                  value={form.interno}
                  onChange={(event) => updateField('interno', event.target.value)}
                  placeholder="Es. 4B"
                />
              </label>
              <label>
                Cellulare (opzionale)
                <input
                  inputMode="tel"
                  autoComplete="tel"
                  value={form.mobile}
                  onChange={(event) => updateField('mobile', event.target.value)}
                  placeholder="Es. 370..."
                />
              </label>
            </div>
            <label>
              Matricola contatore (opzionale)
              <input
                value={form.meterSerial}
                onChange={(event) => updateField('meterSerial', event.target.value)}
                placeholder="Se disponibile"
              />
            </label>
            <h3 className="registration-step"><span>2</span>Scegli la tua password</h3>
            <div className="registration-password-field">
              <label htmlFor="registration-password">Password</label>
              <span className="password-input-wrap"><input
                id="registration-password"
                aria-describedby="registration-password-help"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                minLength={8}
                value={form.password}
                onChange={(event) => updateField('password', event.target.value)}
                required
              /><button type="button" aria-label={showPassword ? 'Nascondi password' : 'Mostra password'} aria-pressed={showPassword} onClick={() => setShowPassword(value => !value)}>{showPassword ? <EyeOff size={19} /> : <Eye size={19} />}</button></span>
              <small className="password-help" id="registration-password-help">Usa almeno 8 caratteri.</small>
            </div>
            <label>
              Conferma password
              <input
                type="password"
                autoComplete="new-password"
                minLength={8}
                value={form.confirmPassword}
                onChange={(event) => updateField('confirmPassword', event.target.value)}
                required
              />
            </label>
            {message && (
              <p role={status === 'success' ? 'status' : 'alert'} className={status === 'success' ? 'form-success' : 'form-error'}>{message}</p>
            )}
            <button
              className="primary-button login-submit"
              type="submit"
              disabled={status === 'submitting' || status === 'success'}
            >
              {status === 'submitting' ? <LoaderCircle size={19} className="spin" /> : status === 'success' ? <ShieldCheck size={19} /> : <UserRoundPlus size={19} />}
              {status === 'submitting'
                ? 'Verifica in corso...'
                : status === 'success'
                  ? 'Account creato'
                  : 'Crea il tuo account'}
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
