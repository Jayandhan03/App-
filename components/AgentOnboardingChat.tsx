"use client";

import { useEffect, useRef, useState } from "react";

export type Msg = { role: "user" | "assistant"; content: string };
export type LockedTopic = {
  topic: string;
  summary: string;
  corePrompt: string;
  keywords: string[];
  region: string;
};

/** Raw shape returned by the FastAPI onboarding-chat endpoint (snake_case). */
type RawLocked = { topic: string; summary: string; core_prompt: string; keywords: string[]; region: string };

function toLocked(raw: RawLocked): LockedTopic {
  return { topic: raw.topic, summary: raw.summary, corePrompt: raw.core_prompt, keywords: raw.keywords ?? [], region: raw.region || "Global" };
}

/**
 * Leora's single-purpose onboarding chat: lock in what one agent should research.
 * Flow is enforced server-side (greet -> user request -> summary + 3 follow-ups ->
 * lock-in) with a hard turn cap, so this component never needs to worry about
 * the conversation running long — it just renders whatever comes back and
 * disables input once `locked` arrives.
 */
export default function AgentOnboardingChat({ seed, onLocked }: { seed?: string; onLocked: (locked: LockedTopic) => void }) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [locked, setLocked] = useState<LockedTopic | null>(null);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const started = useRef(false);
  const seedSent = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    void send([], true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  async function send(history: Msg[], isOpening = false) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/agents/onboarding-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error ?? "Something went wrong. Try again.");
        return;
      }
      if (data.reply) setMessages(prev => [...prev, { role: "assistant", content: data.reply }]);
      if (data.complete && data.locked) {
        const l = toLocked(data.locked);
        setLocked(l);
        onLocked(l);
      }
      if (!isOpening) setTimeout(() => inputRef.current?.focus(), 50);
      // Auto-forward a seeded suggestion once the greeting has arrived.
      if (isOpening && seed && seed.trim() && !seedSent.current) {
        seedSent.current = true;
        setTimeout(() => pushAndSend(seed), 250);
      }
    } catch {
      setError("Network error — please try again.");
    } finally {
      setLoading(false);
    }
  }

  function pushAndSend(text: string) {
    if (!text.trim() || loading || locked) return;
    const next: Msg[] = [...messages, { role: "user", content: text.trim() }];
    setMessages(next);
    setInput("");
    void send(next);
  }

  const userTurns = messages.filter(m => m.role === "user").length;

  return (
    <div>
      <div
        ref={scrollRef}
        className="col"
        style={{ gap: 10, maxHeight: 320, overflowY: "auto", padding: "2px 2px 6px" }}
      >
        {messages.map((m, i) => (
          <div key={i} className="row" style={{ gap: 8, alignItems: "flex-end", flexDirection: m.role === "user" ? "row-reverse" : "row" }}>
            {m.role === "assistant" && (
              <span className="row center" style={{ width: 26, height: 26, borderRadius: "50%", background: "var(--accent-soft)", color: "var(--accent)", fontSize: 13, flexShrink: 0 }}>✨</span>
            )}
            <div
              style={{
                maxWidth: "82%",
                padding: "10px 13px",
                borderRadius: "var(--r-md)",
                fontSize: "0.87rem",
                lineHeight: 1.5,
                whiteSpace: "pre-wrap",
                background: m.role === "user" ? "var(--accent)" : "var(--surface-2)",
                color: m.role === "user" ? "var(--solid-ink, #fff)" : "var(--ink)",
                border: m.role === "user" ? "none" : "1px solid var(--line)",
              }}
            >
              {m.content}
            </div>
          </div>
        ))}

        {loading && (
          <div className="row" style={{ gap: 8, alignItems: "flex-end" }}>
            <span className="row center" style={{ width: 26, height: 26, borderRadius: "50%", background: "var(--accent-soft)", color: "var(--accent)", fontSize: 13, flexShrink: 0 }}>✨</span>
            <div style={{ padding: "10px 13px", borderRadius: "var(--r-md)", background: "var(--surface-2)", border: "1px solid var(--line)" }}>
              <span className="spinner" style={{ width: 13, height: 13 }} />
            </div>
          </div>
        )}
      </div>

      {error && <div style={{ fontSize: "0.8rem", color: "var(--danger)", margin: "6px 2px" }}>{error}</div>}

      {locked ? (
        <div className="card" style={{ padding: 16, marginTop: 12, background: "var(--accent-soft)", borderColor: "var(--accent-line)", boxShadow: "none" }}>
          <div className="row" style={{ gap: 8, marginBottom: 6 }}>
            <span style={{ color: "var(--accent-ink)" }}>🔒</span>
            <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--accent-ink)" }}>Topic locked in</span>
          </div>
          <div style={{ fontSize: "0.86rem", color: "var(--ink-2)", lineHeight: 1.5 }}>{locked.summary}</div>
        </div>
      ) : (
        <div className="row" style={{ gap: 8, marginTop: 10 }}>
          <input
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && pushAndSend(input)}
            placeholder={userTurns === 0 ? "e.g. Latest news on US stocks I should watch…" : "Type your answer…"}
            disabled={loading}
            className="input"
            style={{ flex: 1, height: 44, fontSize: "0.87rem" }}
          />
          <button onClick={() => pushAndSend(input)} disabled={loading || !input.trim()} className="btn btn-primary btn-sm" style={{ height: 44, padding: "0 16px" }}>
            Send
          </button>
        </div>
      )}

      {!locked && userTurns > 0 && (
        <p className="t-muted" style={{ fontSize: "0.72rem", marginTop: 8 }}>Leora will lock this topic in as soon as you answer.</p>
      )}
    </div>
  );
}
