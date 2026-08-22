"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useRef, useMemo } from "react";
import AppNav from "@/components/AppNav";
import Logo from "@/components/Logo";
import AgentOnboardingChat, { LockedTopic } from "@/components/AgentOnboardingChat";
import SavedTopicPicker, { SavedTopicShape } from "@/components/SavedTopicPicker";
import Dropdown from "@/components/Dropdown";
import TimePicker from "@/components/TimePicker";
import DatePicker from "@/components/DatePicker";
import { CADENCES, DATA_WINDOWS, bestCadencesForWindow } from "@/lib/agentConstants";
import { useNotificationToggle } from "@/lib/push";
import { WEEKDAYS, describeSchedule, describeNextRun, timezoneLabel, computeNextRunAt, detectTimezone, listTimezones, todayInZone } from "@/lib/schedule";

function TgIcon({ size = 16, color = "currentColor" }: { size?: number; color?: string }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill={color}><path d="M20.665 3.717l-17.73 6.837c-1.21.486-1.203 1.161-.222 1.462l4.552 1.42 10.532-6.645c.498-.303.953-.14.579.192l-8.533 7.701-.314 4.692c.46 0 .663-.211.921-.46l2.211-2.15 4.599 3.397c.848.467 1.457.227 1.668-.787l3.019-14.228c.309-1.239-.473-1.8-1.282-1.432z" /></svg>;
}

function WaIcon({ size = 16, color = "currentColor" }: { size?: number; color?: string }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill={color}><path d="M12.05 0C5.5 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.88 11.88 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.82 11.82 0 00-3.48-8.413A11.815 11.815 0 0012.05 0zm6.98 16.813c-.297.833-1.72 1.593-2.363 1.69-.604.09-1.368.128-2.208-.14-.51-.161-1.163-.377-2-.738-3.52-1.52-5.82-5.062-5.996-5.296-.173-.235-1.43-1.9-1.43-3.625s.905-2.573 1.226-2.925c.32-.352.7-.44.934-.44.234 0 .467.002.672.012.215.01.504-.082.788.602.297.703 1.008 2.428 1.096 2.604.09.176.148.383.03.618-.117.235-.176.383-.352.588-.176.204-.37.457-.53.614-.176.176-.36.367-.155.72.205.351.912 1.503 1.958 2.436 1.345 1.2 2.48 1.57 2.832 1.746.352.176.557.147.762-.088.205-.235.878-1.026 1.113-1.378.234-.352.469-.293.792-.176.323.117 2.048.966 2.4 1.142.352.176.586.264.674.41.088.147.088.851-.209 1.684z" /></svg>;
}

/** One numbered step of the create-agent wizard: badge, title, one-line description, optional trailing action. */
function Step({ id, n, title, desc, action, children }: { id?: string; n: number; title: string; desc: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div id={id} className="step-block">
      <div className="step-head">
        <div className="step-head-main">
          <span className="step-num" aria-hidden>{n}</span>
          <span>
            <div className="step-title">{title}</div>
            <div className="step-desc">{desc}</div>
          </span>
        </div>
        {action && <div className="step-action">{action}</div>}
      </div>
      {children}
    </div>
  );
}

