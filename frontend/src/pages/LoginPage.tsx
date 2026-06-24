import { useState } from 'react';
import type { FormEvent } from 'react';
import { ArrowLeft, Droplets, KeyRound, ShieldCheck } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { BrandLogo } from '../components/BrandLogo';
import { completePasswordReset, login, verifyPasswordResetIdentity } from '../services/api';
import type { LoginResponse } from '../services/api';

type LoginPageProps = {
  onLogin: (session: LoginResponse) => void;
};

type ResetForm = {
  numeroUtenza: string;
  cognome: string;
  fiscalCode: string;
};

const initialResetForm: ResetForm = {
  numeroUtenza: '',
  cognome: '',
  fiscalCode: '',
};

export function LoginPage({ onLogin }: LoginPageProps) {
  const [numeroUtenza, setNumeroUtenza] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isResetMode, setIsResetMode] = useState(false);
  const [resetForm, setResetForm] = useState(initialResetForm);
  const [resetStep, setResetStep] = useState<'identity' | 'password'>('identity');
  const [resetToken, setResetToken] = useState('');
  const [verifiedAccessIdentifier, setVerifiedAccessIdentifier] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resetMessage, setResetMessage] = useState('');
  const [resetStatus, setResetStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const navigate = useNavigate();

  function updateResetField(field: keyof ResetForm, value: string) {
    setResetForm((current) => ({ ...current, [field]: value }));
    setResetStatus('idle');
    setResetMessage('');
  }

  function openResetMode() {
    setIsResetMode(true);
    setResetForm((current) => ({ ...current, numeroUtenza }));
    setResetStep('identity');
    setResetToken('');
    setVerifiedAccessIdentifier('');
    setNewPassword('');
    setConfirmPassword('');
    setResetMessage('');
    setResetStatus('idle');
    setError('');
  }

  function closeResetMode() {
    setIsResetMode(false);
    setResetStep('identity');
    setResetMessage('');
    setResetStatus('idle');
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');

    try {
      const session = await login(numeroUtenza, password);
      onLogin(session);
      navigate(session.mustChangePassword ? '/cambia-password' : '/portal');
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : 'Accesso non riuscito.',
      );
    }
  }

  async function handlePasswordResetIdentity(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setResetMessage('');

    setResetStatus('submitting');

    try {
      const result = await verifyPasswordResetIdentity({
        numeroUtenza: resetForm.numeroUtenza,
        cognome: resetForm.cognome,
        fiscalCode: resetForm.fiscalCode,
      });
      setResetStatus('success');
      setResetMessage(result.message);
      setResetToken(result.resetToken);
      setVerifiedAccessIdentifier(result.accessIdentifier);
      setResetStep('password');
    } catch (caughtError) {
      setResetStatus('error');
      setResetMessage(
        caughtError instanceof Error
          ? caughtError.message
          : 'Verifica dati non riuscita.',
      );
    }
  }

  async function handlePasswordReset(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setResetMessage('');

    if (newPassword !== confirmPassword) {
      setResetStatus('error');
      setResetMessage('Le password non coincidono.');
      return;
    }

    setResetStatus('submitting');

    try {
      const session = await completePasswordReset(resetToken, newPassword);
      setResetStatus('success');
      setResetMessage(session.message);
      setNumeroUtenza(session.accessIdentifier);
      setPassword('');
      onLogin(session);
      navigate('/portal');
    } catch (caughtError) {
      setResetStatus('error');
      setResetMessage(
        caughtError instanceof Error
          ? caughtError.message
          : 'Salvataggio password non riuscito.',
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
            <p>Hai domande? Siamo disponibili anche su instagram #idromardi_servizi</p>
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
              {isResetMode ? <KeyRound size={24} /> : <Droplets size={24} />}
            </span>
            <div>
              <h2>{isResetMode ? 'Recupera password' : 'Accedi al portale'}</h2>
              <p>
                {isResetMode
                  ? resetStep === 'identity'
                    ? 'Verifica la tua identita con i dati utenza. Dopo il controllo potrai impostare una nuova password.'
                    : 'Identita verificata. Imposta ora la nuova password.'
                  : 'Inserisci numero utenza e password per consultare consumi, fatture e dettagli del contratto.'}
              </p>
            </div>

            {isResetMode ? (
              <form
                className="reset-form"
                onSubmit={resetStep === 'identity' ? handlePasswordResetIdentity : handlePasswordReset}
              >
                {resetStep === 'identity' ? (
                  <>
                    <label>
                      Numero utenza
                      <input
                        inputMode="text"
                        value={resetForm.numeroUtenza}
                        onChange={(event) =>
                          updateResetField('numeroUtenza', event.target.value.replace(/\s+/g, ''))
                        }
                        placeholder="40010001/2"
                        required
                      />
                    </label>
                    <label>
                      Cognome
                      <input
                        value={resetForm.cognome}
                        onChange={(event) => updateResetField('cognome', event.target.value)}
                        placeholder="Rossi"
                        required
                      />
                    </label>
                    <label>
                      Codice fiscale
                      <input
                        value={resetForm.fiscalCode}
                        onChange={(event) => updateResetField('fiscalCode', event.target.value.toUpperCase())}
                        placeholder="Come registrato in archivio"
                        required
                      />
                    </label>
                  </>
                ) : (
                  <>
                    <p className="form-message form-message-success">
                      Utenza verificata: {verifiedAccessIdentifier}
                    </p>
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
                      Conferma password
                      <input
                        type="password"
                        minLength={8}
                        value={confirmPassword}
                        onChange={(event) => setConfirmPassword(event.target.value)}
                        required
                      />
                    </label>
                  </>
                )}
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
                  <KeyRound size={18} />
                  {resetStatus === 'submitting'
                    ? resetStep === 'identity'
                      ? 'Verifica...'
                      : 'Salvataggio...'
                    : resetStep === 'identity'
                      ? 'Verifica dati'
                      : 'Salva nuova password'}
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
                    Numero utenza
                    <input
                      inputMode="text"
                      value={numeroUtenza}
                      onChange={(event) => setNumeroUtenza(event.target.value.replace(/\s+/g, ''))}
                      placeholder="40010001/2"
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
