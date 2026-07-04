"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useRef, useMemo } from "react";
import AppNav from "@/components/AppNav";
import AgentOnboardingChat, { LockedTopic } from "@/components/AgentOnboardingChat";
import SavedTopicPicker, { SavedTopicShape } from "@/components/SavedTopicPicker";
import TimePicker from "@/components/TimePicker";
import { CADENCES } from "@/lib/agentConstants";
import { WEEKDAYS, describeSchedule, describeNextRun, timezoneLabel, computeNextRunAt, detectTimezone, listTimezones } from "@/lib/schedule";

function TgIcon({ size = 16, color = "currentColor" }: { size?: number; color?: string }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill={color}><path d="M20.665 3.717l-17.73 6.837c-1.21.486-1.203 1.161-.222 1.462l4.552 1.42 10.532-6.645c.498-.303.953-.14.579.192l-8.533 7.701-.314 4.692c.46 0 .663-.211.921-.46l2.211-2.15 4.599 3.397c.848.467 1.457.227 1.668-.787l3.019-14.228c.309-1.239-.473-1.8-1.282-1.432z" /></svg>;
}

function WaIcon({ size = 16, color = "currentColor" }: { size?: number; color?: string }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill={color}><path d="M12.05 0C5.5 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.88 11.88 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.82 11.82 0 00-3.48-8.413A11.815 11.815 0 0012.05 0zm6.98 16.813c-.297.833-1.72 1.593-2.363 1.69-.604.09-1.368.128-2.208-.14-.51-.161-1.163-.377-2-.738-3.52-1.52-5.82-5.062-5.996-5.296-.173-.235-1.43-1.9-1.43-3.625s.905-2.573 1.226-2.925c.32-.352.7-.44.934-.44.234 0 .467.002.672.012.215.01.504-.082.788.602.297.703 1.008 2.428 1.096 2.604.09.176.148.383.03.618-.117.235-.176.383-.352.588-.176.204-.37.457-.53.614-.176.176-.36.367-.155.72.205.351.912 1.503 1.958 2.436 1.345 1.2 2.48 1.57 2.832 1.746.352.176.557.147.762-.088.205-.235.878-1.026 1.113-1.378.234-.352.469-.293.792-.176.323.117 2.048.966 2.4 1.142.352.176.586.264.674.41.088.147.088.851-.209 1.684z" /></svg>;
}

/**
 * One node in the vertical "configure your agent" flow: a numbered circle
 * (checkmark once that step is genuinely satisfied) connected by a line to
 * the next step, with a single flat card holding the step's content — no
 * nested card-in-a-card.
 */
