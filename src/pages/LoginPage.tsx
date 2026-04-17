import { useState } from 'react';
import type { FormEvent } from 'react';
import { Droplets, ShieldCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { BrandLogo } from '../components/BrandLogo';
import { login } from '../services/api';

type LoginPageProps = {
  onLogin: (token: string) => void;
};

export function LoginPage({ onLogin }: LoginPageProps) {
  const [email, setEmail] = useState('cliente@email.com');
  const [password, setPassword] = useState('demo1234');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');

    try {
      const session = await login(email, password);
      onLogin(session.token);
      navigate('/portal');
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Accesso non riuscito.');
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
              <Droplets size={24} />
            </span>
            <div>
              <h2>Accedi al portale</h2>
              <p>
                Inserisci le credenziali per consultare consumi, fatture e
                dettagli del contratto.
              </p>
            </div>
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
              {error && <p className="form-error">{error}</p>}
              <button className="primary-button login-submit" type="submit">
                <ShieldCheck size={18} />
                Accedi
              </button>
              <div className="form-row">
                <button className="link-button" type="button">
                  Hai dimenticato la password?
                </button>
                <button className="muted-button" type="button">
                  Richiedi accesso
                </button>
              </div>
            </form>
          </div>
        </section>
      </div>
    </main>
  );
}
