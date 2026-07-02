"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useCallback } from "react";
import type { Agent, AgentPlatform } from "@/app/api/agents/route";
import AppNav from "@/components/AppNav";

/* ── Icons ── */
const I = {
  arrow: (p = {}) => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M5 12h14M13 6l6 6-6 6" /></svg>,
  plus: (p = {}) => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" {...p}><path d="M12 5v14M5 12h14" /></svg>,
  ask: (p = {}) => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></svg>,
  play: (p = {}) => <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" {...p}><path d="M8 5v14l11-7z" /></svg>,
  pause: (p = {}) => <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" {...p}><path d="M6 5h4v14H6zM14 5h4v14h-4z" /></svg>,
  gear: (p = {}) => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" {...p}><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-2.82 1.17V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 8 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 3.6 15H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 5 8a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 3.6V3a2 2 0 0 1 4 0v.09A1.65 1.65 0 0 0 16 5a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 20.4 9H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" /></svg>,
  trash: (p = {}) => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" /></svg>,
  tg: (p = {}) => <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" {...p}><path d="M20.665 3.717l-17.73 6.837c-1.21.486-1.203 1.161-.222 1.462l4.552 1.42 10.532-6.645c.498-.303.953-.14.579.192l-8.533 7.701-.314 4.692c.46 0 .663-.211.921-.46l2.211-2.15 4.599 3.397c.848.467 1.457.227 1.668-.787l3.019-14.228c.309-1.239-.473-1.8-1.282-1.432z" /></svg>,
  wa: (p = {}) => <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" {...p}><path d="M12.05 0C5.5 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.88 11.88 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.82 11.82 0 00-3.48-8.413A11.815 11.815 0 0012.05 0zm6.98 16.813c-.297.833-1.72 1.593-2.363 1.69-.604.09-1.368.128-2.208-.14-.51-.161-1.163-.377-2-.738-3.52-1.52-5.82-5.062-5.996-5.296-.173-.235-1.43-1.9-1.43-3.625s.905-2.573 1.226-2.925c.32-.352.7-.44.934-.44.234 0 .467.002.672.012.215.01.504-.082.788.602.297.703 1.008 2.428 1.096 2.604.09.176.148.383.03.618-.117.235-.176.383-.352.588-.176.204-.37.457-.53.614-.176.176-.36.367-.155.72.205.351.912 1.503 1.958 2.436 1.345 1.2 2.48 1.57 2.832 1.746.352.176.557.147.762-.088.205-.235.878-1.026 1.113-1.378.234-.352.469-.293.792-.176.323.117 2.048.966 2.4 1.142.352.176.586.264.674.41.088.147.088.851-.209 1.684z" /></svg>,
  bolt: (p = {}) => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M13 2L4 14h7l-1 8 9-12h-7l1-8z" /></svg>,
  caret: (p = {}) => <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M6 9l6 6 6-6" /></svg>,
  agents: (p = {}) => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" {...p}><rect x="3" y="7" width="18" height="13" rx="3" /><path d="M12 7V4M8 12h.01M16 12h.01M9 16h6" /></svg>,
  source: (p = {}) => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" {...p}><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3a15 15 0 0 1 0 18M12 3a15 15 0 0 0 0 18" /></svg>,
  mic: (p = {}) => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" {...p}><rect x="9" y="2" width="6" height="12" rx="3" /><path d="M5 10a7 7 0 0 0 14 0M12 17v5" /></svg>,
};

const VOICES = ["Analytical", "Conversational", "Concise", "Editorial", "Neutral"];
const LANGUAGES = ["English", "Español", "हिन्दी", "Français", "Deutsch", "العربية", "中文", "Português"];
const CADENCES: { label: string; times: string[]; intervalMinutes: number }[] = [
  { label: "Real-time", times: ["As it happens"], intervalMinutes: 60 },
  { label: "Hourly", times: ["Every hour"], intervalMinutes: 60 },
  { label: "Twice daily", times: ["08:00", "18:00"], intervalMinutes: 720 },
  { label: "Daily brief", times: ["08:00"], intervalMinutes: 1440 },
  { label: "Weekly digest", times: ["Mon 08:00"], intervalMinutes: 10080 },
];

