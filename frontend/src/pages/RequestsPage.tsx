import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeft, MessageCircle, Plus, RefreshCw, Send } from 'lucide-react';
import { supportApi } from '../services/supportApi';
import '../support.css';

type Request = { id: string; subject: string; status: string; category: string; version: number; updated_at: string; unread?: number };
type Message = { id: string; sender: string; body: string; created_at: string };
type Thread = { request: Request; messages: Message[]; hasMore: boolean };
type Link = { id: string; number: number; interno: string; building: string };
const statuses: Record<string, string> = { NEW: 'Ricevuta', IN_PROGRESS: 'In lavorazione', WAITING_CUSTOMER: 'In attesa della tua risposta', RESOLVED: 'Risolta' };
const categories: Record<string, string> = { BILLING: 'Bollette e pagamenti', READING: 'Letture e contatori', PROFILE: 'Profilo e accesso', OTHER: 'Altra richiesta' };
const date = (value: string) => new Date(value.replace(' ', 'T')).toLocaleString('it-IT', { dateStyle: 'short', timeStyle: 'short' });
const errorText = (reason: unknown) => reason instanceof Error ? reason.message : 'Operazione non disponibile. Riprova.';
function mergeThread(current: Thread | null, next: Thread): Thread {
  if (!current || current.request.id !== next.request.id) return next;
  if (current.request.version > next.request.version) return current;
  const first = next.messages[0];
  const older = first ? current.messages.filter(message => message.created_at < first.created_at || (message.created_at === first.created_at && message.id < first.id)) : [];
  return older.length ? { ...next, messages: [...older, ...next.messages], hasMore: current.hasMore } : next;
}

