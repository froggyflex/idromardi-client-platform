import { useMemo, useState } from "react";
import { Bot, Loader2, MessageCircle, Send, X } from "lucide-react";
import { askPortalAssistant } from "../services/api";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

export function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content:
        "Ciao, sono l'assistente Idromardi. Posso aiutarti con bollette, consumi, letture e documenti disponibili nel portale.",
    },
  ]);
  const [loading, setLoading] = useState(false);

  const token = useMemo(
    () => window.localStorage.getItem("portalToken") || "",
    []
  );

  async function handleSend() {
    const message = input.trim();

    if (!message || loading) return;

    setMessages((current) => [
      ...current,
      { role: "user", content: message },
    ]);
    setInput("");
    setLoading(true);

    try {
      const answer = await askPortalAssistant(token, message);

      setMessages((current) => [
        ...current,
        { role: "assistant", content: answer },
      ]);
    } catch (error) {
      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          content:
            error instanceof Error
              ? error.message
              : "Non sono riuscito a rispondere in questo momento.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        className="chat-launcher"
        type="button"
        onClick={() => setIsOpen(true)}
      >
        <MessageCircle size={22} />
      </button>

      {isOpen && (
        <section className="chat-widget">
          <header className="chat-header">
            <div>
              <span className="chat-avatar">
                <Bot size={18} />
              </span>
              <div>
                <strong>Assistente Idromardi</strong>
                <small>Bollette, consumi e documenti</small>
              </div>
            </div>

            <button type="button" onClick={() => setIsOpen(false)}>
              <X size={18} />
            </button>
          </header>

          <div className="chat-messages">
            {messages.map((message, index) => (
              <div
                key={`${message.role}-${index}`}
                className={`chat-message ${message.role}`}
              >
                {message.content}
              </div>
            ))}

            {loading && (
              <div className="chat-message assistant loading">
                <Loader2 size={16} className="spin" />
                Sto controllando i tuoi dati...
              </div>
            )}
          </div>

          <form
            className="chat-input-row"
            onSubmit={(event) => {
              event.preventDefault();
              void handleSend();
            }}
          >
            <input
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Scrivi una domanda..."
            />

            <button type="submit" disabled={!input.trim() || loading}>
              <Send size={17} />
            </button>
          </form>
        </section>
      )}
    </>
  );
}