"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Fragment, useEffect, useMemo, useState, useCallback, useRef } from "react";
import type { Agent } from "@/app/api/agents/route";
import AppNav from "@/components/AppNav";
import SavedTopicPicker, { SavedTopicShape } from "@/components/SavedTopicPicker";
import TimePicker from "@/components/TimePicker";
import BriefingHistoryPanel from "@/components/BriefingHistoryPanel";
import BriefingLibrary from "@/components/BriefingLibrary";
import Logo from "@/components/Logo";
import { I } from "@/components/icons";
import { formatElapsed } from "@/lib/format";
import { VOICES, LANGUAGES, CADENCES } from "@/lib/agentConstants";
import { WEEKDAYS, describeSchedule, describeNextRun, timezoneLabel, computeNextRunAt, detectTimezone, listTimezones } from "@/lib/schedule";

type Field = "status" | "voice" | "language" | "cadence" | "channels" | "actions";
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
  const [workIdx, setWorkIdx] = useState(0);
  const [editing, setEditing] = useState<Agent | null>(null);
  const [editForm, setEditForm] = useState({ name: "", niche: "", corePrompt: "" });
  const [savedTopics, setSavedTopics] = useState<SavedTopicShape[] | null>(null);
  const [topicPickerOpen, setTopicPickerOpen] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [cadenceDraft, setCadenceDraft] = useState<{ frequency: string; times: string[]; weekday: number | null; timezone: string } | null>(null);
  const [tzPickerOpen, setTzPickerOpen] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const zoneOptions = useMemo(listTimezones, []);
  const tableScrollRef = useRef<HTMLDivElement>(null);
  const [tableScroll, setTableScroll] = useState({ left: false, right: false });
  const popoverRef = useRef<HTMLDivElement>(null);

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
    // Click-outside-to-close, checked via containment against the popover's
    // own ref (same idea as the account menu in AppNav) rather than a fixed
    // wrapping container — this popover is one shared floating element used
    // by many different row/field triggers, so there's no single element to
    // wrap both "trigger + popover" together.
    //
    // Deliberately listens on "click" (bubble phase), not "mousedown": every
    // trigger's own onClick already calls stopPropagation (see openMenu), so
    // a genuine trigger click never reaches this document-level listener at
    // all — only real "clicked elsewhere" clicks do. Using mousedown instead
    // would fire before that trigger's click handler runs, closing the menu
    // first and breaking "click the same trigger again to close it" (the
    // click handler would then see a fresh, already-closed state and reopen
    // instead of toggling closed).
    const onOutsideClick = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) setMenu(null);
    };
    window.addEventListener("resize", close);
    window.addEventListener("scroll", close, true);
    document.addEventListener("keydown", onKey);
    document.addEventListener("click", onOutsideClick);
    return () => {
      window.removeEventListener("resize", close);
      window.removeEventListener("scroll", close, true);
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("click", onOutsideClick);
    };
  }, [menu]);

  // The agents table can be wider than its card (Voice/Language/Cadence/
  // Delivery/Activity all need room), so it scrolls horizontally — but that
  // wasn't discoverable: no visible affordance, and a vertical mouse wheel
  // over the table did nothing. This tracks scroll position for the fade
  // hints below and converts vertical wheel input into horizontal scroll
  // while there's still table content in that direction (falls through to
  // normal page scroll once the table has no more room to give).
  useEffect(() => {
    const el = tableScrollRef.current;
    if (!el) return;
    const update = () => setTableScroll({
      left: el.scrollLeft > 4,
      right: el.scrollLeft < el.scrollWidth - el.clientWidth - 4,
    });
    const onWheel = (e: WheelEvent) => {
      if (el.scrollWidth <= el.clientWidth) return;
      if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return;
      const goingRight = e.deltaY > 0;
      const atStart = el.scrollLeft <= 0;
      const atEnd = el.scrollLeft >= el.scrollWidth - el.clientWidth - 1;
      if ((goingRight && atEnd) || (!goingRight && atStart)) return;
      el.scrollLeft += e.deltaY;
      e.preventDefault();
    };
    update();
    el.addEventListener("scroll", update, { passive: true });
    el.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("resize", update);
    return () => {
      el.removeEventListener("scroll", update);
      el.removeEventListener("wheel", onWheel);
      window.removeEventListener("resize", update);
    };
  }, [agents]);

  // Applies the same fields the PATCH route accepts, so the UI reflects the
  // change the instant it's clicked instead of waiting on the round-trip.
  const applyOptimisticPatch = (agent: Agent, body: Record<string, unknown>): Agent => {
    const next: Agent = { ...agent, personality: { ...agent.personality }, schedule: { ...agent.schedule }, platforms: agent.platforms.map(p => ({ ...p })) };
    if (body.status === "active" || body.status === "paused") {
      next.status = body.status;
      next.schedule.enabled = body.status === "active";
    }
    if (typeof body.voice === "string") next.personality.voice = body.voice;
    if (typeof body.language === "string") next.personality.language = body.language;
    if (typeof body.telegramEnabled === "boolean") {
      next.platforms = next.platforms.map(p => (p.platform === "telegram" ? { ...p, connected: body.telegramEnabled as boolean } : p));
    }
    if (typeof body.whatsappEnabled === "boolean") {
      next.platforms = next.platforms.map(p => (p.platform === "whatsapp" ? { ...p, connected: body.whatsappEnabled as boolean } : p));
    }
    if (typeof body.timezone === "string") next.schedule.timezone = body.timezone;
    if (body.cadence && typeof body.cadence === "object") {
      const c = body.cadence as Record<string, unknown>;
      if (typeof c.frequency === "string") next.schedule.frequency = c.frequency;
      if (Array.isArray(c.times)) next.schedule.times = c.times as string[];
      if (c.weekday === null || typeof c.weekday === "number") next.schedule.weekday = c.weekday as number | null;
      if (typeof c.intervalMinutes === "number") next.schedule.intervalMinutes = c.intervalMinutes;
    }
    return next;
  };

  const patchAgent = useCallback(async (id: string, body: Record<string, unknown>) => {
    let prevAgent: Agent | undefined;
    setAgents(p => {
      const cur = p?.find(s => s.id === id);
      if (!cur) return p;
      prevAgent = cur;
      return p!.map(s => (s.id === id ? applyOptimisticPatch(s, body) : s));
    });
    try {
      const res = await fetch(`/api/agents/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (data.success && data.agent) setAgents(p => p?.map(s => (s.id === id ? data.agent : s)) ?? p);
      else if (prevAgent) { const reverted = prevAgent; setAgents(p => p?.map(s => (s.id === id ? reverted : s)) ?? p); }
    } catch {
      if (prevAgent) { const reverted = prevAgent; setAgents(p => p?.map(s => (s.id === id ? reverted : s)) ?? p); }
    }
  }, []);

  const removeAgent = useCallback(async (id: string, name: string) => {
    if (!confirm(`Remove "${name}"?`)) return;
    try {
      const res = await fetch(`/api/agents/${id}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (data.success) setAgents(p => p?.filter(x => x.id !== id) ?? p);
    } catch { /* leave agent in place on failure */ }
  }, []);

  const openMenu = (e: React.MouseEvent, id: string, field: Field) => {
    e.stopPropagation();
    if (menu && menu.id === id && menu.field === field) return setMenu(null);
    if (field === "cadence") {
      const a = agents?.find(s => s.id === id);
      setCadenceDraft(a ? { frequency: a.schedule.frequency, times: a.schedule.times, weekday: a.schedule.weekday, timezone: a.schedule.timezone || detectTimezone() } : null);
      setTzPickerOpen(false);
    }
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const x = Math.min(r.left, window.innerWidth - 250);
    // Leave at least ~280px of room below the popover's top edge so it never
    // opens nearly invisible on a short viewport (e.g. the last table row on
    // a phone-width window) — anything taller than the remaining room falls
    // back to the popover's own max-height + scroll (see the .popover style below).
    const y = Math.max(12, Math.min(r.bottom + 6, window.innerHeight - 280));
    setMenu({ id, field, x, y });
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

        {/* ── Stats ── */}
        <div className="grid rise-1" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 14, marginBottom: 32 }}>
          <StatTile value={summary.total} label="Agents deployed" icon={I.agents()} />
          <StatTile value={summary.active} label="Working now" live={summary.active > 0} icon={I.bolt()} />
          <StatTile value={summary.sources} label="Sources monitored" icon={I.source()} />
          <StatTile value={summary.briefs} label="Voice notes sent" icon={I.mic()} />
        </div>

        {/* ── Brief + Live panel ── */}
        <div className="dash-split rise-2" style={{ marginBottom: 44 }}>
          {/* Briefing library — the full history across every agent, filterable
              and scrollable, rather than a fixed peek at the latest few. */}
          <div className="card" style={{ overflow: "hidden", display: "flex", flexDirection: "column" }}>
            <BriefingLibrary agents={agents} />
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
          <div className="card" style={{ overflow: "hidden", padding: 0, position: "relative" }}>
            <div ref={tableScrollRef} className="agent-table-scroll">
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
                      <Fragment key={s.id}>
                      <tr>
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
                        </td>
                        <td>
                          <button onClick={e => openMenu(e, s.id, "channels")} className="editchip">
                            <span className="row" style={{ gap: 6 }}>
                              <span style={{ display: "inline-flex" }} title="Leora — in-app & push, always on"><Logo size={14} /></span>
                              <span style={{ opacity: tg?.connected ? 1 : 0.28, color: "var(--info)", display: "inline-flex" }}>{I.tg()}</span>
                              <span style={{ opacity: wa?.connected ? 1 : 0.28, color: "var(--accent)", display: "inline-flex" }}>{I.wa()}</span>
                            </span>
                            <span style={{ opacity: 0.5, display: "inline-flex" }}>{I.caret()}</span>
                          </button>
                        </td>
                        <td>
                          <div style={{ fontSize: "0.82rem", fontWeight: 550 }}>{s.stats.briefingsSent} briefs</div>
                          <div style={{ fontSize: "0.7rem", color: "var(--ink-4)" }}>{s.stats.sourcesTracked} sources · {formatElapsed(s.stats.lastBriefing)}</div>
                        </td>
                        <td style={{ textAlign: "right" }}>
                          <button
                            className="icon-btn"
                            title="Agent actions"
                            aria-label="Agent actions"
                            onClick={e => openMenu(e, s.id, "actions")}
                          >{I.more()}</button>
                        </td>
                      </tr>
                      {expandedId === s.id && (
                        <tr className="briefing-history-row">
                          <td colSpan={8} style={{ padding: 0 }}>
                            <BriefingHistoryPanel agentId={s.id} accent={s.accent} />
                          </td>
                        </tr>
                      )}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="table-fade table-fade-left" style={{ opacity: tableScroll.left ? 1 : 0 }} aria-hidden="true" />
            <div className="table-fade table-fade-right" style={{ opacity: tableScroll.right ? 1 : 0 }} aria-hidden="true">{I.arrow()}</div>
          </div>
        )}

      </main>

      {/* ── Popover ── */}
      {menu && activeAgent && (
        <div
          ref={popoverRef}
          onClick={e => e.stopPropagation()}
          className="card popover"
          style={{
            left: menu.x, top: menu.y,
            minWidth: menu.field === "channels" ? 260 : menu.field === "cadence" ? 300 : menu.field === "actions" ? 225 : 200,
            maxHeight: `calc(100vh - ${menu.y}px - 12px)`, overflowY: "auto",
          }}
        >
          {menu.field === "status" && (["active", "paused"] as const).map(v => (
            <button key={v} className="pop-item" data-on={activeAgent.status === v} onClick={() => { patchAgent(menu.id, { status: v }); setMenu(null); }}>
              <span className="dot" style={{ background: v === "active" ? "var(--accent)" : "var(--ink-4)" }} />{v === "active" ? "Active — monitoring" : "Paused — stopped"}
            </button>
          ))}
          {menu.field === "voice" && VOICES.map(v => (
            <button key={v} className="pop-item" data-on={activeAgent.personality.voice === v} onClick={() => { patchAgent(menu.id, { voice: v }); setMenu(null); }}>{v}</button>
          ))}
          {menu.field === "language" && <div style={{ maxHeight: 250, overflowY: "auto" }}>{LANGUAGES.map(v => (
            <button key={v} className="pop-item" data-on={activeAgent.personality.language === v} onClick={() => { patchAgent(menu.id, { language: v }); setMenu(null); }}>{v}</button>
          ))}</div>}
          {menu.field === "cadence" && cadenceDraft && (() => {
            const activeCadence = CADENCES.find(c => c.label === cadenceDraft.frequency) ?? CADENCES[3];
            return (
              <div style={{ padding: 2 }}>
                {CADENCES.map(c => (
                  <button key={c.label} className="pop-item" data-on={cadenceDraft.frequency === c.label}
                    onClick={() => setCadenceDraft(draft => draft && { ...draft, frequency: c.label, times: c.defaultTimes, weekday: c.needsWeekday ? (draft.weekday ?? 1) : null })}>
                    <span style={{ marginRight: 7 }}>{c.icon}</span>{c.label}
                  </button>
                ))}
                {activeCadence.needsWeekday && (
                  <div className="row wrap" style={{ gap: 4, padding: "8px 10px 0" }}>
                    {WEEKDAYS.map((d, i) => (
                      <button key={d} type="button" onClick={() => setCadenceDraft(draft => draft && { ...draft, weekday: i })}
                        className="chip" data-on={cadenceDraft.weekday === i}
                        style={{ padding: "4px 9px", fontSize: "0.72rem", cursor: "pointer", background: cadenceDraft.weekday === i ? "var(--accent-soft)" : undefined, borderColor: cadenceDraft.weekday === i ? "var(--accent-line)" : undefined }}>
                        {d}
                      </button>
                    ))}
                  </div>
                )}
                {activeCadence.timeSlots > 0 && (
                  <div className="col" style={{ gap: 12, padding: "10px 10px 0" }}>
                    {Array.from({ length: activeCadence.timeSlots }).map((_, i) => (
                      <div key={i}>
                        {activeCadence.timeSlots > 1 && (
                          <div style={{ fontSize: "0.66rem", fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase", color: "var(--ink-4)", marginBottom: 6 }}>
                            {i === 0 ? "First delivery" : "Second delivery"}
                          </div>
                        )}
                        <TimePicker
                          value={cadenceDraft.times[i] ?? "09:00"}
                          onChange={v => setCadenceDraft(draft => {
                            if (!draft) return draft;
                            const next = [...draft.times]; next[i] = v; return { ...draft, times: next };
                          })}
                        />
                      </div>
                    ))}
                  </div>
                )}

                <div style={{ padding: "8px 10px 0" }}>
                  {tzPickerOpen ? (
                    <div className="col" style={{ gap: 6 }}>
                      <select
                        value={cadenceDraft.timezone}
                        onChange={e => setCadenceDraft(draft => draft && { ...draft, timezone: e.target.value })}
                        className="input"
                        style={{ height: 32, fontSize: "0.74rem" }}
                      >
                        {zoneOptions.map(z => <option key={z} value={z}>{timezoneLabel(z)}</option>)}
                      </select>
                      <button type="button" onClick={() => setTzPickerOpen(false)} className="pop-item" style={{ justifyContent: "center", fontSize: "0.72rem" }}>Done</button>
                    </div>
                  ) : (
                    <div className="row between" style={{ gap: 6 }}>
                      <span style={{ fontSize: "0.72rem", color: "var(--ink-3)" }}>🌍 {timezoneLabel(cadenceDraft.timezone)}</span>
                      <button type="button" onClick={() => setTzPickerOpen(true)} style={{ fontSize: "0.7rem", color: "var(--accent-ink)", background: "none", border: "none", cursor: "pointer", padding: 0 }}>Change</button>
                    </div>
                  )}
                </div>

                <p style={{ fontSize: "0.72rem", color: "var(--ink-4)", padding: "8px 10px 0" }}>
                  {describeSchedule({ frequency: cadenceDraft.frequency, intervalMinutes: activeCadence.intervalMinutes, times: cadenceDraft.times, weekday: cadenceDraft.weekday, timezone: cadenceDraft.timezone })}
                </p>
                <p style={{ fontSize: "0.72rem", color: "var(--accent-ink)", fontWeight: 500, padding: "2px 10px 4px" }}>
                  Next: {describeNextRun(computeNextRunAt({ frequency: cadenceDraft.frequency, intervalMinutes: activeCadence.intervalMinutes, times: cadenceDraft.times, weekday: cadenceDraft.weekday, timezone: cadenceDraft.timezone }), cadenceDraft.timezone)}
                </p>
                <button className="pop-item" style={{ justifyContent: "center", color: "var(--accent-ink)", fontWeight: 600 }}
                  onClick={() => {
                    patchAgent(menu.id, {
                      cadence: { frequency: cadenceDraft.frequency, times: cadenceDraft.times, weekday: cadenceDraft.weekday, intervalMinutes: activeCadence.intervalMinutes },
                      timezone: cadenceDraft.timezone,
                    });
                    setMenu(null);
                  }}>
                  Save schedule
                </button>
              </div>
            );
          })()}
          {menu.field === "channels" && (
            <div style={{ padding: 2 }}>
              <div className="eyebrow no-rule" style={{ padding: "6px 10px 8px" }}>Delivery channels</div>

              {/* Leora (in-app + push) isn't actually a per-agent toggle on the
                  backend — every briefing is always persisted to the dashboard
                  and pushed regardless of which external channels are linked.
                  No onClick: the switch always reads "on" and there's nothing
                  to flip, but it matches the Telegram/WhatsApp row styling. */}
              <button className="pop-item" style={{ cursor: "default" }}>
                <Logo size={16} />
                <span style={{ flex: 1, textAlign: "left" }}>
                  <span style={{ display: "block", fontSize: "0.85rem", fontWeight: 550 }}>Leora</span>
                  <span style={{ display: "block", fontSize: "0.72rem", color: "var(--ink-3)" }}>In-app &amp; push notification</span>
                </span>
                <span className="toggle" data-on={true} />
              </button>

              {([
                { key: "telegram" as const, name: "Telegram", icon: I.tg, color: "var(--info)" },
                { key: "whatsapp" as const, name: "WhatsApp", icon: I.wa, color: "var(--accent)" },
              ]).map(ch => {
                const p = activeAgent.platforms.find(x => x.platform === ch.key);
                const onx = !!p?.connected;
                return (
                  <button key={ch.key} className="pop-item"
                    onClick={() => patchAgent(menu.id, ch.key === "telegram" ? { telegramEnabled: !onx } : { whatsappEnabled: !onx })}>
                    <span style={{ color: ch.color, display: "inline-flex" }}>{ch.icon()}</span>
                    <span style={{ flex: 1, textAlign: "left" }}>
                      <span style={{ display: "block", fontSize: "0.85rem", fontWeight: 550 }}>{ch.name}</span>
                      <span style={{ display: "block", fontSize: "0.72rem", color: "var(--ink-3)" }}>{onx ? (p?.handle ?? "connected") : "not connected"}</span>
                    </span>
                    <span className="toggle" data-on={onx} />
                  </button>
                );
              })}
            </div>
          )}
          {menu.field === "actions" && (
            <div style={{ padding: 2 }}>
              <button className="pop-item" onClick={() => { setExpandedId(expandedId === menu.id ? null : menu.id); setMenu(null); }}>
                <span style={{ color: "var(--ink-3)", display: "inline-flex" }}>{I.clock()}</span>
                <span style={{ flex: 1, textAlign: "left" }}>{expandedId === menu.id ? "Hide briefing history" : "Briefing history"}</span>
              </button>
              <button className="pop-item" onClick={() => { patchAgent(menu.id, { status: activeAgent.status === "active" ? "paused" : "active" }); setMenu(null); }}>
                <span style={{ color: "var(--ink-3)", display: "inline-flex" }}>{activeAgent.status === "active" ? I.pause() : I.play()}</span>
                <span style={{ flex: 1, textAlign: "left" }}>{activeAgent.status === "active" ? "Pause agent" : "Resume agent"}</span>
              </button>
              <button
                className="pop-item"
                onClick={() => {
                  setEditing(activeAgent);
                  setEditForm({ name: activeAgent.name, niche: activeAgent.niche, corePrompt: activeAgent.corePrompt ?? "" });
                  setTopicPickerOpen(false);
                  if (savedTopics === null) {
                    fetch("/api/saved-topics").then(r => r.json()).then(d => { if (d.success) setSavedTopics(d.topics); }).catch(() => {});
                  }
                  setMenu(null);
                }}
              >
                <span style={{ color: "var(--ink-3)", display: "inline-flex" }}>{I.gear()}</span>
                <span style={{ flex: 1, textAlign: "left" }}>Configure</span>
              </button>
              <div className="hairline" style={{ margin: "4px 6px" }} />
              <button
                className="pop-item"
                style={{ color: "var(--danger)" }}
                onClick={() => { const a = activeAgent; setMenu(null); removeAgent(a.id, a.name); }}
              >
                <span style={{ display: "inline-flex" }}>{I.trash()}</span>
                <span style={{ flex: 1, textAlign: "left" }}>Remove agent</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Configure modal ── */}
      {editing && (
        <div onClick={() => !savingEdit && setEditing(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "grid", placeItems: "center", zIndex: 100 }}>
          <div onClick={e => e.stopPropagation()} className="card" style={{ width: 380, padding: 22, borderRadius: "var(--r-lg)" }}>
            <div style={{ fontSize: "1rem", fontWeight: 600, marginBottom: 16 }}>Configure agent</div>
            <div className="col" style={{ gap: 12, marginBottom: 18 }}>
              <div>
                <label style={{ fontSize: "0.75rem", color: "var(--ink-3)", marginBottom: 5, display: "block" }}>Name</label>
                <input className="input" value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div>
                <label style={{ fontSize: "0.75rem", color: "var(--ink-3)", marginBottom: 5, display: "block" }}>Topic</label>
                <input className="input" value={editForm.niche} onChange={e => setEditForm(f => ({ ...f, niche: e.target.value }))} />
              </div>
              <div>
                <div className="row between" style={{ marginBottom: 5 }}>
                  <label style={{ fontSize: "0.75rem", color: "var(--ink-3)" }}>Agent's role</label>
                  {!topicPickerOpen && savedTopics && savedTopics.length > 0 && (
                    <button type="button" onClick={() => setTopicPickerOpen(true)} className="btn btn-ghost btn-sm" style={{ height: "auto", padding: "1px 6px", fontSize: "0.72rem" }}>🔁 Swap from saved</button>
                  )}
                </div>
                {topicPickerOpen ? (
                  <SavedTopicPicker
                    topics={savedTopics ?? []}
                    loading={savedTopics === null}
                    onSelect={(t) => { setEditForm(f => ({ ...f, niche: t.topic, corePrompt: t.corePrompt })); setTopicPickerOpen(false); }}
                    onDelete={(id) => { setSavedTopics(prev => prev?.filter(t => t.id !== id) ?? prev); fetch(`/api/saved-topics/${id}`, { method: "DELETE" }).catch(() => {}); }}
                    onClose={() => setTopicPickerOpen(false)}
                  />
                ) : (
                  <>
                    <textarea
                      className="input"
                      value={editForm.corePrompt}
                      onChange={e => setEditForm(f => ({ ...f, corePrompt: e.target.value }))}
                      placeholder="The research directive locked in with Leora — what this agent watches for and prioritizes."
                      rows={4}
                      style={{ height: "auto", padding: "10px 12px", resize: "vertical", fontFamily: "inherit", lineHeight: 1.5 }}
                    />
                    <p style={{ fontSize: "0.7rem", color: "var(--ink-4)", marginTop: 5 }}>Locked in via the onboarding chat — tweak it here, or swap in a saved topic.</p>
                  </>
                )}
              </div>
            </div>
            <div className="row" style={{ gap: 8, justifyContent: "flex-end" }}>
              <button className="btn btn-ghost btn-sm" onClick={() => setEditing(null)} disabled={savingEdit}>Cancel</button>
              <button
                className="btn btn-primary btn-sm"
                disabled={savingEdit || !editForm.name.trim() || !editForm.niche.trim()}
                onClick={async () => {
                  setSavingEdit(true);
                  await patchAgent(editing.id, { name: editForm.name.trim(), niche: editForm.niche.trim(), topics: [editForm.niche.trim()], corePrompt: editForm.corePrompt.trim() });
                  setSavingEdit(false);
                  setEditing(null);
                }}
              >
                {savingEdit ? <span className="spinner" style={{ width: 13, height: 13 }} /> : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .dash-split { display: grid; grid-template-columns: 1.5fr 1fr; gap: 20px; }
        @media (max-width: 860px) { .dash-split { grid-template-columns: 1fr; } }
        .stat-tile { transition: transform 0.2s var(--ease), box-shadow 0.2s var(--ease); }
        .stat-tile:hover { transform: translateY(-2px); box-shadow: var(--shadow-md); }
        .brief-row { transition: background 0.15s var(--ease); }
        .brief-row:hover { background: var(--surface-2); }
        .live-row { transition: background 0.15s var(--ease); }
        .live-row:hover { background: var(--surface-2); }
        .agent-table-scroll { overflow-x: auto; }
        .agent-table-scroll::-webkit-scrollbar { height: 9px; }
        .agent-table-scroll::-webkit-scrollbar-track { background: var(--surface-2); }
        .agent-table-scroll::-webkit-scrollbar-thumb { background: var(--line-3); border-radius: 999px; }
        .agent-table-scroll::-webkit-scrollbar-thumb:hover { background: var(--ink-4); }
        .agent-table { width: 100%; min-width: 920px; border-collapse: collapse; }
        .agent-table th { text-align: left; font-size: 0.68rem; font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase; color: var(--ink-4); padding: 13px 16px; border-bottom: 1px solid var(--line); background: var(--surface-2); white-space: nowrap; }
        .agent-table th:last-child { text-align: right; }
        .agent-table td { padding: 13px 16px; border-bottom: 1px solid var(--line); vertical-align: middle; white-space: nowrap; }
        .agent-table tbody tr:last-child td { border-bottom: none; }
        .agent-table tbody tr { transition: background 0.14s var(--ease); }
        .agent-table tbody tr:hover { background: var(--surface-2); }
        /* Sticky identity column — stays in view while Voice/Language/Cadence/
           Delivery/Activity scroll underneath it. Excludes the expanded
           briefing-history row, whose single colSpan=8 cell would otherwise
           match :first-child too and get pinned incoherently. */
        .agent-table th:first-child, .agent-table tbody tr:not(.briefing-history-row) td:first-child { position: sticky; left: 0; z-index: 2; }
        .agent-table th:first-child { background: var(--surface-2); border-right: 1px solid var(--line); }
        .agent-table tbody tr:not(.briefing-history-row) td:first-child { background: var(--surface); border-right: 1px solid var(--line); }
        .agent-table tbody tr:not(.briefing-history-row):hover td:first-child { background: var(--surface-2); }
        .table-fade { position: absolute; top: 0; bottom: 0; width: 44px; pointer-events: none; z-index: 3; transition: opacity 0.2s var(--ease); display: flex; align-items: center; }
        .table-fade-left { left: 0; background: linear-gradient(to right, var(--surface), transparent); }
        .table-fade-right { right: 0; justify-content: flex-end; background: linear-gradient(to left, var(--surface), transparent); color: var(--ink-4); }
        .table-fade-right svg { margin-right: 8px; animation: hint-nudge 1.6s var(--ease) infinite; }
        @keyframes hint-nudge { 0%, 100% { transform: translateX(0); opacity: 0.55; } 50% { transform: translateX(4px); opacity: 1; } }
        .briefing-history-row td { white-space: normal; }
        .briefing-history-row:hover { background: transparent !important; }
        .briefing-history { background: var(--surface-2); padding: 16px 20px; border-top: 1px dashed var(--line); }
        .briefing-list { display: flex; flex-direction: column; gap: 10px; max-height: 320px; overflow-y: auto; }
        .briefing-row { display: flex; align-items: center; gap: 12px; background: var(--surface); border: 1px solid var(--line); border-radius: var(--r-md); padding: 12px 14px; }
        .briefing-play { flex-shrink: 0; width: 34px; height: 34px; border-radius: 50%; border: none; display: grid; place-items: center; cursor: pointer; transition: transform 0.14s var(--ease); }
        .briefing-play:hover { transform: scale(1.06); }
      `}</style>
    </div>
  );
}
