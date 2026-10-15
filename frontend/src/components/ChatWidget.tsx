import { MessageCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
export function ChatWidget() {
  return <Link className="chat-launcher" to="/portal/richieste" aria-label="Contatta gli operatori Idromardi" title="Le tue richieste e le risposte degli operatori"><MessageCircle size={22} /></Link>;
}