/** A bordered field box: icon badge, bold label, muted value line (often a bare Dropdown) below it. */
function Tile({ icon, label, children }: { icon: string; label: string; children: React.ReactNode }) {
  return (
    <div className="tile">
      <span className="tile-icon" aria-hidden>{icon}</span>
      <span className="tile-body">
        <span className="tile-label">{label}</span>
        <span className="tile-value">{children}</span>
      </span>
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
  { name: "Analytical", icon: "📊" },
  { name: "Conversational", icon: "💬" },
  { name: "Energetic", icon: "⚡" },
  { name: "Calm", icon: "🌙" },
];
type Step = 0 | 1 | 2 | 3 | 4;
const STEP_LABELS: Record<number, string> = { 1: "Scanning the web…", 2: "Cross-checking & summarizing…", 3: "Composing your audio briefing…", 4: "Ready." };
const STEP_STAGES = [{ n: 1, label: "Scan" }, { n: 2, label: "Analyze" }, { n: 3, label: "Compose" }];

export default function CreateAgent() {
  const { status } = useSession();
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
  const [previewOpen, setPreviewOpen] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  const [dataWindow, setDataWindow] = useState("1d");
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
  const zoneOptions = useMemo(listTimezones, []);
  const tzOptions = useMemo(() => zoneOptions.map(z => ({ value: z, label: timezoneLabel(z) })), [zoneOptions]);
  const todayStr = useMemo(() => todayInZone(timezone), [timezone]);
  const [startDate, setStartDate] = useState(todayStr);
  // Keep "start from" pinned to today until the user deliberately picks a
  // different date — otherwise switching timezone could leave it in the past.
  const [startDateTouched, setStartDateTouched] = useState(false);
  useEffect(() => { if (!startDateTouched) setStartDate(todayStr); }, [todayStr, startDateTouched]);

  // The cadence toggle is filtered down to whatever's apt for the chosen
  // lookback window — if switching the window drops the current cadence off
  // that list, fall back to the first one that's still valid.
  useEffect(() => {
    const apt = bestCadencesForWindow(dataWindow);
    if (apt.length && !apt.includes(cadence.label)) {
      const next = CADENCES.find(c => apt.includes(c.label)) ?? cadence;
      setCadence(next);
      setTimes(next.defaultTimes);
      if (next.needsWeekday && weekday == null) setWeekday(1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataWindow]);

  const [tgConnected, setTgConnected] = useState(false);
  const [tgSending, setTgSending] = useState(false);
  const [tgSent, setTgSent] = useState(false);
  const [tgError, setTgError] = useState<string | null>(null);
  const [telegramEnabled, setTelegramEnabled] = useState(true);

  const [waConnected, setWaConnected] = useState(false);
  const [whatsappEnabled, setWhatsappEnabled] = useState(true);

  const { permission: notifPermission, enabled: notifEnabled, loading: notifLoading, working: notifWorking, supported: notifSupported, error: notifError, toggle: handleToggleNotifications } = useNotificationToggle();

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

  useEffect(() => {
    (async () => {
      try { const res = await fetch("/api/whatsapp-auth"); if (res.ok) { const d = await res.json(); if (d.connected) setWaConnected(true); } } catch { /* silent */ }
    })();
  }, []);

  // Keep the agent name in sync with the topic until the user edits it directly.
  useEffect(() => { if (!nameTouched) setAgentName(topic); }, [topic, nameTouched]);

  // Esc closes the sample-preview modal.
  useEffect(() => {
    if (!previewOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setPreviewOpen(false); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [previewOpen]);

  const isLoading = step > 0 && step < 4;
  const langLabel = (LANGS.find(x => x.code === lang) ?? LANGS[0]).label;
  const bestCadences = bestCadencesForWindow(dataWindow);
  // The in-app inbox is always on, so every agent always has somewhere to
  // deliver — Telegram/WhatsApp are optional extras, never required to deploy.
  const hasDeliveryChannel = true;
  const externalChannels = [
    telegramEnabled && tgConnected ? "Telegram" : null,
    whatsappEnabled && waConnected ? "WhatsApp" : null,
  ].filter((c): c is string => Boolean(c));

  // Ticks once a minute so "Next voice note" stays accurate on a page left
  // open a while, instead of freezing at whatever "now" was on last compute.
  const [clockTick, setClockTick] = useState(0);
  useEffect(() => { const id = setInterval(() => setClockTick(t => t + 1), 60_000); return () => clearInterval(id); }, []);

  const nextRunText = useMemo(() => {
    const next = computeNextRunAt({ frequency: cadence.label, intervalMinutes: cadence.intervalMinutes, times, weekday: cadence.needsWeekday ? weekday : null, timezone, startDate });
    return describeNextRun(next, timezone);
  }, [cadence, times, weekday, timezone, startDate, clockTick]);

  const handleGenerate = async () => {
    const q = topic.trim();
    if (!q || isLoading) return;
    setStep(1); setAudioUrl(null); setError(null);
    try {
      const t1 = setTimeout(() => setStep(2), 3000);
      const t2 = setTimeout(() => setStep(3), 8000);
      const res = await fetch("/api/news-audio", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ topic: q, limit: 5, time_published: dataWindow, language: langLabel, tone }) });
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
          dataWindow,
          language: langLabel,
          voice: tone,
          frequency: cadence.label,
          intervalMinutes: cadence.intervalMinutes,
          times,
          weekday: cadence.needsWeekday ? weekday : null,
          timezone,
          startDate,
          scheduleEnabled: true,
          telegramEnabled: telegramEnabled && tgConnected,
          whatsappEnabled: whatsappEnabled && waConnected,
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

  const windowOptions = DATA_WINDOWS.map(w => ({ value: w.value, label: w.label, icon: w.icon }));
  const cadenceOptions = CADENCES.filter(c => bestCadences.includes(c.label)).map(c => ({ value: c.label, label: c.label, icon: c.icon }));
  const langOptions = LANGS.map(l => ({ value: l.code, label: l.label }));
  const toneOptions = TONES.map(t => ({ value: t.name, label: t.name, icon: t.icon }));
  const selectedWindow = DATA_WINDOWS.find(w => w.value === dataWindow);
  const scheduleNeedsDetail = cadence.timeSlots > 0 || cadence.needsWeekday;

  const savedTopicsBtn = savedTopics && savedTopics.length > 0 && (
    <button type="button" onClick={() => setPickerOpen(o => !o)} className="btn btn-secondary btn-sm" style={{ fontSize: "0.76rem" }}>⭐ Saved topics</button>
  );

  const deliveryCard = (
    connected: boolean, on: boolean, toggle: () => void, icon: React.ReactNode, label: string,
  ) => connected ? (
    <button type="button" onClick={toggle} className="delivery-card" data-on={on}>
      {icon}<span>{label}</span>
      <span className="delivery-check" aria-hidden>✓</span>
    </button>
  ) : (
    <Link href="/delivery" className="delivery-card">
      {icon}<span>{label}</span>
      <span className="delivery-arrow" aria-hidden>→</span>
    </Link>
  );

  const scrollToSchedule = () => document.getElementById("step-schedule")?.scrollIntoView({ behavior: "smooth", block: "start" });

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)" }}>
      <AppNav />
      <div style={{ position: "relative", overflow: "hidden" }}>
        <div className="aurora" aria-hidden="true" />
        <main className="container agent-console-main" style={{ maxWidth: 900, padding: "40px 24px 60px", position: "relative" }}>

          {/* ── Hero — title, subtitle, a small floating orb for warmth ── */}
          <div className="row between wrap" style={{ gap: 24, marginBottom: 28 }}>
            <div style={{ maxWidth: 520 }}>
              <h1 style={{ fontSize: "clamp(1.7rem, 3.4vw, 2.3rem)", fontWeight: 650, letterSpacing: "-0.02em", lineHeight: 1.12 }}>
                Create your <span style={{ color: "var(--accent-ink)" }}>intelligence agent</span>
              </h1>
              <p className="t-muted" style={{ fontSize: "0.92rem", marginTop: 10 }}>
                Tell Leora what to watch, how to deliver, and when. Your agent. Your rules.
              </p>
            </div>
            <div style={{ position: "relative", width: 84, height: 84, flexShrink: 0 }} aria-hidden>
              <span style={{
                position: "absolute", inset: 0, borderRadius: "50%",
                background: "radial-gradient(circle at 35% 30%, var(--accent-soft), var(--surface-2))",
                border: "1px solid var(--accent-line)", boxShadow: "var(--shadow-glow)",
                display: "grid", placeItems: "center", fontSize: "1.9rem",
                animation: "floaty 5s var(--ease-io) infinite",
              }}>🤖</span>
              <span style={{ position: "absolute", top: -6, left: -10, width: 26, height: 26, borderRadius: "var(--r-sm)", background: "var(--surface)", border: "1px solid var(--line-2)", display: "grid", placeItems: "center", fontSize: "0.8rem", boxShadow: "var(--shadow-xs)" }}>📄</span>
              <span style={{ position: "absolute", bottom: -4, right: -12, width: 26, height: 26, borderRadius: "var(--r-sm)", background: "var(--surface)", border: "1px solid var(--line-2)", display: "grid", placeItems: "center", fontSize: "0.8rem", boxShadow: "var(--shadow-xs)" }}>✈️</span>
            </div>
          </div>

          {/* ── The control panel — one card, no page scroll to configure ── */}
          <div className="card card-featured agent-console-card" style={{ padding: "26px 28px", borderRadius: "var(--r-xl)" }}>

            {/* ── Step 1 — Topic ── */}
            <Step n={1} title="What should your agent watch?" desc="Define the topic, keywords or areas you want updates on." action={!pickerOpen ? savedTopicsBtn : undefined}>
            {!locked ? (
              <>
                {pickerOpen ? (
                  <SavedTopicPicker
                    topics={savedTopics ?? []}
                    loading={savedTopics === null}
                    onSelect={selectSavedTopic}
                    onDelete={deleteSavedTopic}
                    onStartNew={() => setPickerOpen(false)}
                    onClose={() => setPickerOpen(false)}
                  />
                ) : (
                  <AgentOnboardingChat key={chatKey} seed={chatSeed} onLocked={handleLocked} />
                )}
              </>
            ) : (
              <>
                <div className="row between" style={{ gap: 10 }}>
                  <span className="row" style={{ gap: 8, minWidth: 0 }}>
                    <span style={{ color: "var(--accent-ink)", flexShrink: 0 }}>🔒</span>
                    <span style={{ fontSize: "0.88rem", fontWeight: 650, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{locked.topic}</span>
                  </span>
                  <button type="button" onClick={restartChat} disabled={isLoading} className="btn btn-ghost btn-sm" style={{ fontSize: "0.72rem", flexShrink: 0 }}>Change</button>
                </div>

                {pickerOpen && (
                  <div style={{ marginTop: 12 }}>
                    <SavedTopicPicker
                      topics={savedTopics ?? []}
                      loading={savedTopics === null}
                      onSelect={selectSavedTopic}
                      onDelete={deleteSavedTopic}
                      onStartNew={() => { restartChat(); setPickerOpen(false); }}
                      onClose={() => setPickerOpen(false)}
                    />
                  </div>
                )}

                {/* Name — single compact line */}
                <div className="row" style={{ gap: 10, marginTop: 12 }}>
                  <label style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--ink-3)", flexShrink: 0 }}>Name</label>
                  <input
                    value={agentName} onChange={e => { setAgentName(e.target.value); setNameTouched(true); }}
                    disabled={isLoading}
                    placeholder="e.g. AI Chips Watch"
                    className="input" style={{ height: 36, fontSize: "0.85rem", borderRadius: "var(--r-sm)", flex: 1 }}
                  />
                </div>
              </>
            )}
            </Step>

            {/* ── Step 2 — Schedule ── */}
            <Step id="step-schedule" n={2} title="When should it run?" desc="Set how often and at what time your agent should collect and deliver.">
              <div className="tile-row">
                <Tile icon="🕰️" label="Look back">
                  <Dropdown options={windowOptions} value={dataWindow} onChange={setDataWindow} disabled={isLoading} triggerClassName="dd-trigger-tile" />
                </Tile>
                <Tile icon="🌍" label="Timezone">
                  <Dropdown options={tzOptions} value={timezone} onChange={setTimezone} disabled={isLoading} triggerClassName="dd-trigger-tile" />
                </Tile>
                <Tile icon="🗓️" label="Cadence">
                  <Dropdown
                    options={cadenceOptions}
                    value={cadence.label}
                    disabled={isLoading}
                    triggerClassName="dd-trigger-tile"
                    onChange={label => {
                      const c = CADENCES.find(x => x.label === label);
                      if (!c) return;
                      setCadence(c); setTimes(c.defaultTimes);
                      if (c.needsWeekday && weekday == null) setWeekday(1);
                    }}
                  />
                </Tile>
              </div>

              <div className="expand" data-open={scheduleNeedsDetail}>
                <div>
                  <div className="time-row-box">
                    {cadence.timeSlots > 0 && Array.from({ length: cadence.timeSlots }).map((_, i) => (
                      <div className="time-row-field" key={i}>
                        {cadence.timeSlots > 1 && <span className="time-row-field-label">Time</span>}
                        <TimePicker
                          value={times[i] ?? "09:00"}
                          disabled={isLoading}
                          onChange={v => setTimes(prev => { const next = [...prev]; next[i] = v; return next; })}
                        />
                      </div>
                    ))}
                    {cadence.needsWeekday && (
                      <div className="time-row-field">
                        <div className="row wrap" style={{ gap: 4 }}>
                          {WEEKDAYS.map((d, i) => (
                            <button key={d} type="button" onClick={() => setWeekday(i)} style={{
                              width: 30, height: 30, borderRadius: "50%", fontSize: "0.72rem", fontWeight: 700, cursor: "pointer",
                              background: weekday === i ? "var(--accent-soft)" : "var(--surface)",
                              border: `1px solid ${weekday === i ? "var(--accent-line)" : "var(--line-2)"}`,
                              color: weekday === i ? "var(--accent-ink)" : "var(--ink-2)",
                            }}>{d[0]}</button>
                          ))}
                        </div>
                      </div>
                    )}
                    {!cadence.needsWeekday && cadence.timeSlots > 0 && (
                      <div className="time-row-field">
                        <span className="time-row-field-label">Start date</span>
                        <DatePicker value={startDate} min={todayStr} onChange={v => { setStartDateTouched(true); setStartDate(v); }} />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </Step>

            {/* ── Step 3 — Voice ── */}
            <Step n={3} title="How should it speak?" desc="Choose the voice and tone for your updates.">
              <div className="tile-row">
                <Tile icon="🎙️" label="Language">
                  <Dropdown options={langOptions} value={lang} onChange={setLang} disabled={isLoading} triggerClassName="dd-trigger-tile" />
                </Tile>
                <Tile icon="🎭" label="Tone">
                  <Dropdown options={toneOptions} value={tone} onChange={setTone} disabled={isLoading} triggerClassName="dd-trigger-tile" />
                </Tile>
                <button type="button" onClick={testVoice} className="tile" style={{ cursor: "pointer", textAlign: "left", border: "1px solid var(--line-2)" }}>
                  <span className="tile-icon" aria-hidden>{voiceLoading ? <span className="spinner" style={{ width: 13, height: 13 }} /> : voiceTesting ? "◼" : "▶"}</span>
                  <span className="tile-body">
                    <span className="tile-label">Preview voice</span>
                    <span className={`tile-value eq ${voiceTesting ? "" : "eq-muted"}`} style={{ height: 10, marginTop: 2 }}>
                      {Array.from({ length: 5 }).map((_, i) => <span key={i} />)}
                    </span>
                  </span>
                </button>
              </div>
            </Step>

            {/* ── Step 4 — Delivery ── */}
            <Step n={4} title="Where should we deliver?" desc="Choose your preferred platform to receive updates.">
              <div className="delivery-grid">
                {deliveryCard(tgConnected, telegramEnabled, () => setTelegramEnabled(v => !v), <TgIcon size={16} color="#229ED9" />, "Telegram")}
                {deliveryCard(waConnected, whatsappEnabled, () => setWhatsappEnabled(v => !v), <WaIcon size={16} color="#25D366" />, "WhatsApp")}
                {notifSupported && notifPermission !== "denied" && !notifLoading ? (
                  <button type="button" onClick={handleToggleNotifications} disabled={notifWorking} className="delivery-card" data-on={notifEnabled}>
                    <Logo size={16} /><span>In-app</span>
                    <span className="delivery-check" aria-hidden>✓</span>
                  </button>
                ) : (
                  <div className="delivery-card" data-on="true" style={{ cursor: "default" }}>
                    <Logo size={16} /><span>In-app</span>
                    <span className="delivery-check" aria-hidden>✓</span>
                  </div>
                )}
              </div>
            </Step>

            {/* Next run — the concrete payoff, always visible */}
            <div className="summary-bar">
              <span className="summary-bar-main">
                <span aria-hidden>🔔</span>
                <span style={{ fontSize: "0.85rem", color: "var(--accent-ink)" }}><b>{nextRunText}</b></span>
                <span className="t-muted" style={{ fontSize: "0.78rem" }}>via {["In-app", ...externalChannels].join(" • ")}</span>
              </span>
              <button type="button" onClick={scrollToSchedule} className="btn btn-secondary btn-sm" style={{ fontSize: "0.76rem", flexShrink: 0 }}>Edit</button>
            </div>

            {/* Actions — always visible; Deploy just stays disabled until topic + name exist */}
            <div className="row" style={{ gap: 10, marginTop: 16 }}>
              <button type="button" onClick={() => setPreviewOpen(true)} className="btn btn-secondary" style={{ flexShrink: 0 }}>👁 Preview agent</button>
              <button onClick={handleDeploy} disabled={deploying || !topic.trim() || !agentName.trim() || !hasDeliveryChannel} className="btn btn-primary btn-lg" style={{ flex: 1 }}>
                {deploying ? <><span className="spinner" style={{ width: 15, height: 15, borderTopColor: "var(--solid-ink)" }} /> Deploying…</> : "🚀 Create & deploy agent"}
              </button>
            </div>
            {deployError && <div style={{ marginTop: 10, fontSize: "0.8rem", color: "var(--danger)", textAlign: "center" }}>{deployError}</div>}
            {!topic.trim() ? (
              <p className="t-muted" style={{ fontSize: "0.74rem", textAlign: "center", marginTop: 8 }}>Lock in a topic above to deploy.</p>
            ) : !agentName.trim() ? (
              <p className="t-muted" style={{ fontSize: "0.74rem", textAlign: "center", marginTop: 8 }}>Name your agent above to deploy.</p>
            ) : (
              <p className="t-muted" style={{ fontSize: "0.74rem", textAlign: "center", marginTop: 8 }}>🔒 You can always edit these settings later.</p>
            )}
          </div>
        </main>
      </div>

      {/* ── Sample-preview modal — optional, so it never costs the panel permanent height ── */}
      {previewOpen && (
        <div className="modal-backdrop" onClick={() => setPreviewOpen(false)}>
          <div className="card modal-panel" style={{ padding: 24, borderRadius: "var(--r-xl)" }} onClick={e => e.stopPropagation()}>
            <div className="row between" style={{ marginBottom: 16 }}>
              <span style={{ fontSize: "0.95rem", fontWeight: 650 }}>🎧 Sample briefing</span>
              <button type="button" onClick={() => setPreviewOpen(false)} className="icon-btn" aria-label="Close">✕</button>
            </div>

            {!audioUrl && !isLoading && !error && (
              <p className="t-muted" style={{ fontSize: "0.85rem", marginBottom: 16 }}>Hear what this agent would actually send, using your current settings.</p>
            )}

            <button onClick={handleGenerate} disabled={isLoading || !topic.trim()} className="btn btn-primary" style={{ width: "100%" }}>
              {isLoading ? <><span className="spinner" style={{ width: 15, height: 15 }} /> Working…</> : audioUrl ? "▶ Generate again" : "▶ Generate a preview"}
            </button>

            {(isLoading || step === 4) && (
              <div className="col" style={{ gap: 12, margin: "18px 0 0", animation: "riseSm 0.3s var(--ease) both" }}>
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
              <div className="card" style={{ padding: "14px 16px", margin: "16px 0 0", background: "var(--danger-soft)", borderColor: "var(--danger)", boxShadow: "none" }}>
                <div style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--danger)", marginBottom: 3 }}>Preview failed</div>
                <div style={{ fontSize: "0.85rem", color: "var(--ink-2)" }}>{error}</div>
              </div>
            )}

            {audioUrl && step === 4 && (
              <div className="card" style={{ padding: 18, marginTop: 16, background: "var(--accent-soft)", borderColor: "var(--accent-line)", boxShadow: "none", animation: "rise 0.4s var(--ease) both" }}>
                <Waveform active />
                <audio ref={audioRef} src={audioUrl} controls style={{ width: "100%", marginTop: 14, accentColor: "var(--accent)" }} />
                <div className="row wrap" style={{ gap: 10, marginTop: 14 }}>
                  <button onClick={handleDownload} className="btn btn-primary" style={{ flex: 1, minWidth: 130 }}>Download</button>
                  {tgConnected && (
                    <button onClick={handleSendTelegram} disabled={tgSending} className={`btn ${tgSent ? "btn-accent" : "btn-secondary"}`} style={{ flex: 1, minWidth: 130 }}>
                      {tgSent ? "✓ Sent" : tgSending ? <><span className="spinner" style={{ width: 14, height: 14 }} /> Sending…</> : <><TgIcon size={15} color="#229ED9" /> Telegram</>}
                    </button>
                  )}
                </div>
                {tgError && <div style={{ marginTop: 10, fontSize: "0.8rem", color: "var(--danger)" }}>{tgError}</div>}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
