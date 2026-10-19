import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { createPortal } from 'react-dom';
import { ArrowUpRight, Bot, LoaderCircle, MessageCircle, RefreshCw, Send, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { askPortalAssistant } from '../services/api';

type Message = { id: number; role: 'assistant' | 'user'; text: string };
const suggestions = ['Qual è la mia ultima bolletta?', 'Dove trovo il PDF?', 'Qual è il mio ultimo consumo?'];

export function ChatWidget() {
  const [open, setOpen] = useState(false), [draft, setDraft] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [failedQuestion, setFailedQuestion] = useState('');
  const launcher = useRef<HTMLButtonElement>(null), dialog = useRef<HTMLDialogElement>(null);
  const heading = useRef<HTMLHeadingElement>(null), transcript = useRef<HTMLDivElement>(null);
  const request = useRef<AbortController | null>(null), timeout = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const mounted = useRef(true), sequence = useRef(0), sending = useRef(false);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; request.current?.abort(); clearTimeout(timeout.current); };
  }, []);
  useEffect(() => {
    if (!open || !dialog.current) return;
    const panel = dialog.current, trigger = launcher.current, priorOverflow = document.body.style.overflow;
    panel.showModal(); heading.current?.focus({ preventScroll: true });
    document.body.style.overflow = 'hidden';
    const fitViewport = () => {
      const viewport = window.visualViewport;
      const height = viewport?.height ?? window.innerHeight;
      const keyboard = Math.max(0, window.innerHeight - height - (viewport?.offsetTop ?? 0));
      panel.style.setProperty('--chat-max-height', `${Math.max(160, height - 110)}px`);
      if (keyboard > 80) panel.style.setProperty('--chat-bottom', `${keyboard + 12}px`);
      else panel.style.removeProperty('--chat-bottom');
    };
    fitViewport(); window.visualViewport?.addEventListener('resize', fitViewport); window.addEventListener('resize', fitViewport);
    return () => {
      panel.close(); document.body.style.overflow = priorOverflow;
      window.visualViewport?.removeEventListener('resize', fitViewport); window.removeEventListener('resize', fitViewport);
      trigger?.focus({ preventScroll: true });
    };
  }, [open]);
  useEffect(() => { const element = transcript.current; if (element) element.scrollTop = element.scrollHeight; }, [messages, busy, error, open]);

  async function send(question: string, retry = false) {
    const text = question.trim();
    if (!text || sending.current) return;
    sending.current = true; setBusy(true); setError(''); setFailedQuestion('');
    if (!retry) { setMessages(previous => [...previous, { id: ++sequence.current, role: 'user', text }]); setDraft(''); }
    const controller = new AbortController(); request.current = controller;
    timeout.current = setTimeout(() => controller.abort(), 45000);
    try {
      const answer = await askPortalAssistant(localStorage.getItem('portalToken') || '', text, controller.signal);
      if (mounted.current) setMessages(previous => [...previous, { id: ++sequence.current, role: 'assistant', text: answer }]);
    } catch (reason) {
      if (mounted.current) {
        setFailedQuestion(text);
        setError(controller.signal.aborted ? 'La risposta sta impiegando troppo tempo. Riprova.' : reason instanceof Error ? reason.message : 'Assistente non disponibile. Riprova tra poco.');
      }
    } finally { clearTimeout(timeout.current); sending.current = false; if (mounted.current) setBusy(false); }
  }
  function submit(event: FormEvent) { event.preventDefault(); void send(draft); }
  return <>
    <button ref={launcher} className="chat-launcher" type="button" aria-label="Apri assistente Idromardi" aria-haspopup="dialog" aria-expanded={open} onClick={() => setOpen(true)}><MessageCircle size={22} /><span>Assistente</span></button>
    {open && createPortal(<dialog ref={dialog} className="chat-widget" aria-labelledby="portal-chat-title" onCancel={() => setOpen(false)} onClick={event => {
      if (event.target === event.currentTarget) { const box = event.currentTarget.getBoundingClientRect(); if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) setOpen(false); }
    }}>
      <header className="chat-header"><div><span className="chat-avatar"><Bot size={23} /></span><div><h2 ref={heading} tabIndex={-1} id="portal-chat-title">Assistente Idromardi</h2><small>Il tuo assistente virtuale</small></div></div><button type="button" aria-label="Chiudi assistente" onClick={() => setOpen(false)}><X size={20} /></button></header>
      <div className="chat-messages" ref={transcript} role="log" aria-label="Conversazione con l'assistente" aria-live="polite" aria-relevant="additions text" aria-busy={busy}>
        <div className="chat-welcome"><span className="chat-welcome-icon"><Bot size={28} /></span><h3>Come posso aiutarti?</h3><p>Chiedimi informazioni sulle tue bollette, sui consumi o sulla tua utenza.</p></div>
        {messages.length === 0 && <div className="chat-suggestions">{suggestions.map(text => <button key={text} type="button" onClick={() => { void send(text); }}>{text}<ArrowUpRight size={16} /></button>)}</div>}
        {messages.map(message => <div key={message.id} className={`chat-message ${message.role}`}><span className="chat-message-label">{message.role === 'user' ? 'Tu' : 'Assistente'}</span>{message.text}</div>)}
        {busy && <div className="chat-message loading" role="status"><LoaderCircle className="spin" size={16} />Sto cercando una risposta…</div>}
        {error && <div className="chat-error" role="alert"><p>{error}</p><button type="button" onClick={() => { void send(failedQuestion, true); }}><RefreshCw size={15} />Riprova</button></div>}
      </div>
      <form className="chat-input-row" onSubmit={submit}><label className="visually-hidden" htmlFor="portal-chat-message">Messaggio all'assistente</label><input id="portal-chat-message" autoComplete="off" maxLength={2000} placeholder="Scrivi una domanda…" value={draft} onChange={event => setDraft(event.target.value)} /><button type="submit" disabled={!draft.trim() || busy} aria-label="Invia messaggio"><Send size={19} /></button></form>
      <footer className="chat-footer"><Link to="/portal/richieste" onClick={() => setOpen(false)}>Vuoi parlare con un operatore? Apri una richiesta <ArrowUpRight size={14} /></Link></footer>
    </dialog>, document.body)}
  </>;
}