type Field = "status" | "voice" | "language" | "cadence" | "channels";
type MenuState = { id: string; field: Field; x: number; y: number } | null;

/* Live "agent is working" verbs */
const WORK = ["Scanning sources", "Reading", "Cross-checking", "Detecting trends", "Recording your voice note"];

/* ── Small primitives ── */
function StatTile({ value, label, live, icon }: { value: string | number; label: string; live?: boolean; icon?: React.ReactNode }) {
  return (
    <div className="card stat-tile" style={{ padding: "18px 20px" }}>
      <div className="row between" style={{ marginBottom: 10 }}>
        <span className="row center" style={{ width: 30, height: 30, borderRadius: "var(--r-sm)", background: "var(--accent-soft)", color: "var(--accent)" }}>{icon}</span>
        {live && <span className="eq" aria-hidden="true"><span /><span /><span /></span>}
      </div>
      <div style={{ fontSize: "1.65rem", fontWeight: 600, letterSpacing: "-0.03em", lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: "0.78rem", color: "var(--ink-3)", marginTop: 5 }}>{label}</div>
    </div>
  );
}

function EditChip({ children, active, onClick, accent }: { children: React.ReactNode; active?: boolean; onClick: (e: React.MouseEvent) => void; accent?: boolean }) {
  return (
    <button onClick={onClick} className="editchip" data-open={active} data-accent={accent}>
      {children}<span style={{ opacity: 0.5, display: "inline-flex" }}>{I.caret()}</span>
    </button>
  );
}