export function RequestsPage() {
  const [items, setItems] = useState<Request[]>([]), [total, setTotal] = useState(0), [page, setPage] = useState(1);
  const [selected, setSelected] = useState(''), [thread, setThread] = useState<Thread | null>(null);
  const [reply, setReply] = useState(''), [error, setError] = useState(''), [busy, setBusy] = useState(false), [loading, setLoading] = useState(true);
  const [links, setLinks] = useState<Link[]>([]), [compose, setCompose] = useState(false);
  const [subject, setSubject] = useState(''), [body, setBody] = useState(''), [category, setCategory] = useState('BILLING'), [utenzaId, setUtenzaId] = useState('');
  const dialog = useRef<HTMLDialogElement>(null);
  const retry = useRef<{ key: string; id: string } | null>(null), sendRetry = useRef<{ key: string; id: string } | null>(null);
  const selectedRef = useRef(selected); selectedRef.current = selected;
  const loadList = useCallback(async (signal?: AbortSignal) => {
    const result = await supportApi<{ items: Request[]; total: number }>(`requests?page=${page}`, undefined, signal);
    if (!signal?.aborted) { setItems(result.items); setTotal(result.total); }
  }, [page]);
  const loadListRef = useRef(loadList); loadListRef.current = loadList;
  useEffect(() => {
    const controller = new AbortController(); setLoading(true);
    void loadList(controller.signal).catch(reason => { if (!controller.signal.aborted) setError(errorText(reason)); }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    const timer = window.setInterval(() => { if (document.visibilityState === 'visible') void loadList(controller.signal).catch(() => {}); }, 20000);
    return () => { controller.abort(); window.clearInterval(timer); };
  }, [loadList]);
  useEffect(() => {
    const controller = new AbortController();
    void supportApi<{ links: Link[] }>('identity', undefined, controller.signal).then(value => { if (!controller.signal.aborted) setLinks(value.links); }).catch(reason => { if (!controller.signal.aborted) setError(errorText(reason)); });
    return () => controller.abort();
  }, []);
  useEffect(() => {
    setThread(null); setReply(''); sendRetry.current = null;
    if (!selected) return; const controller = new AbortController();
    const load = async () => {
      const value = await supportApi<Thread>(`requests/${selected}`, undefined, controller.signal);
      if (controller.signal.aborted) return;
      setThread(current => mergeThread(current, value));
      if (value.messages.length) await supportApi(`requests/${selected}/read`, { messageId: value.messages.at(-1)!.id }, controller.signal);
      await loadListRef.current(controller.signal);
    };
    void load().catch(reason => { if (!controller.signal.aborted) setError(errorText(reason)); });
    const timer = window.setInterval(() => { if (document.visibilityState === 'visible') void load().catch(() => {}); }, 15000);
    return () => { controller.abort(); window.clearInterval(timer); };
  }, [selected]);
  useEffect(() => { if (compose) dialog.current?.showModal(); else dialog.current?.close(); }, [compose]);
  async function create() {
    if (busy || !subject.trim() || !body.trim()) return; setBusy(true); setError('');
    const key = JSON.stringify([subject.trim(), body.trim(), category, utenzaId]);
    if (retry.current?.key !== key) retry.current = { key, id: crypto.randomUUID() };
    try {
      const value = await supportApi<Thread>('requests', { id: retry.current.id, subject: subject.trim(), body: body.trim(), category, utenzaId: utenzaId || null });
      setCompose(false); setSelected(value.request.id); setSubject(''); setBody(''); retry.current = null; await loadList();
    } catch (reason) { setError(errorText(reason)); } finally { setBusy(false); }
  }
  async function send() {
    if (!reply.trim() || !thread || busy) return; const id = selected, key = JSON.stringify([id, reply.trim()]);
    if (sendRetry.current?.key !== key) sendRetry.current = { key, id: crypto.randomUUID() }; setBusy(true); setError('');
    try {
      const value = await supportApi<Thread>(`requests/${id}/messages`, { id: sendRetry.current.id, body: reply.trim() });
      if (selectedRef.current === id) { setThread(current => mergeThread(current, value)); setReply(''); sendRetry.current = null; } await loadList();
    } catch (reason) { setError(errorText(reason)); } finally { setBusy(false); }
  }
  async function earlier() {
    if (!thread?.messages.length || busy) return; const id = selected; setBusy(true);
    try { const value = await supportApi<Thread>(`requests/${id}?before=${thread.messages[0].id}`);
      if (selectedRef.current === id) setThread(current => current ? { ...current, hasMore: value.hasMore, messages: [...value.messages, ...current.messages] } : current);
    } catch (reason) { setError(errorText(reason)); } finally { setBusy(false); }
  }
  return <main className="customer-support-page">
    <header className="customer-support-heading"><div><p className="eyebrow">Assistenza Idromardi</p><h1>Le tue richieste</h1><p>Scrivi agli operatori e segui le risposte nel tuo portale.</p></div><button onClick={() => { setError(''); setCompose(true); }} disabled={busy}><Plus size={16} /> Nuova richiesta</button></header>
    {error && <div role="alert" className="customer-support-error">{error}<button onClick={() => void loadList().catch(reason => setError(errorText(reason)))}><RefreshCw size={14} /> Riprova</button></div>}
    <div className={`customer-support-workspace ${selected ? 'has-selection' : ''}`}>
      <section className="customer-support-list" aria-label="Elenco richieste">{items.map(item => <button key={item.id} aria-pressed={selected === item.id} disabled={busy} onClick={() => { setSelected(item.id); setError(''); }}><strong>{item.subject}</strong>{Number(item.unread) > 0 && <span className="customer-support-unread">Nuova risposta</span>}<small>{categories[item.category]} · {date(item.updated_at)}</small><span className={`customer-support-status ${item.status}`}>{statuses[item.status]}</span></button>)}
        {!items.length && <div className="customer-support-empty"><MessageCircle size={30} /><p>{loading ? 'Caricamento richieste…' : 'Non hai ancora richieste. Scrivici quando hai bisogno di assistenza.'}</p></div>}
        <footer><span>{total} richieste · Pagina {page}</span><div><button disabled={page <= 1 || loading} onClick={() => setPage(value => value - 1)}>Precedente</button><button disabled={page * 25 >= total || loading} onClick={() => setPage(value => value + 1)}>Successiva</button></div></footer>
      </section>
      <section className="customer-support-thread" aria-label="Conversazione con Idromardi">{!thread ? <div className="customer-support-empty"><MessageCircle size={30} /><h2>{selected ? 'Caricamento conversazione…' : 'Seleziona una richiesta'}</h2><p>Qui troverai i messaggi e le risposte degli operatori.</p></div> : <><header><button className="customer-support-back" onClick={() => setSelected('')}><ArrowLeft size={16} /> Elenco</button><h2>{thread.request.subject}</h2><span className={`customer-support-status ${thread.request.status}`}>{statuses[thread.request.status]}</span></header>
        <div className="customer-support-messages" aria-label="Messaggi assistenza">{thread.hasMore && <button disabled={busy} onClick={() => void earlier()}>Messaggi precedenti</button>}{thread.messages.map(message => <article key={message.id} className={message.sender}><header><strong>{message.sender === 'CUSTOMER' ? 'Tu' : 'Idromardi'}</strong><time>{date(message.created_at)}</time></header><p>{message.body}</p></article>)}</div>
        <form onSubmit={event => { event.preventDefault(); void send(); }}><label htmlFor="customer-reply">{thread.request.status === 'RESOLVED' ? 'Hai ancora bisogno? Un nuovo messaggio riaprirà la richiesta.' : 'Aggiungi un messaggio'}</label><textarea id="customer-reply" maxLength={4000} disabled={busy} value={reply} onChange={event => setReply(event.target.value)} placeholder="Scrivi agli operatori…" /><button type="submit" disabled={busy || !reply.trim()}><Send size={15} /> Invia messaggio</button></form>
      </>}</section>
    </div>
    <dialog ref={dialog} className="customer-support-dialog" onCancel={event => { if (busy) event.preventDefault(); else setCompose(false); }}><form onSubmit={event => { event.preventDefault(); void create(); }}><header><h2>Nuova richiesta</h2><button type="button" disabled={busy} aria-label="Chiudi nuova richiesta" onClick={() => setCompose(false)}>×</button></header>
      {error && <p role="alert">{error}</p>}<label>Oggetto<input required maxLength={160} value={subject} disabled={busy} onChange={event => setSubject(event.target.value)} placeholder="Come possiamo aiutarti?" /></label><label>Argomento<select value={category} disabled={busy} onChange={event => setCategory(event.target.value)}>{Object.entries(categories).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
      <label>Utenza<select value={utenzaId} disabled={busy} onChange={event => setUtenzaId(event.target.value)}><option value="">Tutte le mie utenze / richiesta generale</option>{links.map(link => <option key={link.id} value={link.id}>Utenza {link.number} · Interno {link.interno || '—'} · {link.building}</option>)}</select></label>
      <label>Messaggio<textarea required maxLength={4000} value={body} disabled={busy} onChange={event => setBody(event.target.value)} placeholder="Descrivi la richiesta. Per una bolletta, indica il periodo." /></label><footer><small>La richiesta sarà letta dagli operatori Idromardi.</small><button type="submit" disabled={busy || !subject.trim() || !body.trim()}><Send size={15} /> Invia richiesta</button></footer>
    </form></dialog>
  </main>;
}
