import { Link } from 'react-router-dom';

export function NotFoundPage() {
  return (
    <main className="not-found-page">
      <h1>Pagina non trovata</h1>
      <p>Il percorso richiesto non esiste nel portale clienti.</p>
      <Link className="primary-button" to="/portal">
        Torna al portale
      </Link>
    </main>
  );
}
