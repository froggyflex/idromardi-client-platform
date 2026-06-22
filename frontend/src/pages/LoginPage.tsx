import { useState } from 'react';
import type { FormEvent } from 'react';
import { ArrowLeft, Droplets, Mail, ShieldCheck } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { BrandLogo } from '../components/BrandLogo';
import { login, requestPasswordReset } from '../services/api';
import type { LoginResponse } from '../services/api';

type LoginPageProps = {
  onLogin: (session: LoginResponse) => void;
};

export function LoginPage({ onLogin }: LoginPageProps) {
  const [email, setEmail] = useState('cliente@email.com');
  const [password, setPassword] = useState('demo1234');
  const [error, setError] = useState('');
  const [isResetMode, setIsResetMode] = useState(false);
  const [resetEmail, setResetEmail] = useState(email);
  const [resetMessage, setResetMessage] = useState('');
  const [resetStatus, setResetStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const navigate = useNavigate();

  function openResetMode() {
    setIsResetMode(true);
    setResetEmail(email);
    setResetMessage('');
    setResetStatus('idle');
    setError('');
  }

  function closeResetMode() {
    setIsResetMode(false);
    setResetMessage('');
    setResetStatus('idle');
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    try {
      const session = await login(email, password);
 
      onLogin(session);

      navigate(session.mustChangePassword ? "/cambia-password" : "/portal");
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Accesso non riuscito."
      );
    }
  }

  async function handlePasswordReset(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setResetMessage('');
    setResetStatus('submitting');

    try {
      const result = await requestPasswordReset(resetEmail);
      setResetStatus('success');
      setResetMessage(`${result.message} Accedi usando il codice ricevuto come password temporanea.`);
      setEmail(resetEmail);
      setPassword('');
    } catch (caughtError) {
      setResetStatus('error');
      setResetMessage(
        caughtError instanceof Error
          ? caughtError.message
          : 'Recupero password non riuscito.'
      );
    }
  }
  
  return (
    <main className="login-page">
      <div className="login-shell">
        <section className="login-visual" aria-label="Portale clienti Idromardi">
          <div className="portal-badge">
            <Droplets size={15} />
            Portale clienti idrico
          </div>
          <BrandLogo className="login-logo" />
          <div className="login-copy">
            <h1>Un accesso semplice ai consumi, alle fatture e al profilo.</h1>
            <p>
                Hai domande? Siamo disponibili anche su instagram #idromardi_servizi
            </p>
          </div>
          <div className="usage-panel">
            <div>
              <strong>Fatture</strong>
              <span>Storico completo e download rapido</span>
            </div>
            <div>
              <strong>Consumi</strong>
              <span>Trend mensile semplice da leggere</span>
            </div>
            <div>
              <strong>Profilo</strong>
              <span>Dati utenza e contratto</span>
            </div>
            <div>
              <strong>Pagamenti</strong>
              <span>Saldo, scadenze e stato</span>
            </div>
          </div>
        </section>

        <section className="login-panel" aria-label="Accesso al portale">
          <div className="login-card">
            <span className="login-icon">
              {isResetMode ? <Mail size={24} /> : <Droplets size={24} />}
            </span>
            <div>
              <h2>{isResetMode ? 'Recupera password' : 'Accedi al portale'}</h2>
              <p>
                {isResetMode
                  ? "Inserisci l'email collegata al portale. Ti invieremo una password temporanea."
                  : 'Inserisci le credenziali per consultare consumi, fatture e dettagli del contratto.'}
              </p>
            </div>

            {isResetMode ? (
              <form className="reset-form" onSubmit={handlePasswordReset}>
                <label>
                  Email registrata
                  <input
                    type="email"
                    value={resetEmail}
                    onChange={(event) => setResetEmail(event.target.value)}
                    placeholder="cliente@email.com"
                    required
                  />
                </label>
                {resetMessage && (
                  <p
                    className={`form-message ${
                      resetStatus === 'success' ? 'form-message-success' : 'form-message-error'
                    }`}
                  >
                    {resetMessage}
                  </p>
                )}
                <button
                  className="secondary-button login-submit"
                  type="submit"
                  disabled={resetStatus === 'submitting'}
                >
                  <Mail size={18} />
                  {resetStatus === 'submitting' ? 'Invio...' : 'Invia password temporanea'}
                </button>
                <button className="ghost-button login-submit" type="button" onClick={closeResetMode}>
                  <ArrowLeft size={18} />
                  Torna all'accesso
                </button>
              </form>
            ) : (
              <>
                <form onSubmit={handleSubmit}>
                  <label>
                    Email
                    <input
                      type="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      placeholder="cliente@email.com"
                      required
                    />
                  </label>
                  <label>
                    Password
                    <input
                      type="password"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      placeholder="Inserisci la password"
                      required
                    />
                  </label>
                  {error && <p className="form-message form-message-error">{error}</p>}
                  <button className="primary-button login-submit" type="submit">
                    <ShieldCheck size={18} />
                    Accedi
                  </button>
                </form>
                <div className="login-actions">
                  <button className="link-button" type="button" onClick={openResetMode}>
                    Hai dimenticato la password?
                  </button>
                </div>
                <Link className="register-button" to="/registrati">
                  Registrati
                </Link>
              </>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