function Step({
  n, icon, title, extra, done, last, children,
}: {
  n: number; icon: string; title: string; extra?: React.ReactNode; done?: boolean; last?: boolean; children: React.ReactNode;
}) {
  return (
    <div className="row" style={{ gap: 18, alignItems: "flex-start", position: "relative", marginBottom: last ? 0 : 20 }}>
      {!last && (
        <div aria-hidden style={{ position: "absolute", left: 19, top: 20, width: 2, height: "calc(100% + 20px)", background: "var(--line-2)", zIndex: 0 }} />
      )}
      <div style={{
        width: 40, height: 40, borderRadius: "50%", flexShrink: 0, position: "relative", zIndex: 1,
        display: "grid", placeItems: "center", fontWeight: 700, fontSize: "0.92rem",
        background: done ? "var(--accent)" : "var(--surface)",
        color: done ? "#fff" : "var(--ink-2)",
        border: `1.5px solid ${done ? "var(--accent)" : "var(--line-2)"}`,
        boxShadow: done ? "0 0 0 4px var(--accent-soft)" : "var(--shadow-xs)",
        transition: "all 0.25s var(--ease)",
      }}>
        {done ? "✓" : n}
      </div>
      <div className="card" style={{ flex: 1, minWidth: 0, padding: 22, borderRadius: "var(--r-lg)", boxShadow: "var(--shadow-sm)" }}>
        <div className="row between wrap" style={{ gap: 10, marginBottom: 16 }}>
          <span style={{ fontSize: "0.92rem", fontWeight: 650, letterSpacing: "-0.01em", display: "inline-flex", alignItems: "center", gap: 9 }}>
            <span aria-hidden>{icon}</span>{title}
          </span>
          {extra}
        </div>
        {children}
      </div>
    </div>
  );
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
  { code: "en", label: "English", sample: "Here's your latest audio briefing from Leora." },
  { code: "es", label: "Español", sample: "Aquí tienes tu resumen más reciente de Leora." },
  { code: "hi", label: "हिन्दी", sample: "यह Leora की आपकी ताज़ा ऑडियो ब्रीफ़िंग है।" },
  { code: "fr", label: "Français", sample: "Voici votre dernier briefing audio de Leora." },
  { code: "de", label: "Deutsch", sample: "Hier ist dein aktuelles Audio-Briefing von Leora." },
  { code: "pt", label: "Português", sample: "Aqui está o seu briefing de áudio mais recente da Leora." },
  { code: "ar", label: "العربية", sample: "إليك أحدث ملخص صوتي من ليورا." },
  { code: "ja", label: "日本語", sample: "Leoraからの最新の音声ブリーフィングです。" },
];
const TONES = [
  { name: "Analytical" },
  { name: "Conversational" },
  { name: "Energetic" },
  { name: "Calm" },
];
type Step = 0 | 1 | 2 | 3 | 4;
const STEP_LABELS: Record<number, string> = { 1: "Scanning the web…", 2: "Cross-checking & summarizing…", 3: "Composing your audio briefing…", 4: "Ready." };
const STEP_STAGES = [{ n: 1, label: "Scan" }, { n: 2, label: "Analyze" }, { n: 3, label: "Compose" }];

