"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import AppNav from "@/components/AppNav";

function TgIcon({ size = 16, color = "currentColor" }: { size?: number; color?: string }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill={color}><path d="M20.665 3.717l-17.73 6.837c-1.21.486-1.203 1.161-.222 1.462l4.552 1.42 10.532-6.645c.498-.303.953-.14.579.192l-8.533 7.701-.314 4.692c.46 0 .663-.211.921-.46l2.211-2.15 4.599 3.397c.848.467 1.457.227 1.668-.787l3.019-14.228c.309-1.239-.473-1.8-1.282-1.432z" /></svg>;
}

function Waveform({ active }: { active: boolean }) {
  return (
    <div className="row" style={{ gap: 3, height: 40 }}>
      {Array.from({ length: 40 }).map((_, i) => (
        <span key={i} style={{
          width: 3, borderRadius: 99, background: "var(--accent)",
          animationDelay: `${(i * 0.05) % 1.3}s`,
          height: active ? `${Math.floor(Math.random() * 26 + 8)}px` : "5px",
          transition: "height 0.4s ease",
          animation: active ? "wave 1.1s ease-in-out infinite alternate" : "none",
          opacity: active ? 1 : 0.3,
        }} />
      ))}
    </div>
  );
}

const LANGS = [
  { code: "en", label: "English", speech: "en-US", sample: "Here's your latest audio briefing from Leora." },
  { code: "es", label: "Español", speech: "es-ES", sample: "Aquí tienes tu resumen más reciente de Leora." },
  { code: "hi", label: "हिन्दी", speech: "hi-IN", sample: "यह Leora की आपकी ताज़ा ऑडियो ब्रीफ़िंग है।" },
  { code: "fr", label: "Français", speech: "fr-FR", sample: "Voici votre dernier briefing audio de Leora." },
  { code: "de", label: "Deutsch", speech: "de-DE", sample: "Hier ist dein aktuelles Audio-Briefing von Leora." },
  { code: "pt", label: "Português", speech: "pt-BR", sample: "Aqui está o seu briefing de áudio mais recente da Leora." },
  { code: "ar", label: "العربية", speech: "ar-SA", sample: "إليك أحدث ملخص صوتي من ليورا." },
  { code: "ja", label: "日本語", speech: "ja-JP", sample: "Leoraからの最新の音声ブリーフィングです。" },
];
const TONES = [
  { name: "Analytical", rate: 1.0, pitch: 1.0 },
  { name: "Conversational", rate: 1.05, pitch: 1.06 },
  { name: "Energetic", rate: 1.18, pitch: 1.22 },
  { name: "Calm", rate: 0.9, pitch: 0.95 },
];
type Step = 0 | 1 | 2 | 3 | 4;
const STEP_LABELS: Record<number, string> = { 1: "Scanning the web…", 2: "Cross-checking & summarizing…", 3: "Composing your audio briefing…", 4: "Ready." };
const STEP_STAGES = [{ n: 1, label: "Scan" }, { n: 2, label: "Analyze" }, { n: 3, label: "Compose" }];

