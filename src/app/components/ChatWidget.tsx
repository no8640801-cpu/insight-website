"use client";

import { Fragment, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { Bot, Loader2, MessageCircle, Send, X } from "lucide-react";

type Message = { role: "user" | "bot"; text: string; error?: boolean };

const STORAGE_KEY = "insight-chat-history";
const WELCOME: Message = {
  role: "bot",
  text: "Hi! I'm the INSIGHT assistant. Tell me about your business and I'll help you choose the right analysis, explain our plans, or guide you around the site.",
};

/** Tiny renderer: **bold** support, everything else stays plain text */
function renderText(text: string) {
  return text.split("**").map((part, index) =>
    index % 2 === 1 ? (
      <strong key={index}>{part}</strong>
    ) : (
      <Fragment key={index}>{part}</Fragment>
    )
  );
}

export default function ChatWidget() {
  const pathname = usePathname();

  const [signedIn, setSignedIn] = useState(false);
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([WELCOME]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  // Show the widget only to signed-in customers (both Standard and Pro)
  useEffect(() => {
    let cancelled = false;

    fetch("/api/chatbot", { cache: "no-store" })
      .then((response) => {
        if (!cancelled) setSignedIn(response.ok);
      })
      .catch(() => {
        if (!cancelled) setSignedIn(false);
      });

    return () => {
      cancelled = true;
    };
  }, [pathname]);

  // Restore the conversation after a page reload
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) setMessages(parsed);
      }
    } catch {
      // storage can be unavailable: start fresh
    }
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-40)));
    } catch {
      // ignore
    }
  }, [messages, loaded]);

  // A different customer must never see the previous customer's chat
  useEffect(() => {
    if (!signedIn && loaded) {
      setOpen(false);
      setMessages([WELCOME]);
      try {
        sessionStorage.removeItem(STORAGE_KEY);
      } catch {
        // ignore
      }
    }
  }, [signedIn, loaded]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sending, open]);

  async function handleSend() {
    const text = input.trim();
    if (!text || sending) return;

    setMessages((current) => [...current, { role: "user", text }]);
    setInput("");
    setSending(true);

    try {
      const response = await fetch("/api/chatbot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
      });
      const data = await response.json();

      if (!response.ok || !data.reply) {
        throw new Error(data.error || "The assistant is unavailable.");
      }

      setMessages((current) => [...current, { role: "bot", text: data.reply }]);
    } catch (err) {
      setMessages((current) => [
        ...current,
        {
          role: "bot",
          error: true,
          text:
            err instanceof Error
              ? err.message
              : "Something went wrong. Please try again.",
        },
      ]);
    } finally {
      setSending(false);
    }
  }

  if (!signedIn) return null;

  return (
    <>
      {open && (
        <section className="chat-panel" aria-label="INSIGHT assistant">
          <header className="chat-header">
            <span className="chat-header-icon">
              <Bot size={18} />
            </span>
            <div>
              <strong>INSIGHT Assistant</strong>
              <small>Ask me anything about the platform</small>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close chat"
            >
              <X size={18} />
            </button>
          </header>

          <div className="chat-messages">
            {messages.map((message, index) => (
              <div
                key={index}
                dir="auto"
                className={`chat-bubble ${message.role} ${
                  message.error ? "error" : ""
                }`}
              >
                {renderText(message.text)}
              </div>
            ))}

            {sending && (
              <div className="chat-bubble bot typing">
                <Loader2 size={15} className="plan-spinner" />
                Typing...
              </div>
            )}

            <div ref={endRef} />
          </div>

          <form
            className="chat-input-row"
            onSubmit={(event) => {
              event.preventDefault();
              handleSend();
            }}
          >
            <textarea
              dir="auto"
              rows={1}
              value={input}
              placeholder="Type your message..."
              maxLength={2000}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  handleSend();
                }
              }}
            />
            <button
              type="submit"
              disabled={sending || input.trim().length === 0}
              aria-label="Send message"
            >
              <Send size={17} />
            </button>
          </form>
        </section>
      )}

      <button
        type="button"
        className="chat-fab"
        onClick={() => setOpen((value) => !value)}
        aria-label={open ? "Close assistant" : "Open assistant"}
      >
        {open ? <X size={32} /> : <MessageCircle size={32} />}
      </button>
    </>
  );
}