export default function CreateAgent() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [agentName, setAgentName] = useState("");
  const [nameTouched, setNameTouched] = useState(false);
  const [locked, setLocked] = useState<LockedTopic | null>(null);
  const [chatKey, setChatKey] = useState(0);
  const [chatSeed, setChatSeed] = useState("");
  const [savedTopics, setSavedTopics] = useState<SavedTopicShape[] | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const topic = locked?.topic ?? "";
  const [step, setStep] = useState<Step>(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioName, setAudioName] = useState("briefing.mp3");
  const [error, setError] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  const [lang, setLang] = useState("en");
  const [tone, setTone] = useState("Analytical");
  const [voiceLoading, setVoiceLoading] = useState(false);
  const [voiceTesting, setVoiceTesting] = useState(false);
  const voiceAbortRef = useRef<AbortController | null>(null);
  const voiceAudioRef = useRef<HTMLAudioElement | null>(null);
  const [cadence, setCadence] = useState(CADENCES[3]); // Daily brief
  const [times, setTimes] = useState<string[]>(CADENCES[3].defaultTimes);
  const [weekday, setWeekday] = useState<number | null>(1); // Monday
  const [timezone, setTimezone] = useState(detectTimezone);
  const [tzPickerOpen, setTzPickerOpen] = useState(false);
  const zoneOptions = useMemo(listTimezones, []);

  const [tgConnected, setTgConnected] = useState(false);
  const [tgSending, setTgSending] = useState(false);
  const [tgSent, setTgSent] = useState(false);
  const [tgError, setTgError] = useState<string | null>(null);
  const [telegramEnabled, setTelegramEnabled] = useState(true);

  const [deploying, setDeploying] = useState(false);
  const [deployError, setDeployError] = useState<string | null>(null);

  useEffect(() => { if (status === "unauthenticated") router.replace("/signin"); }, [status, router]);

  // Prefill from dashboard "Ask" bar (?q=) — seeds the onboarding chat's opening message.
  useEffect(() => {
    try { const q = new URLSearchParams(window.location.search).get("q"); if (q) setChatSeed(q); } catch { /* ignore */ }
  }, []);

  const restartChat = () => { setLocked(null); setChatSeed(""); setChatKey(k => k + 1); setNameTouched(false); };

  // Every locked-in topic is saved to the user's topic library, so switching
  // away from it never loses it — it just goes back on the shelf.
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/saved-topics");
        const data = await res.json();
        if (data.success) setSavedTopics(data.topics);
      } catch { /* picker just shows empty state on failure */ }
    })();
  }, []);

  async function persistTopic(l: LockedTopic) {
    try {
      const res = await fetch("/api/saved-topics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(l),
      });
      const data = await res.json().catch(() => ({}));
      if (data.success && data.topic) {
        setSavedTopics(prev => [data.topic, ...(prev ?? []).filter(t => t.id !== data.topic.id)]);
      }
    } catch { /* saving the topic is best-effort; the lock itself still applies */ }
  }

  const handleLocked = (l: LockedTopic) => {
    setLocked(l);
    setPickerOpen(false);
    void persistTopic(l);
  };

  const selectSavedTopic = (t: SavedTopicShape) => {
    const l: LockedTopic = { topic: t.topic, summary: t.summary, corePrompt: t.corePrompt, keywords: t.keywords, region: t.region };
    setLocked(l);
    setPickerOpen(false);
    void persistTopic(l); // bumps it back to the top of the recency list
  };

  const deleteSavedTopic = async (id: string) => {
    setSavedTopics(prev => prev?.filter(t => t.id !== id) ?? prev);
    try { await fetch(`/api/saved-topics/${id}`, { method: "DELETE" }); } catch { /* local list already updated */ }
  };

  useEffect(() => {
    (async () => {
      try { const res = await fetch("/api/telegram-auth"); if (res.ok) { const d = await res.json(); if (d.connected) setTgConnected(true); } } catch { /* silent */ }
    })();
  }, []);

  // Keep the agent name in sync with the topic until the user edits it directly.
  useEffect(() => { if (!nameTouched) setAgentName(topic); }, [topic, nameTouched]);

  const isLoading = step > 0 && step < 4;
  const langLabel = (LANGS.find(x => x.code === lang) ?? LANGS[0]).label;
  // Telegram is the only delivery channel actually wired up right now — WhatsApp
  // and in-app are coming soon — so a connected + enabled Telegram is what
  // "a delivery channel is selected" means today. Deploy is blocked without one.
  const hasDeliveryChannel = telegramEnabled && tgConnected;

  const nextRunText = useMemo(() => {
    const next = computeNextRunAt({ frequency: cadence.label, intervalMinutes: cadence.intervalMinutes, times, weekday, timezone });
    return describeNextRun(next, timezone);
  }, [cadence, times, weekday, timezone]);

  const handleGenerate = async () => {
    const q = topic.trim();
    if (!q || isLoading) return;
    setStep(1); setAudioUrl(null); setError(null);
    try {
      const t1 = setTimeout(() => setStep(2), 3000);
      const t2 = setTimeout(() => setStep(3), 8000);
      const res = await fetch("/api/news-audio", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ topic: q, limit: 5, language: langLabel, tone }) });
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

  const stopVoicePreview = () => {
    voiceAbortRef.current?.abort();
    voiceAbortRef.current = null;
    voiceAudioRef.current?.pause();
    voiceAudioRef.current = null;
    setVoiceLoading(false);
    setVoiceTesting(false);
  };

  // Renders the actual selected language's neural voice + tone's prosody via
  // the backend, so the sample is a true preview of what a real briefing
  // will sound like — not a browser-only approximation.
  const testVoice = async () => {
    if (voiceLoading || voiceTesting) { stopVoicePreview(); return; }
    const l = LANGS.find(x => x.code === lang) ?? LANGS[0];
    setVoiceLoading(true);
    const controller = new AbortController();
    voiceAbortRef.current = controller;
    try {
      const res = await fetch("/api/voice-sample", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: l.sample, language: l.label, tone }),
        signal: controller.signal,
      });
      if (!res.ok) { setVoiceLoading(false); return; }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      voiceAudioRef.current = audio;
      audio.onended = () => { setVoiceTesting(false); voiceAudioRef.current = null; URL.revokeObjectURL(url); };
      audio.onerror = () => { setVoiceTesting(false); voiceAudioRef.current = null; URL.revokeObjectURL(url); };
      setVoiceLoading(false);
      setVoiceTesting(true);
      await audio.play();
    } catch (e: any) {
      if (e?.name !== "AbortError") { setVoiceLoading(false); setVoiceTesting(false); }
    }
  };

  useEffect(() => () => { voiceAudioRef.current?.pause(); voiceAbortRef.current?.abort(); }, []);

  const handleDeploy = async () => {
    const name = agentName.trim() || topic.trim();
    const q = topic.trim();
    if (!name || !q || deploying || !hasDeliveryChannel) return;
    setDeploying(true); setDeployError(null);
    try {
      const res = await fetch("/api/agents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          topic: q,
          language: langLabel,
          voice: tone,
          frequency: cadence.label,
          intervalMinutes: cadence.intervalMinutes,
          times,
          weekday: cadence.needsWeekday ? weekday : null,
          timezone,
          scheduleEnabled: true,
          telegramEnabled: telegramEnabled && tgConnected,
          corePrompt: locked?.corePrompt ?? "",
          onboardingSummary: locked?.summary ?? "",
          keywords: locked?.keywords ?? [],
          region: locked?.region ?? "Global",
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) { setDeployError(data.error ?? "Could not deploy agent."); setDeploying(false); return; }
      router.push("/dashboard#deploy");
    } catch (e: any) {
      setDeployError(e.message ?? "Network error.");
      setDeploying(false);
    }
  };

  const progressWidth = step === 1 ? "25%" : step === 2 ? "58%" : step === 3 ? "84%" : "100%";

  if (status === "loading" || status === "unauthenticated") {
    return <div className="row center" style={{ minHeight: "100vh" }}><span className="spinner" /></div>;
  }

  const chip = (on: boolean): React.CSSProperties => ({
    display: "inline-flex", alignItems: "center", lineHeight: 1,
    padding: "8px 15px", borderRadius: "var(--r-full)", fontSize: "0.82rem", fontWeight: 500, cursor: isLoading ? "not-allowed" : "pointer",
    background: on ? "var(--accent-soft)" : "var(--surface)", border: `1px solid ${on ? "var(--accent-line)" : "var(--line-2)"}`,
    color: on ? "var(--accent-ink)" : "var(--ink-2)", transition: "all 0.16s var(--ease)",
    boxShadow: on ? "none" : "var(--shadow-xs)",
  });

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)" }}>
      <AppNav />
      <div style={{ position: "relative", overflow: "hidden" }}>
        <div className="aurora" aria-hidden="true" />
        <main className="container" style={{ maxWidth: 800, padding: "52px 24px 120px", position: "relative" }}>
          <div className="rise" style={{ marginBottom: 40, textAlign: "center" }}>
            <div className="badge badge-accent" style={{ marginBottom: 18 }}><span className="dot dot-live" /> Live web · on demand</div>
            <h1 className="t-h1" style={{ marginBottom: 14 }}>Create an agent, get <span className="serif" style={{ fontSize: "1.05em", color: "var(--accent)" }}>a voice note.</span></h1>
            <p className="t-lead" style={{ maxWidth: 560, margin: "0 auto" }}>Name any topic. An agent reads the latest across the web and sends you a studio-quality voice note — in your language and voice, on the schedule you choose.</p>
          </div>

          <div className="rise-1">
            {/* ── 1 · Topic ─────────────────────────────────────── */}
            <Step n={1} icon="💬" title="What should it watch?" done={!!locked} extra={!locked && !pickerOpen && (
              <span className="row" style={{ gap: 8 }}>
                {savedTopics && savedTopics.length > 0 && (
                  <button type="button" onClick={() => setPickerOpen(true)} className="btn btn-ghost btn-sm" style={{ fontSize: "0.72rem" }}>📌 Use a saved topic</button>
                )}
                <span className="badge badge-muted" style={{ fontSize: "0.66rem" }}>Chat with Leora</span>
              </span>
            )}>
              {pickerOpen ? (
                <SavedTopicPicker
                  topics={savedTopics ?? []}
                  loading={savedTopics === null}
                  onSelect={selectSavedTopic}
                  onDelete={deleteSavedTopic}
                  onStartNew={() => { if (locked) restartChat(); setPickerOpen(false); }}
                  onClose={() => setPickerOpen(false)}
                />
              ) : !locked ? (
                <div className="card" style={{ padding: 18, background: "var(--surface-2)", boxShadow: "none" }}>
                  <AgentOnboardingChat key={chatKey} seed={chatSeed} onLocked={handleLocked} />
                </div>
              ) : (
                <div className="card" style={{ padding: 18, background: "var(--accent-soft)", borderColor: "var(--accent-line)", boxShadow: "none" }}>
                  <div className="row between" style={{ marginBottom: 8, alignItems: "flex-start" }}>
                    <span className="row" style={{ gap: 8 }}>
                      <span style={{ color: "var(--accent-ink)" }}>🔒</span>
                      <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--accent-ink)" }}>Topic locked in — {locked.topic}</span>
                    </span>
                    <button type="button" onClick={() => setPickerOpen(true)} disabled={isLoading} className="btn btn-ghost btn-sm" style={{ flexShrink: 0 }}>Change topic</button>
                  </div>
                  <p style={{ fontSize: "0.85rem", color: "var(--ink-2)", lineHeight: 1.5, marginBottom: 14 }}>{locked.summary}</p>
                  <div style={{ borderTop: "1px solid var(--accent-line)", paddingTop: 14 }}>
                    <div className="eyebrow no-rule" style={{ marginBottom: 8, fontSize: "0.66rem" }}>Agent's role</div>
                    <p style={{ fontSize: "0.8rem", color: "var(--ink-3)", lineHeight: 1.55 }}>{locked.corePrompt}</p>
                    {(locked.keywords.length > 0 || locked.region) && (
                      <div className="row wrap" style={{ gap: 6, marginTop: 12 }}>
                        {locked.keywords.map(k => <span key={k} className="chip" style={{ padding: "3px 10px", fontSize: "0.72rem", background: "var(--surface)" }}>{k}</span>)}
                        {locked.region && <span className="chip" style={{ padding: "3px 10px", fontSize: "0.72rem", background: "var(--surface)" }}>📍 {locked.region}</span>}
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div style={{ marginTop: 14 }}>
                <label style={{ fontSize: "0.72rem", fontWeight: 600, color: "var(--ink-3)", marginBottom: 6, display: "block" }}>Agent name</label>
                <input
                  value={agentName} onChange={e => { setAgentName(e.target.value); setNameTouched(true); }}
                  disabled={isLoading}
                  placeholder="e.g. AI Chips Watch"
                  className="input" style={{ height: 44, fontSize: "0.9rem", borderRadius: "var(--r-md)" }}
                />
              </div>
            </Step>

            {/* ── 2 · Voice & language ──────────────────────────── */}
            <Step n={2} icon="🎙️" title="Voice & language">
              <div style={{ fontSize: "0.72rem", fontWeight: 600, color: "var(--ink-3)", marginBottom: 10 }}>LANGUAGE</div>
              <div className="row wrap" style={{ gap: 8 }}>
                {LANGS.map(l => <button key={l.code} type="button" disabled={isLoading} onClick={() => setLang(l.code)} style={chip(lang === l.code)}>{l.label}</button>)}
              </div>

              <div style={{ marginTop: 18, paddingTop: 18, borderTop: "1px solid var(--line)" }}>
                <div className="row between" style={{ marginBottom: 10 }}>
                  <div style={{ fontSize: "0.72rem", fontWeight: 600, color: "var(--ink-3)" }}>VOICE TONE</div>
                  <button type="button" onClick={testVoice} className="btn btn-ghost btn-sm" style={{ color: "var(--accent-ink)", fontSize: "0.78rem" }}>
                    {voiceLoading ? <><span className="spinner" style={{ width: 12, height: 12 }} /> Loading…</> : voiceTesting ? "◼ Stop preview" : "▶ Preview voice"}
                  </button>
                </div>
                <div className="row wrap" style={{ gap: 8 }}>
                  {TONES.map(t => <button key={t.name} type="button" disabled={isLoading} onClick={() => setTone(t.name)} style={chip(tone === t.name)}>{t.name}</button>)}
                </div>
              </div>
            </Step>

            {/* ── 3 · Preview ───────────────────────────────────── */}
            <Step n={3} icon="🎧" title="Preview a briefing">
              <button onClick={handleGenerate} disabled={isLoading || !topic.trim()} className="btn btn-secondary" style={{ width: "100%" }}>
                {isLoading ? <><span className="spinner" style={{ width: 15, height: 15 }} /> Working…</> : "▶ Preview a briefing"}
              </button>

              {(isLoading || step === 4) && (
                <div className="col" style={{ gap: 12, margin: "20px 0 0", animation: "riseSm 0.3s var(--ease) both" }}>
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

              {error && (
                <div className="card" style={{ padding: "14px 16px", margin: "18px 0 0", background: "var(--danger-soft)", borderColor: "var(--danger)", boxShadow: "none", animation: "riseSm 0.25s var(--ease) both" }}>
                  <div style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--danger)", marginBottom: 3 }}>Preview failed</div>
                  <div style={{ fontSize: "0.85rem", color: "var(--ink-2)" }}>{error}</div>
                </div>
              )}

              {audioUrl && step === 4 && (
                <div className="card" style={{ padding: 20, marginTop: 18, background: "var(--accent-soft)", borderColor: "var(--accent-line)", boxShadow: "none", animation: "rise 0.4s var(--ease) both" }}>
                  <div className="row" style={{ gap: 12, marginBottom: 16 }}>
                    <span className="row center" style={{ width: 42, height: 42, borderRadius: "var(--r-md)", background: "var(--surface)", border: "1px solid var(--accent-line)", flexShrink: 0, fontSize: 18 }}>🎧</span>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: "0.9rem", fontWeight: 600, color: "var(--accent-ink)" }}>Your preview is ready</div>
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
                </div>
              )}

              {step === 0 && !error && (
                <p className="t-muted" style={{ fontSize: "0.78rem", textAlign: "center", margin: "16px 0 0" }}>Takes 15–45 seconds · Live web via Tavily + neural TTS</p>
              )}
            </Step>

            {/* ── 4 · Delivery schedule ─────────────────────────── */}
            <Step n={4} icon="🗓️" title="Delivery schedule">
              <div className="row wrap" style={{ gap: 8 }}>
                {CADENCES.map(c => (
                  <button key={c.label} type="button" onClick={() => { setCadence(c); setTimes(c.defaultTimes); if (c.needsWeekday && weekday == null) setWeekday(1); }} style={chip(cadence.label === c.label)}>
                    <span style={{ marginRight: 6 }}>{c.icon}</span>{c.label}
                  </button>
                ))}
              </div>

              {cadence.needsWeekday && (
                <div className="row wrap" style={{ gap: 6, marginTop: 14 }}>
                  {WEEKDAYS.map((d, i) => (
                    <button key={d} type="button" onClick={() => setWeekday(i)} style={{ ...chip(weekday === i), padding: "6px 12px", fontSize: "0.78rem" }}>{d}</button>
                  ))}
                </div>
              )}

              {cadence.timeSlots > 0 && (
                <div style={{ marginTop: 18, paddingTop: 18, borderTop: "1px solid var(--line)" }}>
                  <div className="row wrap" style={{ gap: 28, alignItems: "flex-start" }}>
                    {Array.from({ length: cadence.timeSlots }).map((_, i) => (
                      <div key={i} style={{ flex: cadence.timeSlots > 1 ? "1 1 230px" : undefined }}>
                        {cadence.timeSlots > 1 && (
                          <div style={{ fontSize: "0.68rem", fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase", color: "var(--ink-3)", marginBottom: 10 }}>
                            {i === 0 ? "First delivery" : "Second delivery"}
                          </div>
                        )}
                        <TimePicker
                          value={times[i] ?? "09:00"}
                          disabled={isLoading}
                          onChange={v => setTimes(prev => { const next = [...prev]; next[i] = v; return next; })}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Timezone — auto-detected, correctable if wrong */}
              <div style={{ marginTop: 18, paddingTop: 18, borderTop: "1px solid var(--line)" }}>
                {tzPickerOpen ? (
                  <div className="row wrap" style={{ gap: 8, alignItems: "center" }}>
                    <select
                      value={timezone}
                      onChange={e => setTimezone(e.target.value)}
                      className="input"
                      style={{ height: 38, fontSize: "0.82rem", flex: 1, minWidth: 200 }}
                    >
                      {zoneOptions.map(z => <option key={z} value={z}>{timezoneLabel(z)}</option>)}
                    </select>
                    <button type="button" onClick={() => setTzPickerOpen(false)} className="btn btn-ghost btn-sm">Done</button>
                  </div>
                ) : (
                  <div className="row between wrap" style={{ gap: 8 }}>
                    <span className="row" style={{ gap: 8, fontSize: "0.85rem", color: "var(--ink-2)" }}>
                      <span style={{ fontSize: "1rem" }}>🌍</span>
                      <span style={{ fontWeight: 550 }}>{timezoneLabel(timezone)}</span>
                      <span className="badge badge-muted" style={{ fontSize: "0.64rem" }}>{timezone === detectTimezone() ? "auto-detected" : "custom"}</span>
                    </span>
                    <button type="button" onClick={() => setTzPickerOpen(true)} className="btn btn-ghost btn-sm" style={{ fontSize: "0.78rem" }}>Not you? Change</button>
                  </div>
                )}
              </div>

              <p className="t-muted" style={{ fontSize: "0.8rem", marginTop: 16, paddingTop: 16, borderTop: "1px solid var(--line)" }}>
                {describeSchedule({ frequency: cadence.label, intervalMinutes: cadence.intervalMinutes, times, weekday, timezone })}
              </p>

              {/* Next-run — a concrete, unmissable payoff */}
              <div className="row" style={{ gap: 12, marginTop: 14, padding: "14px 18px", borderRadius: "var(--r-md)", background: "var(--accent-soft)", border: "1px solid var(--accent-line)" }}>
                <span style={{ fontSize: "1.15rem" }}>🔔</span>
                <div>
                  <div style={{ fontSize: "0.66rem", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--accent-ink)", opacity: 0.85 }}>Next voice note</div>
                  <div style={{ fontSize: "0.92rem", fontWeight: 600, color: "var(--accent-ink)" }}>{nextRunText}</div>
                </div>
              </div>
            </Step>

            {/* ── 5 · Delivery channel ──────────────────────────── */}
            <Step n={5} icon="📡" title="Delivery channel" last done={hasDeliveryChannel} extra={<span className="badge badge-warn" style={{ fontSize: "0.62rem" }}>Required</span>}>
              <div className="col" style={{ gap: 8 }}>
                {/* Telegram — the only channel actually wired up */}
                {tgConnected ? (
                  <button type="button" onClick={() => setTelegramEnabled(v => !v)} className="row between" style={{ width: "100%", padding: "12px 14px", borderRadius: "var(--r-md)", border: `1px solid ${telegramEnabled ? "var(--accent-line)" : "var(--line-2)"}`, background: telegramEnabled ? "var(--accent-soft)" : "var(--surface-2)", cursor: "pointer" }}>
                    <span className="row" style={{ gap: 9 }}><TgIcon size={15} color="#229ED9" /> Send to Telegram</span>
                    <span className="toggle" data-on={telegramEnabled} />
                  </button>
                ) : (
                  <Link href="/delivery" className="row center" style={{ height: 46, borderRadius: "var(--r-md)", border: "1px dashed var(--info-line)", color: "var(--info)", fontSize: "0.82rem", fontWeight: 500, gap: 7 }}>
                    <TgIcon size={13} /> Connect Telegram to receive scheduled briefings
                  </Link>
                )}

                {/* WhatsApp — coming soon */}
                <div className="row between" style={{ width: "100%", padding: "12px 14px", borderRadius: "var(--r-md)", border: "1px solid var(--line)", background: "var(--surface-2)", opacity: 0.55 }}>
                  <span className="row" style={{ gap: 9 }}><WaIcon size={15} color="var(--ink-3)" /> WhatsApp</span>
                  <span className="badge badge-muted" style={{ fontSize: "0.62rem" }}>Coming soon</span>
                </div>

                {/* In-app — coming soon */}
                <div className="row between" style={{ width: "100%", padding: "12px 14px", borderRadius: "var(--r-md)", border: "1px solid var(--line)", background: "var(--surface-2)", opacity: 0.55 }}>
                  <span className="row" style={{ gap: 9 }}>📲 In-app</span>
                  <span className="badge badge-muted" style={{ fontSize: "0.62rem" }}>Coming soon</span>
                </div>
              </div>

              {!hasDeliveryChannel && (
                <p style={{ fontSize: "0.78rem", color: "var(--danger)", marginTop: 12 }}>
                  ⚠ Select a delivery channel above to deploy this agent.
                </p>
              )}
            </Step>

            {/* ── Final · Review & Deploy ────────────────────────── */}
            <div className="card card-featured" style={{ padding: 26, borderRadius: "var(--r-xl)", marginTop: 32, marginLeft: 58 }}>
              <div className="row" style={{ gap: 14, marginBottom: 20 }}>
                <span className="row center" style={{ width: 46, height: 46, borderRadius: "50%", background: "var(--accent)", color: "#fff", fontSize: "1.25rem", flexShrink: 0, boxShadow: "0 0 0 5px var(--accent-soft)" }}>🚀</span>
                <div>
                  <div style={{ fontSize: "1.08rem", fontWeight: 650, letterSpacing: "-0.01em" }}>Ready to deploy</div>
                  <div className="t-muted" style={{ fontSize: "0.82rem" }}>{agentName.trim() || "Untitled agent"}</div>
                </div>
              </div>

              <div className="row wrap" style={{ gap: 8, marginBottom: 20 }}>
                <span className="chip" style={{ background: "var(--surface-2)" }}>🔒 {locked ? locked.topic : "No topic yet"}</span>
                <span className="chip" style={{ background: "var(--surface-2)" }}>🎙️ {langLabel} · {tone}</span>
                <span className="chip" style={{ background: "var(--surface-2)" }}>{cadence.icon} {cadence.label}</span>
                <span className="chip" style={{
                  background: hasDeliveryChannel ? "var(--surface-2)" : "var(--danger-soft)",
                  color: hasDeliveryChannel ? undefined : "var(--danger)",
                  borderColor: hasDeliveryChannel ? undefined : "var(--danger)",
                }}>
                  📡 {hasDeliveryChannel ? "Telegram" : "No channel"}
                </span>
              </div>

              <div className="row" style={{ gap: 10, padding: "13px 16px", borderRadius: "var(--r-md)", background: "var(--accent-soft)", border: "1px solid var(--accent-line)", marginBottom: 22 }}>
                <span style={{ fontSize: "1.15rem" }}>🔔</span>
                <div>
                  <div style={{ fontSize: "0.64rem", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--accent-ink)", opacity: 0.85 }}>Next voice note</div>
                  <div style={{ fontSize: "0.92rem", fontWeight: 600, color: "var(--accent-ink)" }}>{nextRunText}</div>
                </div>
              </div>

              <button onClick={handleDeploy} disabled={deploying || !topic.trim() || !agentName.trim() || !hasDeliveryChannel} className="btn btn-primary btn-lg" style={{ width: "100%" }}>
                {deploying ? <><span className="spinner" style={{ width: 15, height: 15, borderTopColor: "var(--solid-ink)" }} /> Deploying…</> : "🚀 Deploy agent"}
              </button>
              {deployError && <div style={{ marginTop: 10, fontSize: "0.82rem", color: "var(--danger)", textAlign: "center" }}>{deployError}</div>}
              {!topic.trim() ? (
                <p className="t-muted" style={{ fontSize: "0.78rem", textAlign: "center", marginTop: 10 }}>Lock in a topic in step 1 to deploy.</p>
              ) : !agentName.trim() ? (
                <p className="t-muted" style={{ fontSize: "0.78rem", textAlign: "center", marginTop: 10 }}>Name your agent in step 1 to deploy.</p>
              ) : !hasDeliveryChannel ? (
                <p style={{ fontSize: "0.78rem", color: "var(--danger)", textAlign: "center", marginTop: 10 }}>Select a delivery channel in step 5 to deploy.</p>
              ) : null}
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
