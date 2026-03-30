"use client";

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MessageCircle, Send, X } from "lucide-react";
import { useAuthStore } from "@/store/authStore";

type ChatSender = "customer" | "support";

interface ChatMessage {
  id: string;
  sender: ChatSender;
  text: string;
  createdAt: number;
}

const STORAGE_KEY = "customer_support_chat_v1";
const CHAT_ENDPOINT = process.env.NEXT_PUBLIC_SUPPORT_CHAT_ENDPOINT;
const QUICK_ACTIONS = [
  "I need help with my order",
  "Payment is not confirmed",
  "I need product details",
];

function createMessage(sender: ChatSender, text: string): ChatMessage {
  return {
    id:
      typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    sender,
    text,
    createdAt: Date.now(),
  };
}

function getDefaultMessages(): ChatMessage[] {
  return [
    createMessage(
      "support",
      "Hi! Welcome to support. Tell us your issue and we will help you shortly. Do not share wallet seed phrases or private keys.",
    ),
  ];
}

function formatTime(value: number): string {
  return new Intl.DateTimeFormat(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function getFallbackReply(text: string): string {
  const input = text.toLowerCase();
  if (input.includes("order")) {
    return "Please share your Order ID so we can check the latest status for you.";
  }
  if (input.includes("payment") || input.includes("tx") || input.includes("transaction")) {
    return "Please send the transaction hash and network used. We will verify the payment status.";
  }
  if (input.includes("refund")) {
    return "Please share your Order ID and reason for refund. Our support team will review it.";
  }
  return "Thanks for your message. A support agent will follow up soon. You can also include your Order ID for faster help.";
}

async function getSupportReply(input: string, customer: { name?: string; email?: string } | null) {
  if (CHAT_ENDPOINT) {
    try {
      const response = await fetch(CHAT_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: input,
          customerName: customer?.name || undefined,
          customerEmail: customer?.email || undefined,
          source: "customer-web",
        }),
      });

      if (response.ok) {
        const payload = (await response.json()) as
          | { reply?: string; message?: string; data?: { reply?: string; message?: string } }
          | undefined;

        const reply =
          payload?.reply?.trim() ||
          payload?.message?.trim() ||
          payload?.data?.reply?.trim() ||
          payload?.data?.message?.trim();

        if (reply) return reply;
      }
    } catch {
      // Fallback to local reply when endpoint is unavailable.
    }
  }

  return getFallbackReply(input);
}

export default function ChatSupportWidget() {
  const customer = useAuthStore((state) => state.user);
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>(getDefaultMessages);
  const [draft, setDraft] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [ready, setReady] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as ChatMessage[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          const sanitized = parsed
            .filter(
              (item) =>
                item &&
                (item.sender === "customer" || item.sender === "support") &&
                typeof item.text === "string" &&
                typeof item.createdAt === "number",
            )
            .slice(-50);
          if (sanitized.length > 0) setMessages(sanitized);
        }
      }
    } catch {
      // Ignore localStorage read errors.
    } finally {
      setReady(true);
    }
  }, []);

  useEffect(() => {
    if (!ready) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-50)));
  }, [messages, ready]);

  useEffect(() => {
    if (!isOpen) return;
    setUnreadCount(0);
    inputRef.current?.focus();
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isSending, isOpen]);

  useEffect(() => {
    const onKeydown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    window.addEventListener("keydown", onKeydown);
    return () => window.removeEventListener("keydown", onKeydown);
  }, []);

  const appendMessage = useCallback(
    (sender: ChatSender, text: string) => {
      setMessages((prev) => [...prev, createMessage(sender, text)].slice(-50));
      if (sender === "support" && !isOpen) {
        setUnreadCount((count) => count + 1);
      }
    },
    [isOpen],
  );

  const sendMessage = useCallback(
    async (value: string) => {
      const content = value.trim();
      if (!content || isSending) return;

      appendMessage("customer", content);
      setDraft("");
      setIsSending(true);

      try {
        const reply = await getSupportReply(content, customer);
        appendMessage("support", reply);
      } finally {
        setIsSending(false);
      }
    },
    [appendMessage, customer, isSending],
  );

  const hasOnlyGreeting = useMemo(
    () => messages.every((message) => message.sender === "support"),
    [messages],
  );

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await sendMessage(draft);
  };

  const onQuickAction = async (text: string) => {
    await sendMessage(text);
  };

  return (
    <div className="fixed bottom-5 right-5 z-[70]">
      {!isOpen && (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="relative inline-flex h-14 w-14 items-center justify-center rounded-full border border-cyan-300/40 bg-gradient-to-br from-cyan-500 to-blue-600 text-white shadow-xl shadow-cyan-900/40 transition-transform hover:scale-105"
          aria-label="Open support chat"
        >
          <MessageCircle size={22} />
          {unreadCount > 0 && (
            <span className="absolute -right-1 -top-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">
              {Math.min(unreadCount, 9)}
            </span>
          )}
        </button>
      )}

      {isOpen && (
        <section className="w-[min(92vw,360px)] overflow-hidden rounded-2xl border border-slate-700/80 bg-slate-900/95 shadow-2xl shadow-black/40 backdrop-blur-md">
          <header className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
            <div>
              <h2 className="text-sm font-semibold text-white">Support Chat</h2>
              <p className="text-[11px] text-emerald-400">Customer help desk</p>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-800 hover:text-white"
              aria-label="Close support chat"
            >
              <X size={16} />
            </button>
          </header>

          <div className="max-h-[380px] min-h-[300px] space-y-3 overflow-y-auto px-3 py-3">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.sender === "customer" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-3 py-2 ${
                    message.sender === "customer"
                      ? "rounded-br-md bg-cyan-600 text-white"
                      : "rounded-bl-md border border-slate-700 bg-slate-800 text-slate-100"
                  }`}
                >
                  <p className="text-xs leading-5">{message.text}</p>
                  <p className="mt-1 text-[10px] opacity-75">{formatTime(message.createdAt)}</p>
                </div>
              </div>
            ))}

            {isSending && (
              <div className="flex justify-start">
                <div className="rounded-2xl rounded-bl-md border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-slate-200">
                  Support is typing...
                </div>
              </div>
            )}

            <div ref={endRef} />
          </div>

          {hasOnlyGreeting && (
            <div className="border-t border-slate-800 px-3 py-2">
              <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-slate-400">
                Quick help
              </p>
              <div className="flex flex-wrap gap-2">
                {QUICK_ACTIONS.map((action) => (
                  <button
                    key={action}
                    type="button"
                    onClick={() => void onQuickAction(action)}
                    className="rounded-full border border-slate-700 bg-slate-800 px-3 py-1.5 text-[11px] text-slate-200 transition-colors hover:border-cyan-500/50 hover:text-white"
                  >
                    {action}
                  </button>
                ))}
              </div>
            </div>
          )}

          <form onSubmit={onSubmit} className="border-t border-slate-800 p-3">
            <div className="flex items-center gap-2">
              <input
                ref={inputRef}
                type="text"
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                placeholder="Type your message..."
                className="h-10 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 text-sm text-white placeholder:text-slate-500 focus:border-cyan-500 focus:outline-none"
              />
              <button
                type="submit"
                disabled={isSending || !draft.trim()}
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-600 text-white transition-colors hover:bg-cyan-500 disabled:cursor-not-allowed disabled:opacity-40"
                aria-label="Send message"
              >
                <Send size={16} />
              </button>
            </div>
          </form>
        </section>
      )}
    </div>
  );
}
