import { useState } from 'react';
import type { FormEvent } from 'react';
import { KeyRound, ShieldCheck } from 'lucide-react';
import { BrandLogo } from '../components/BrandLogo';
import { changeTemporaryPassword } from '../services/api';
import type { LoginResponse } from '../services/api';

type ChangePasswordPageProps = {
  email: string;
  onPasswordChanged: (session: LoginResponse) => void;
};

export function ChangePasswordPage({ email, onPasswordChanged }: ChangePasswordPageProps) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [status, setStatus] = useState<'idle' | 'submitting' | 'error'>('idle');
  const [message, setMessage] = useState('');

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage('');

    if (newPassword !== confirmPassword) {
      setStatus('error');
      setMessage('Le nuove password non coincidono.');
      return;
    }

    setStatus('submitting');

    try {
      const session = await changeTemporaryPassword(email, currentPassword, newPassword);
      onPasswordChanged(session);
      window.location.href = '/portal';
    } catch (caughtError) {
      setStatus('error');
      setMessage(caughtError instanceof Error ? caughtError.message : 'Cambio password non riuscito.');
    }
  }

  return (
    <main className="login-page">
      <div className="login-shell password-shell">
        <section className="login-visual" aria-label="Cambio password temporanea">
          <BrandLogo className="login-logo" />
          <div className="portal-badge">
            <KeyRound size={15} />
            Primo accesso
          </div>
          <div className="login-copy">
            <h1>Imposta la tua password personale.</h1>
            <p>
              Il codice ricevuto via email e una password temporanea. Per
              continuare devi sostituirla con una password personale.
            </p>
          </div>
        </section>
        <section className="login-panel" aria-label="Cambio password">
          <div className="login-card">
            <span className="login-icon">
              <ShieldCheck size={24} />
            </span>
            <div>
              <h2>Cambia password</h2>
              <p>Account: {email}</p>
            </div>
            <form onSubmit={handleSubmit}>
              <label>
                Password temporanea
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(event) => setCurrentPassword(event.target.value)}
                  required
                />
              </label>
              <label>
                Nuova password
                <input
                  type="password"
                  minLength={8}
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  required
                />
              </label>
              <label>
                Conferma nuova password
                <input
                  type="password"
                  minLength={8}
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  required
                />
              </label>
              {message && <p className="form-error">{message}</p>}
              <button className="primary-button login-submit" type="submit" disabled={status === 'submitting'}>
                {status === 'submitting' ? 'Salvataggio...' : 'Salva password'}
              </button>
            </form>
          </div>
        </section>
      </div>
    </main>
  );
}