function formatNext(iso?: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  const now = new Date();
  const time = d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  if (d.toDateString() === now.toDateString()) return `Today · ${time}`;
  const tm = new Date(now); tm.setDate(now.getDate() + 1);
  if (d.toDateString() === tm.toDateString()) return `Tomorrow · ${time}`;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function greeting(): string {
  const h = new Date().getHours();
  if (h < 5) return "Working late";
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

export default function Dashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [agents, setAgents] = useState<Agent[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [menu, setMenu] = useState<MenuState>(null);
  const [ask, setAsk] = useState("");
  const [workIdx, setWorkIdx] = useState(0);

  useEffect(() => { if (status === "unauthenticated") router.replace("/signin"); }, [status, router]);

  useEffect(() => {
    if (status !== "authenticated") return;
    (async () => {
      try {
        const res = await fetch("/api/agents");
        const data = await res.json();
        if (data.success) setAgents(data.agents); else setErr(data.error ?? "Could not load agents.");
      } catch { setErr("Network error."); }
    })();
  }, [status]);

  useEffect(() => { const t = setInterval(() => setWorkIdx(v => (v + 1) % WORK.length), 2400); return () => clearInterval(t); }, []);

  useEffect(() => {
    if (!menu) return;
    const close = () => setMenu(null);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMenu(null);
    window.addEventListener("resize", close);
    window.addEventListener("scroll", close, true);
    document.addEventListener("keydown", onKey);
    return () => { window.removeEventListener("resize", close); window.removeEventListener("scroll", close, true); document.removeEventListener("keydown", onKey); };
  }, [menu]);

  const patch = useCallback((id: string, up: (s: Agent) => Agent) => setAgents(p => p?.map(s => s.id === id ? up(s) : s) ?? p), []);
  const openMenu = (e: React.MouseEvent, id: string, field: Field) => {
    e.stopPropagation();
    if (menu && menu.id === id && menu.field === field) return setMenu(null);
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setMenu({ id, field, x: Math.min(r.left, window.innerWidth - 250), y: r.bottom + 6 });
  };
  const togglePlatform = (list: AgentPlatform[], platform: "telegram" | "whatsapp"): AgentPlatform[] => {
    const ex = list.find(p => p.platform === platform);
    if (ex) return list.map(p => p.platform === platform ? { ...p, connected: !p.connected } : p);
    return [...list, { platform, connected: true, handle: null }];
  };

  const summary = useMemo(() => {
    const l = agents ?? [];
    const active = l.filter(s => s.status === "active").length;
    const sources = l.reduce((n, s) => n + (s.stats.sourcesTracked || 0), 0);
    const briefs = l.reduce((n, s) => n + (s.stats.briefingsSent || 0), 0);
    return { total: l.length, active, sources, briefs };
  }, [agents]);

  const activeAgent = menu ? agents?.find(s => s.id === menu.id) : undefined;
  const first = session?.user?.name?.split(" ")[0] ?? "there";

  if (status === "loading" || status === "unauthenticated") {
    return <div className="row center" style={{ minHeight: "100vh" }}><span className="spinner" /></div>;
  }

  /* Synthesized morning-brief items (placeholder intelligence) */
  const brief = [
    { t: "Markets open cautious after overnight tech selloff", s: "Finance", meta: "4 sources agree", c: "var(--accent)" },
    { t: "A new open-weight model is topping evaluations", s: "AI & Tech", meta: "Trending · 3 places", c: "var(--info)" },
    { t: "Policy change may affect your product category", s: "Policy", meta: "Flagged important", c: "var(--warn)" },
  ];

  const today = new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)" }}>
      <AppNav />

      <main className="container" style={{ padding: "40px 24px 88px", maxWidth: 1160 }}>
        {/* ── Greeting ── */}
        <div className="row between wrap rise" style={{ gap: 16, marginBottom: 28, alignItems: "flex-end" }}>
          <div>
            <div className="t-muted" style={{ fontSize: "0.78rem", marginBottom: 6 }}>{today}</div>
            <h1 className="t-h2" style={{ marginBottom: 8 }}>{greeting()}, <span className="serif" style={{ fontSize: "1.05em" }}>{first}.</span></h1>
            <p className="t-2" style={{ fontSize: "0.95rem" }}>
              {summary.active > 0
                ? <>Your agents sent <strong style={{ color: "var(--ink)" }}>{summary.briefs}</strong> voice notes · <span className="row" style={{ display: "inline-flex", gap: 6, verticalAlign: "middle" }}><span className="eq" aria-hidden="true"><span /><span /><span /><span /></span> <span className="thinking">{WORK[workIdx]} now</span></span></>
                : "No agents running yet. Deploy your first to start receiving voice-note updates."}
            </p>
          </div>
          <Link href="#deploy" className="btn btn-primary">{I.plus()} Deploy agent</Link>
        </div>

        {/* ── Ask bar ── */}
        <form
          onSubmit={(e) => { e.preventDefault(); if (ask.trim()) router.push(`/test-agent?q=${encodeURIComponent(ask)}`); }}
          className="card rise-1 ask-bar"
          style={{ display: "flex", alignItems: "center", gap: 12, padding: "6px 6px 6px 18px", marginBottom: 28, borderRadius: "var(--r-full)" }}
        >
          <span style={{ color: "var(--ink-3)" }}>{I.ask()}</span>
          <input value={ask} onChange={e => setAsk(e.target.value)} placeholder="Ask your agents anything — “what changed in AI chips this week?”"
            style={{ flex: 1, height: 42, border: "none", background: "none", outline: "none", color: "var(--ink)", fontSize: "0.95rem", minWidth: 0 }} />
          <span className="kbd nav-links-desktop" style={{ marginRight: 4 }}>↵</span>
          <button type="submit" className="btn btn-primary btn-sm" style={{ borderRadius: "var(--r-full)", height: 38, padding: "0 18px" }}>Ask</button>
        </form>

        {/* ── Stats ── */}
        <div className="grid rise-1" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 14, marginBottom: 32 }}>
          <StatTile value={summary.total} label="Agents deployed" icon={I.agents()} />
          <StatTile value={summary.active} label="Working now" live={summary.active > 0} icon={I.bolt()} />
          <StatTile value={summary.sources} label="Sources monitored" icon={I.source()} />
          <StatTile value={summary.briefs} label="Voice notes sent" icon={I.mic()} />
        </div>

        {/* ── Brief + Live panel ── */}
        <div className="dash-split rise-2" style={{ marginBottom: 44 }}>
          {/* Morning brief */}
          <div className="card" style={{ overflow: "hidden" }}>
            <div className="row between" style={{ padding: "18px 22px", borderBottom: "1px solid var(--line)" }}>
              <div>
                <div className="eyebrow no-rule" style={{ marginBottom: 4 }}>Morning brief</div>
                <div style={{ fontSize: "1.05rem", fontWeight: 600, letterSpacing: "-0.02em" }}>Worth your attention today</div>
              </div>
              <span className="badge badge-accent"><span className="dot" /> Fresh</span>
            </div>
            {summary.active > 0 ? brief.map((b, k) => (
              <div key={k} className="brief-row row" style={{ gap: 14, padding: "16px 22px", borderTop: k ? "1px solid var(--line)" : "none", cursor: "pointer" }}>
                <span style={{ width: 3, height: 40, borderRadius: 3, background: b.c, flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: "0.95rem", fontWeight: 550, letterSpacing: "-0.01em", lineHeight: 1.4 }}>{b.t}</div>
                  <div className="row wrap" style={{ gap: 8, marginTop: 5 }}>
                    <span className="chip" style={{ padding: "2px 9px", fontSize: "0.72rem" }}>{b.s}</span>
                    <span style={{ fontSize: "0.75rem", color: "var(--ink-3)" }}>{b.meta}</span>
                  </div>
                </div>
                <span className="brief-arrow" style={{ color: "var(--ink-4)" }}>{I.arrow()}</span>
              </div>
            )) : (
              <div style={{ padding: "48px 22px", textAlign: "center" }}>
                <div className="row center" style={{ width: 44, height: 44, borderRadius: "var(--r-md)", background: "var(--surface-2)", border: "1px solid var(--line)", color: "var(--ink-3)", margin: "0 auto 14px" }}>{I.mic()}</div>
                <p className="t-2" style={{ fontSize: "0.9rem" }}>Your morning brief will appear here once an agent is running.</p>
              </div>
            )}
          </div>

          {/* Live agents */}
          <div className="card" style={{ overflow: "hidden" }}>
            <div className="row between" style={{ padding: "18px 20px", borderBottom: "1px solid var(--line)" }}>
              <div className="eyebrow no-rule">Agents at work</div>
              <span className="badge badge-muted">{summary.active} live</span>
            </div>
            <div style={{ padding: "6px 8px" }}>
              {(agents ?? []).slice(0, 6).map((s) => {
                const on = s.status === "active";
                return (
                  <div key={s.id} className="row between live-row" style={{ padding: "11px 12px", borderRadius: "var(--r-sm)", gap: 10 }}>
                    <div className="row" style={{ gap: 10, minWidth: 0 }}>
                      <span style={{ width: 30, height: 30, borderRadius: "var(--r-xs)", background: "var(--surface-2)", border: "1px solid var(--line)", display: "grid", placeItems: "center", fontSize: 15, flexShrink: 0 }}>{s.icon}</span>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: "0.85rem", fontWeight: 550, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{s.name}</div>
                        <div style={{ fontSize: "0.72rem", color: "var(--ink-3)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{s.niche}</div>
                      </div>
                    </div>
                    <span className="row" style={{ gap: 7, flexShrink: 0 }}>
                      {on ? <span className="eq" aria-hidden="true"><span /><span /><span /></span> : <span className="dot" style={{ background: "var(--ink-4)" }} />}
                      <span style={{ fontSize: "0.72rem", color: on ? "var(--accent-ink)" : "var(--ink-3)" }}>{on ? WORK[(workIdx + s.name.length) % WORK.length] : "Paused"}</span>
                    </span>
                  </div>
                );
              })}
              {agents === null && [0, 1, 2, 3].map(i => <div key={i} className="skeleton" style={{ height: 34, margin: "10px 12px" }} />)}
              {agents !== null && agents.length === 0 && (
                <p className="t-muted" style={{ fontSize: "0.82rem", textAlign: "center", padding: "28px 12px" }}>Nothing deployed yet.</p>
              )}
            </div>
          </div>
        </div>

        {/* ── Agents management ── */}
        <div id="deploy" className="row between wrap" style={{ gap: 12, marginBottom: 16, scrollMarginTop: 80 }}>
          <div>
            <h2 className="t-h3" style={{ marginBottom: 4 }}>Your agents</h2>
            <p className="t-muted" style={{ fontSize: "0.85rem" }}>Click any cell to tune an agent — its voice, language, cadence or delivery.</p>
          </div>
          <Link href="/test-agent" className="btn btn-secondary btn-sm">{I.plus()} New agent</Link>
        </div>

        {err && <div className="card" style={{ padding: 16, borderColor: "var(--danger)", color: "var(--danger)", fontSize: "0.85rem", marginBottom: 16 }}>{err}</div>}

        {agents === null && !err ? (
          <div className="card skeleton" style={{ height: 300 }} />
        ) : agents && agents.length === 0 ? (
          <div className="card" style={{ padding: "64px 24px", textAlign: "center", position: "relative", overflow: "hidden" }}>
            <div className="field-grid" style={{ position: "absolute", inset: 0, opacity: 0.5, pointerEvents: "none" }} />
            <div style={{ position: "relative" }}>
              <div className="row center" style={{ width: 52, height: 52, borderRadius: "var(--r-md)", background: "var(--accent-soft)", color: "var(--accent)", margin: "0 auto 16px" }}>{I.bolt()}</div>
              <div className="t-h3" style={{ marginBottom: 8 }}>Deploy your first agent</div>
              <p className="t-2" style={{ maxWidth: 380, margin: "0 auto 22px", fontSize: "0.9rem" }}>Name a topic — a market, a competitor, a hobby — and an AI agent starts reading the web for you within the minute.</p>
              <Link href="/test-agent" className="btn btn-primary">{I.plus()} Create an agent</Link>
            </div>
          </div>
        ) : (
          <div className="card" style={{ overflow: "hidden", padding: 0 }}>
            <div style={{ overflowX: "auto" }}>
              <table className="agent-table">
                <thead>
                  <tr>
                    {["Agent", "Status", "Voice", "Language", "Cadence", "Delivery", "Activity", ""].map(h => <th key={h}>{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {agents?.map(s => {
                    const on = s.status === "active";
                    const tg = s.platforms.find(p => p.platform === "telegram");
                    const wa = s.platforms.find(p => p.platform === "whatsapp");
                    return (
                      <tr key={s.id}>
                        <td>
                          <div className="row" style={{ gap: 11 }}>
                            <span style={{ width: 34, height: 34, borderRadius: "var(--r-xs)", background: "var(--surface-2)", border: "1px solid var(--line)", display: "grid", placeItems: "center", fontSize: 17, flexShrink: 0 }}>{s.icon}</span>
                            <div>
                              <div style={{ fontSize: "0.88rem", fontWeight: 600, letterSpacing: "-0.01em" }}>{s.name}</div>
                              <div style={{ fontSize: "0.74rem", color: "var(--ink-3)" }}>{s.niche}</div>
                            </div>
                          </div>
                        </td>
                        <td>
                          <button onClick={e => openMenu(e, s.id, "status")} className={`badge ${on ? "badge-accent" : "badge-muted"}`} style={{ cursor: "pointer" }}>
                            <span className={on ? "dot dot-live" : "dot"} style={{ background: on ? "var(--accent)" : "var(--ink-4)" }} />{on ? "Active" : "Paused"}{I.caret()}
                          </button>
                        </td>
                        <td><EditChip onClick={e => openMenu(e, s.id, "voice")} active={menu?.id === s.id && menu?.field === "voice"}>{s.personality.voice}</EditChip></td>
                        <td><EditChip onClick={e => openMenu(e, s.id, "language")} active={menu?.id === s.id && menu?.field === "language"}>{s.personality.language}</EditChip></td>
                        <td>
                          <EditChip accent onClick={e => openMenu(e, s.id, "cadence")} active={menu?.id === s.id && menu?.field === "cadence"}>{s.schedule.frequency}</EditChip>
                          <div style={{ fontSize: "0.7rem", color: "var(--ink-4)", marginTop: 4 }}>next {formatNext(s.schedule.nextRunAt)}</div>
                        </td>
                        <td>
                          <button onClick={e => openMenu(e, s.id, "channels")} className="editchip">
                            <span className="row" style={{ gap: 6 }}>
                              <span style={{ opacity: tg?.connected ? 1 : 0.28, color: "var(--info)", display: "inline-flex" }}>{I.tg()}</span>
                              <span style={{ opacity: wa?.connected ? 1 : 0.28, color: "var(--accent)", display: "inline-flex" }}>{I.wa()}</span>
                            </span>
                            <span style={{ opacity: 0.5, display: "inline-flex" }}>{I.caret()}</span>
                          </button>
                        </td>
                        <td>
                          <div style={{ fontSize: "0.82rem", fontWeight: 550 }}>{s.stats.briefingsSent} briefs</div>
                          <div style={{ fontSize: "0.7rem", color: "var(--ink-4)" }}>{s.stats.sourcesTracked} sources · {s.stats.lastBriefing ?? "—"}</div>
                        </td>
                        <td>
                          <div className="row" style={{ gap: 6, justifyContent: "flex-end" }}>
                            <button className="icon-btn" title={on ? "Pause" : "Resume"} onClick={() => patch(s.id, sc => ({ ...sc, status: sc.status === "active" ? "paused" : "active" }))}>{on ? I.pause() : I.play()}</button>
                            <button className="icon-btn" title="Configure" onClick={() => alert(`A full editor for “${s.name}” arrives with the backend. For now, edit any cell inline.`)}>{I.gear()}</button>
                            <button className="icon-btn danger" title="Remove" onClick={() => { if (confirm(`Remove “${s.name}”? (local only)`)) setAgents(p => p?.filter(x => x.id !== s.id) ?? p); }}>{I.trash()}</button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <p className="t-muted" style={{ fontSize: "0.78rem", marginTop: 14 }}>Placeholder intelligence — edits are local until backend persistence is connected.</p>
      </main>

      {/* ── Popover ── */}
      {menu && activeAgent && (
        <div onClick={e => e.stopPropagation()} className="card popover" style={{ left: menu.x, top: menu.y, minWidth: menu.field === "channels" ? 260 : 200 }}>
          {menu.field === "status" && (["active", "paused"] as const).map(v => (
            <button key={v} className="pop-item" data-on={activeAgent.status === v} onClick={() => { patch(menu.id, s => ({ ...s, status: v })); setMenu(null); }}>
              <span className="dot" style={{ background: v === "active" ? "var(--accent)" : "var(--ink-4)" }} />{v === "active" ? "Active — monitoring" : "Paused — stopped"}
            </button>
          ))}
          {menu.field === "voice" && VOICES.map(v => (
            <button key={v} className="pop-item" data-on={activeAgent.personality.voice === v} onClick={() => { patch(menu.id, s => ({ ...s, personality: { ...s.personality, voice: v } })); setMenu(null); }}>{v}</button>
          ))}
          {menu.field === "language" && <div style={{ maxHeight: 250, overflowY: "auto" }}>{LANGUAGES.map(v => (
            <button key={v} className="pop-item" data-on={activeAgent.personality.language === v} onClick={() => { patch(menu.id, s => ({ ...s, personality: { ...s.personality, language: v } })); setMenu(null); }}>{v}</button>
          ))}</div>}
          {menu.field === "cadence" && CADENCES.map(c => (
            <button key={c.label} className="pop-item" data-on={activeAgent.schedule.frequency === c.label} onClick={() => { patch(menu.id, s => ({ ...s, schedule: { ...s.schedule, frequency: c.label, times: c.times, intervalMinutes: c.intervalMinutes, enabled: true } })); setMenu(null); }}>
              <span style={{ flex: 1 }}>{c.label}</span><span style={{ fontSize: "0.72rem", color: "var(--ink-4)" }}>{c.times.join(" · ")}</span>
            </button>
          ))}
          {menu.field === "channels" && (
            <div style={{ padding: 2 }}>
              <div className="eyebrow no-rule" style={{ padding: "6px 10px 8px" }}>Delivery channels</div>
              {([
                { key: "telegram" as const, name: "Telegram", icon: I.tg, color: "var(--info)", handle: "@you" },
                { key: "whatsapp" as const, name: "WhatsApp", icon: I.wa, color: "var(--accent)", handle: "coming soon" },
              ]).map(ch => {
                const p = activeAgent.platforms.find(x => x.platform === ch.key);
                const onx = !!p?.connected;
                const soon = ch.key === "whatsapp";
                return (
                  <button key={ch.key} className="pop-item" style={{ opacity: soon ? 0.7 : 1 }}
                    onClick={() => { if (soon) return; patch(menu.id, s => ({ ...s, platforms: togglePlatform(s.platforms, ch.key).map(x => x.platform === ch.key ? { ...x, handle: x.connected ? (x.handle ?? ch.handle) : x.handle } : x) })); }}>
                    <span style={{ color: ch.color, display: "inline-flex" }}>{ch.icon()}</span>
                    <span style={{ flex: 1, textAlign: "left" }}>
                      <span style={{ display: "block", fontSize: "0.85rem", fontWeight: 550 }}>{ch.name}</span>
                      <span style={{ display: "block", fontSize: "0.72rem", color: "var(--ink-3)" }}>{soon ? "Coming soon" : onx ? (p?.handle ?? "connected") : "not connected"}</span>
                    </span>
                    <span className="toggle" data-on={onx && !soon} />
                  </button>
                );
              })}
              <Link href="/delivery" className="pop-item" style={{ color: "var(--info)", fontSize: "0.8rem", justifyContent: "center" }}>Manage in Delivery →</Link>
            </div>
          )}
        </div>
      )}

      <style>{`
        .dash-split { display: grid; grid-template-columns: 1.5fr 1fr; gap: 20px; }
        @media (max-width: 860px) { .dash-split { grid-template-columns: 1fr; } }
        .stat-tile { transition: transform 0.2s var(--ease), box-shadow 0.2s var(--ease); }
        .stat-tile:hover { transform: translateY(-2px); box-shadow: var(--shadow-md); }
        .ask-bar { transition: border-color 0.2s var(--ease), box-shadow 0.2s var(--ease); }
        .ask-bar:focus-within { border-color: var(--accent-line); box-shadow: 0 0 0 3px var(--ring), var(--shadow-sm); }
        .brief-row { transition: background 0.15s var(--ease); }
        .brief-row:hover { background: var(--surface-2); }
        .brief-arrow { transition: transform 0.2s var(--ease), color 0.2s var(--ease); }
        .brief-row:hover .brief-arrow { transform: translateX(3px); color: var(--ink-2); }
        .live-row { transition: background 0.15s var(--ease); }
        .live-row:hover { background: var(--surface-2); }
        .agent-table { width: 100%; min-width: 920px; border-collapse: collapse; }
        .agent-table th { text-align: left; font-size: 0.68rem; font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase; color: var(--ink-4); padding: 13px 16px; border-bottom: 1px solid var(--line); background: var(--surface-2); white-space: nowrap; }
        .agent-table th:last-child { text-align: right; }
        .agent-table td { padding: 13px 16px; border-bottom: 1px solid var(--line); vertical-align: middle; white-space: nowrap; }
        .agent-table tbody tr:last-child td { border-bottom: none; }
        .agent-table tbody tr { transition: background 0.14s var(--ease); }
        .agent-table tbody tr:hover { background: var(--surface-2); }
      `}</style>
    </div>
  );
}