export default function Ask() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [topic, setTopic] = useState("");
  const [step, setStep] = useState<Step>(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioName, setAudioName] = useState("briefing.mp3");
  const [error, setError] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  const [lang, setLang] = useState("en");
  const [tone, setTone] = useState("Analytical");
  const [voiceTesting, setVoiceTesting] = useState(false);

  const [tgConnected, setTgConnected] = useState(false);
  const [tgSending, setTgSending] = useState(false);
  const [tgSent, setTgSent] = useState(false);
  const [tgError, setTgError] = useState<string | null>(null);

  useEffect(() => { if (status === "unauthenticated") router.replace("/signin"); }, [status, router]);

  // Prefill from dashboard "Ask" bar (?q=)
  useEffect(() => {
    try { const q = new URLSearchParams(window.location.search).get("q"); if (q) setTopic(q); } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    (async () => {
      try { const res = await fetch("/api/telegram-auth"); if (res.ok) { const d = await res.json(); if (d.connected) setTgConnected(true); } } catch { /* silent */ }
    })();
  }, []);

  const isLoading = step > 0 && step < 4;

  const handleGenerate = async () => {
    const q = topic.trim();
    if (!q || isLoading) return;
    setStep(1); setAudioUrl(null); setError(null);
    try {
      const t1 = setTimeout(() => setStep(2), 3000);
      const t2 = setTimeout(() => setStep(3), 8000);
      const res = await fetch("/api/news-audio", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ topic: q, limit: 5, voice_id: lang, model_id: "", tone }) });
      clearTimeout(t1); clearTimeout(t2);
      if (!res.ok) { const err = await res.json().catch(() => ({ error: "Unknown error" })); setError(err.error ?? "Generation failed. Please try again."); setStep(0); return; }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const disp = res.headers.get("Content-Disposition") ?? "";
      const match = disp.match(/filename="?([^"]+)"?/);
      setAudioUrl(url); setAudioName(match ? match[1] : `${q.replace(/\s+/g, "_")}_brief.mp3`); setStep(4);
    } catch (e: any) { setError(e.message ?? "Network error."); setStep(0); }
  };

  const handleDownload = () => { if (!audioUrl) return; Object.assign(document.createElement("a"), { href: audioUrl, download: audioName }).click(); };

  const handleSendTelegram = async () => {
    if (!audioUrl || tgSending) return;
    setTgSending(true); setTgError(null); setTgSent(false);
    try {
      const audioBlob = await fetch(audioUrl).then(r => r.blob());
      const fd = new FormData(); fd.append("audio", audioBlob, audioName); fd.append("topic", topic);
      const res = await fetch("/api/send-telegram", { method: "POST", body: fd });
      if (!res.ok) { const err = await res.json().catch(() => ({ error: "Failed to send" })); setTgError(err.error ?? "Failed to send to Telegram"); }
      else { setTgSent(true); setTimeout(() => setTgSent(false), 4000); }
    } catch (e: any) { setTgError(e.message ?? "Network error"); } finally { setTgSending(false); }
  };

  const testVoice = () => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    if (voiceTesting) { window.speechSynthesis.cancel(); setVoiceTesting(false); return; }
    const l = LANGS.find(x => x.code === lang) ?? LANGS[0];
    const t = TONES.find(x => x.name === tone) ?? TONES[0];
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(l.sample); u.lang = l.speech; u.rate = t.rate; u.pitch = t.pitch;
    const m = window.speechSynthesis.getVoices().find(v => v.lang?.toLowerCase().startsWith(l.speech.slice(0, 2).toLowerCase()));
    if (m) u.voice = m;
    u.onend = () => setVoiceTesting(false); u.onerror = () => setVoiceTesting(false);
    setVoiceTesting(true); window.speechSynthesis.speak(u);
  };

  const progressWidth = step === 1 ? "25%" : step === 2 ? "58%" : step === 3 ? "84%" : "100%";

  if (status === "loading" || status === "unauthenticated") {
    return <div className="row center" style={{ minHeight: "100vh" }}><span className="spinner" /></div>;
  }

  const chip = (on: boolean): React.CSSProperties => ({
    padding: "7px 14px", borderRadius: "var(--r-full)", fontSize: "0.82rem", fontWeight: 500, cursor: isLoading ? "not-allowed" : "pointer",
    background: on ? "var(--accent-soft)" : "var(--surface-2)", border: `1px solid ${on ? "var(--accent-line)" : "var(--line)"}`,
    color: on ? "var(--accent-ink)" : "var(--ink-2)", transition: "all 0.16s var(--ease)",
  });

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)" }}>
      <AppNav />
      <div style={{ position: "relative", overflow: "hidden" }}>
        <div className="aurora" aria-hidden="true" />
        <main className="container" style={{ maxWidth: 720, padding: "52px 24px 96px", position: "relative" }}>
          <div className="rise" style={{ marginBottom: 32, textAlign: "center" }}>
            <div className="badge badge-accent" style={{ marginBottom: 18 }}><span className="dot dot-live" /> Live web · on demand</div>
            <h1 className="t-h1" style={{ marginBottom: 14 }}>Ask, and get <span className="serif" style={{ fontSize: "1.05em", color: "var(--accent)" }}>a voice note.</span></h1>
            <p className="t-lead" style={{ maxWidth: 540, margin: "0 auto" }}>Name any topic. An agent reads the latest across the web and sends you a studio-quality voice note — in your language and voice, in seconds. It&apos;s exactly what your deployed agents deliver on autopilot.</p>
          </div>

          <div className="card rise-1" style={{ padding: 28, borderRadius: "var(--r-xl)", boxShadow: "var(--shadow-lg)" }}>
            {/* Ask input */}
            <div className="ask-compose" style={{ display: "flex", gap: 10, marginBottom: 24 }}>
              <input
                autoFocus value={topic} onChange={e => setTopic(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleGenerate()} disabled={isLoading}
                placeholder="e.g. What changed in AI chips this week?"
                className="input" style={{ height: 52, fontSize: "0.95rem", borderRadius: "var(--r-md)" }}
              />
              <button onClick={handleGenerate} disabled={isLoading || !topic.trim()} className="btn btn-primary btn-lg" style={{ flexShrink: 0 }}>
                {isLoading ? <><span className="spinner" style={{ width: 15, height: 15, borderTopColor: "var(--solid-ink)" }} /> Working…</> : "Generate brief"}
              </button>
            </div>

            {/* Language */}
            <div style={{ marginBottom: 18 }}>
              <div className="eyebrow no-rule" style={{ marginBottom: 10 }}>Language</div>
              <div className="row wrap" style={{ gap: 8 }}>
                {LANGS.map(l => <button key={l.code} type="button" disabled={isLoading} onClick={() => setLang(l.code)} style={chip(lang === l.code)}>{l.label}</button>)}
              </div>
            </div>

            {/* Voice tone */}
            <div style={{ marginBottom: 24 }}>
              <div className="row between" style={{ marginBottom: 10 }}>
                <div className="eyebrow no-rule">Voice</div>
                <button type="button" onClick={testVoice} className="btn btn-ghost btn-sm" style={{ color: "var(--accent-ink)" }}>
                  {voiceTesting ? "◼ Stop preview" : "▶ Preview voice"}
                </button>
              </div>
              <div className="row wrap" style={{ gap: 8 }}>
                {TONES.map(t => <button key={t.name} type="button" disabled={isLoading} onClick={() => setTone(t.name)} style={chip(tone === t.name)}>{t.name}</button>)}
              </div>
            </div>

            {/* Progress */}
            {(isLoading || step === 4) && (
              <div className="col" style={{ gap: 12, marginBottom: 22, animation: "riseSm 0.3s var(--ease) both" }}>
                <div className="row wrap" style={{ gap: 8 }}>
                  {STEP_STAGES.map(({ n, label }) => {
                    const done = step > n, active = step === n;
                    return (
                      <span key={n} className={`badge ${done ? "badge-accent" : active ? "badge-info" : "badge-muted"}`}>
                        {done ? "✓" : active ? <span className="spinner" style={{ width: 12, height: 12 }} /> : n} {label}
                      </span>
                    );
                  })}
                </div>
                <div style={{ height: 5, borderRadius: 99, background: "var(--surface-3)", overflow: "hidden" }}>
                  <div style={{ height: "100%", borderRadius: 99, background: "linear-gradient(90deg, var(--accent-strong), var(--accent))", width: progressWidth, transition: "width 0.6s var(--ease)" }} />
                </div>
                <span className="thinking" style={{ fontSize: "0.82rem", fontWeight: 500 }}>{STEP_LABELS[step]}</span>
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="card" style={{ padding: "14px 16px", marginBottom: 20, background: "var(--danger-soft)", borderColor: "var(--danger)", boxShadow: "none", animation: "riseSm 0.25s var(--ease) both" }}>
                <div style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--danger)", marginBottom: 3 }}>Generation failed</div>
                <div style={{ fontSize: "0.85rem", color: "var(--ink-2)" }}>{error}</div>
              </div>
            )}

            {/* Result */}
            {audioUrl && step === 4 && (
              <div className="card" style={{ padding: 22, background: "var(--accent-soft)", borderColor: "var(--accent-line)", boxShadow: "none", animation: "rise 0.4s var(--ease) both" }}>
                <div className="row" style={{ gap: 12, marginBottom: 16 }}>
                  <span className="row center" style={{ width: 42, height: 42, borderRadius: "var(--r-md)", background: "var(--surface)", border: "1px solid var(--accent-line)", flexShrink: 0, fontSize: 18 }}>🎧</span>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: "0.9rem", fontWeight: 600, color: "var(--accent-ink)" }}>Your voice note is ready</div>
                    <div style={{ fontSize: "0.78rem", color: "var(--ink-3)", marginTop: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{audioName}</div>
                  </div>
                  <span className="badge badge-accent" style={{ marginLeft: "auto", flexShrink: 0 }}><span className="dot" /> Ready</span>
                </div>
                <Waveform active />
                <audio ref={audioRef} src={audioUrl} controls style={{ width: "100%", marginTop: 16, accentColor: "var(--accent)" }} />
                <div className="row wrap" style={{ gap: 10, marginTop: 16 }}>
                  <button onClick={handleDownload} className="btn btn-primary" style={{ flex: 1, minWidth: 150 }}>Download MP3</button>
                  {tgConnected && (
                    <button onClick={handleSendTelegram} disabled={tgSending} className={`btn ${tgSent ? "btn-accent" : "btn-secondary"}`} style={{ flex: 1, minWidth: 150 }}>
                      {tgSent ? "✓ Sent" : tgSending ? <><span className="spinner" style={{ width: 14, height: 14 }} /> Sending…</> : <><TgIcon size={15} color="#229ED9" /> Send to Telegram</>}
                    </button>
                  )}
                </div>
                {tgError && <div style={{ marginTop: 12, fontSize: "0.8rem", color: "var(--danger)" }}>{tgError}</div>}
                {!tgConnected && (
                  <Link href="/delivery" className="row center" style={{ marginTop: 12, height: 38, borderRadius: "var(--r-sm)", border: "1px dashed var(--info-line)", color: "var(--info)", fontSize: "0.8rem", fontWeight: 500, gap: 7 }}>
                    <TgIcon size={13} /> Connect Telegram to send voice notes directly
                  </Link>
                )}
              </div>
            )}

            {step === 0 && !error && (
              <p className="t-muted" style={{ fontSize: "0.78rem", textAlign: "center", margin: 0 }}>Typical generation takes 15–45 seconds · Live web via Tavily + neural TTS</p>
            )}
          </div>

          {/* Suggestions */}
          <div className="rise-2" style={{ marginTop: 26 }}>
            <div className="eyebrow no-rule" style={{ marginBottom: 12, justifyContent: "center", width: "100%" }}>Try asking</div>
            <div className="row wrap center" style={{ gap: 8 }}>
              {["Latest in AI chips", "This week in crypto", "New research on longevity", "Premier League transfer news", "Fed rate outlook"].map(s => (
                <button key={s} onClick={() => setTopic(s)} className="chip chip-hover" style={{ cursor: "pointer" }}>{s}</button>
              ))}
            </div>
          </div>
        </main>
      </div>

      <style>{`
        @media (max-width: 520px) {
          .ask-compose { flex-direction: column; }
          .ask-compose .btn { width: 100%; }
        }
      `}</style>
    </div>
  );
}
