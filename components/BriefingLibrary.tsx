"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Agent } from "@/app/api/agents/route";
import MorningBriefRow, { RecentBriefing } from "@/components/MorningBriefRow";
import { I } from "@/components/icons";

/* Rows fetched per request. Small enough that the first paint is fast, big
   enough that a normal scroll fills more than a screen before asking again. */
const PAGE = 8;

type ApiBriefing = Omit<RecentBriefing, "niche" | "accent">;

/* Day buckets, so a long history reads as a timeline rather than an
   undifferentiated stack of "3d ago" rows. */
function dayKey(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function dayLabel(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (dayKey(d) === dayKey(today)) return "Today";
  if (dayKey(d) === dayKey(yesterday)) return "Yesterday";
  return d.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    ...(d.getFullYear() === today.getFullYear() ? {} : { year: "numeric" }),
  });
}

/* The dashboard's full briefing history across every agent: an agent filter
   bar over a paginated, day-grouped list.

   Pages are appended as the sentinel at the bottom of the scroller comes into
   view, with an explicit "Load older" button behind the same handler so
   keyboard and screen-reader users aren't dependent on the
   IntersectionObserver path. */
export default function BriefingLibrary({ agents }: { agents: Agent[] | null }) {
  const [items, setItems] = useState<ApiBriefing[] | null>(null);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(false);
  const [agentFilter, setAgentFilter] = useState<string | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [scrolled, setScrolled] = useState(false);
  const [atEnd, setAtEnd] = useState(true);

  const scrollRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  /* Guards against a slow response for a filter the user has already moved
     off — only the newest request is allowed to write state. */
  const reqId = useRef(0);

  const fetchPage = useCallback(async (skip: number, filter: string | null) => {
    const mine = ++reqId.current;
    const qs = new URLSearchParams({ limit: String(PAGE), skip: String(skip) });
    if (filter) qs.set("agentId", filter);
    try {
      const res = await fetch(`/api/briefings/recent?${qs}`);
      const data = await res.json();
      if (mine !== reqId.current) return;
      if (!data.success) { setError(true); return; }
      setError(false);
      setTotal(data.total);
      setHasMore(data.hasMore);
      setItems((prev) => (skip === 0 || prev === null ? data.briefings : [...prev, ...data.briefings]));
    } catch {
      if (mine === reqId.current) setError(true);
    }
  }, []);

  // Reset to page one whenever the agent filter changes.
  useEffect(() => {
    setItems(null);
    setError(false);
    setPlayingId(null);
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
    fetchPage(0, agentFilter);
  }, [agentFilter, fetchPage]);

  const loadMore = useCallback(() => {
    if (loadingMore || !hasMore || items === null) return;
    setLoadingMore(true);
    fetchPage(items.length, agentFilter).finally(() => setLoadingMore(false));
  }, [loadingMore, hasMore, items, agentFilter, fetchPage]);

  // Auto-page when the bottom sentinel scrolls into the list's viewport.
  useEffect(() => {
    const el = sentinelRef.current;
    const root = scrollRef.current;
    if (!el || !root || !hasMore) return;
    const io = new IntersectionObserver(
      (entries) => { if (entries[0].isIntersecting) loadMore(); },
      { root, rootMargin: "120px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [hasMore, loadMore]);

  /* Drives the "jump to newest" pill and the bottom fade, so the card always
     advertises that there is more history below the fold. */
  const onScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setScrolled(el.scrollTop > 180);
    setAtEnd(el.scrollHeight - el.scrollTop - el.clientHeight < 24);
  }, []);

  useEffect(() => { onScroll(); }, [items, onScroll]);

  const agentById = useMemo(() => new Map((agents ?? []).map((a) => [a.id, a])), [agents]);

  /* Join each briefing with its agent's accent/topic. Agents deleted after a
     briefing was recorded fall back to neutral styling rather than vanishing —
     the history outlives the agent config. */
  const rows: RecentBriefing[] | null = useMemo(() => {
    if (items === null) return null;
    return items.map((b) => {
      const a = agentById.get(b.agentId);
      return { ...b, accent: a?.accent ?? "#4d7fff", niche: a?.niche ?? "" };
    });
  }, [items, agentById]);

  // Rows arrive newest-first, so consecutive same-day rows are already adjacent.
  const groups = useMemo(() => {
    if (!rows) return [];
    const out: { key: string; label: string; rows: RecentBriefing[] }[] = [];
    for (const r of rows) {
      const key = dayKey(new Date(r.createdAt));
      const last = out[out.length - 1];
      if (last && last.key === key) last.rows.push(r);
      else out.push({ key, label: dayLabel(r.createdAt), rows: [r] });
    }
    return out;
  }, [rows]);

  const filterAgents = (agents ?? []).filter((a) => (a.stats?.briefingsSent ?? 0) > 0);
  const activeAgent = agentFilter ? agentById.get(agentFilter) : undefined;

  // "Fresh" is earned, not decorative: only if the newest briefing is < 24h old.
  const fresh = !!rows?.length && Date.now() - new Date(rows[0].createdAt).getTime() < 864e5;

  return (
    <div className="brief-lib">
      {/* ── Header ── */}
      <div className="row between" style={{ padding: "18px 22px", borderBottom: "1px solid var(--line)", gap: 12 }}>
        <div style={{ minWidth: 0 }}>
          <div className="eyebrow no-rule" style={{ marginBottom: 4 }}>Briefing library</div>
          <div style={{ fontSize: "1.05rem", fontWeight: 600, letterSpacing: "-0.02em" }}>
            {activeAgent ? activeAgent.name : "Everything your agents have sent"}
          </div>
        </div>
        <div className="row" style={{ gap: 8, flexShrink: 0 }}>
          {total > 0 && (
            <span className="badge badge-muted">{total} briefing{total === 1 ? "" : "s"}</span>
          )}
          {fresh && <span className="badge badge-accent"><span className="dot" /> Fresh</span>}
        </div>
      </div>

      {/* ── Agent filter bar ── */}
      {filterAgents.length > 0 && (
        <div className="lib-filters" role="group" aria-label="Filter briefings by agent">
          <button
            className="lib-pill"
            data-on={agentFilter === null}
            onClick={() => setAgentFilter(null)}
            aria-pressed={agentFilter === null}
          >
            <span className="row center" style={{ width: 15, height: 15 }}>{I.agents()}</span>
            All agents
            {agentFilter === null && total > 0 && <span className="lib-count">{total}</span>}
          </button>

          {filterAgents.map((a) => {
            const on = agentFilter === a.id;
            return (
              <button
                key={a.id}
                className="lib-pill"
                data-on={on}
                onClick={() => setAgentFilter(on ? null : a.id)}
                aria-pressed={on}
                style={on ? ({ "--pill-accent": a.accent } as React.CSSProperties) : undefined}
                title={a.niche || a.name}
              >
                <span aria-hidden="true" style={{ fontSize: 13 }}>{a.icon}</span>
                <span className="lib-pill-name">{a.name}</span>
                <span className="lib-count">{on ? total : a.stats?.briefingsSent ?? 0}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* ── Scrolling history ── */}
      <div className="lib-scroll-wrap">
        <div className="lib-scroll" ref={scrollRef} onScroll={onScroll} tabIndex={0} aria-label="Briefing history">
          {rows === null && !error && (
            <div style={{ padding: "14px 22px", display: "flex", flexDirection: "column", gap: 10 }}>
              <div className="skeleton" style={{ height: 76, borderRadius: "var(--r-sm)" }} />
              <div className="skeleton" style={{ height: 76, borderRadius: "var(--r-sm)" }} />
              <div className="skeleton" style={{ height: 76, borderRadius: "var(--r-sm)" }} />
            </div>
          )}

          {error && rows === null && (
            <div style={{ padding: "44px 22px", textAlign: "center" }}>
              <p className="t-2" style={{ fontSize: "0.9rem", marginBottom: 12 }}>Couldn&apos;t load your briefings.</p>
              <button className="btn btn-secondary btn-sm" onClick={() => fetchPage(0, agentFilter)}>Try again</button>
            </div>
          )}

          {rows?.length === 0 && (
            <div style={{ padding: "48px 22px", textAlign: "center" }}>
              <div className="row center" style={{ width: 44, height: 44, borderRadius: "var(--r-md)", background: "var(--surface-2)", border: "1px solid var(--line)", color: "var(--ink-3)", margin: "0 auto 14px" }}>{I.mic()}</div>
              <p className="t-2" style={{ fontSize: "0.9rem" }}>
                {activeAgent
                  ? `${activeAgent.name} hasn't sent a briefing yet.`
                  : "Your briefings will appear here once an agent runs."}
              </p>
            </div>
          )}

          {groups.map((g, gi) => (
            <div key={g.key}>
              <div className="lib-day">
                <span>{g.label}</span>
                <span className="lib-day-n">{g.rows.length}</span>
              </div>
              {g.rows.map((b, ri) => (
                <MorningBriefRow
                  key={b.id}
                  briefing={b}
                  divider={ri > 0}
                  showAgent={agentFilter === null}
                  isPlaying={playingId === b.id}
                  /* Functional update: AudioPlayer also calls this when the
                     browser rejects play(), by which point a positional read
                     of playingId could be a render behind. */
                  onToggle={() => setPlayingId((prev) => (prev === b.id ? null : b.id))}
                />
              ))}
            </div>
          ))}

          {/* Paging sentinel, doubling as its own keyboard-reachable trigger. */}
          {rows !== null && rows.length > 0 && (
            <div ref={sentinelRef} className="lib-foot">
              {hasMore ? (
                <button className="btn btn-ghost btn-sm" onClick={loadMore} disabled={loadingMore}>
                  {loadingMore ? <><span className="spinner" style={{ width: 13, height: 13 }} /> Loading…</> : "Load older briefings"}
                </button>
              ) : (
                <span style={{ fontSize: "0.75rem", color: "var(--ink-4)" }}>
                  That&apos;s all {total} briefing{total === 1 ? "" : "s"}{activeAgent ? ` from ${activeAgent.name}` : ""}.
                </span>
              )}
            </div>
          )}
        </div>

        {/* Fade hints that content continues past the bottom edge. */}
        <div className="lib-fade" data-hidden={atEnd || !rows?.length} aria-hidden="true" />

        <button
          className="lib-top"
          data-show={scrolled}
          onClick={() => scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" })}
          tabIndex={scrolled ? 0 : -1}
          aria-hidden={!scrolled}
        >
          <span style={{ display: "inline-flex", transform: "rotate(-90deg)" }}>{I.arrow()}</span> Newest
        </button>
      </div>

      <style>{`
        .brief-lib { display: flex; flex-direction: column; min-height: 0; }
        /* Keeps the currently-playing row findable after you've scrolled on. */
        .brief-lib .brief-row[data-playing] { background: var(--surface-2); box-shadow: inset 3px 0 0 var(--accent); }

        .lib-filters {
          display: flex; gap: 7px; padding: 12px 22px; overflow-x: auto;
          border-bottom: 1px solid var(--line); scrollbar-width: none;
        }
        .lib-filters::-webkit-scrollbar { display: none; }
        .lib-pill {
          --pill-accent: var(--accent);
          display: inline-flex; align-items: center; gap: 6px; flex-shrink: 0;
          height: 30px; padding: 0 11px; border-radius: 999px; cursor: pointer;
          border: 1px solid var(--line-2); background: var(--surface);
          color: var(--ink-2); font-size: 0.78rem; font-weight: 500;
          font-family: inherit; white-space: nowrap;
          transition: background 0.15s var(--ease), border-color 0.15s var(--ease), color 0.15s var(--ease);
        }
        .lib-pill:hover { border-color: var(--line-3); background: var(--surface-2); color: var(--ink); }
        .lib-pill[data-on="true"] {
          border-color: var(--pill-accent); color: var(--ink);
          background: color-mix(in srgb, var(--pill-accent) 12%, transparent);
        }
        .lib-pill:focus-visible { outline: none; box-shadow: 0 0 0 3px var(--ring); }
        .lib-pill-name { max-width: 130px; overflow: hidden; text-overflow: ellipsis; }
        .lib-count {
          display: inline-grid; place-items: center; min-width: 18px; height: 18px;
          padding: 0 5px; border-radius: 999px; background: var(--surface-2);
          font-size: 0.66rem; font-weight: 600; color: var(--ink-3);
        }
        .lib-pill[data-on="true"] .lib-count { background: var(--pill-accent); color: #fff; }

        .lib-scroll-wrap { position: relative; min-height: 0; flex: 1; }
        .lib-scroll { max-height: 460px; overflow-y: auto; overscroll-behavior: contain; }
        .lib-scroll:focus-visible { outline: none; box-shadow: inset 0 0 0 2px var(--ring); }
        .lib-scroll::-webkit-scrollbar { width: 9px; }
        .lib-scroll::-webkit-scrollbar-track { background: transparent; }
        .lib-scroll::-webkit-scrollbar-thumb { background: var(--line-3); border-radius: 999px; }
        .lib-scroll::-webkit-scrollbar-thumb:hover { background: var(--ink-4); }

        /* Sticky day header — the scroller is its containing block, so the
           label for the group you're reading stays pinned to the top edge. */
        .lib-day {
          position: sticky; top: 0; z-index: 2;
          display: flex; align-items: center; gap: 8px;
          padding: 7px 22px;
          background: var(--surface-2);
          border-block: 1px solid var(--line);
          font-size: 0.68rem; font-weight: 600; letter-spacing: 0.06em;
          text-transform: uppercase; color: var(--ink-4);
        }
        .lib-day-n {
          display: inline-grid; place-items: center; min-width: 16px; height: 16px;
          padding: 0 4px; border-radius: 999px; background: var(--surface);
          border: 1px solid var(--line); font-size: 0.62rem; letter-spacing: 0;
        }

        .lib-foot { display: flex; justify-content: center; padding: 14px 22px 18px; }

        .lib-fade {
          position: absolute; left: 0; right: 9px; bottom: 0; height: 44px;
          pointer-events: none; opacity: 1; transition: opacity 0.25s var(--ease);
          background: linear-gradient(to top, var(--surface), transparent);
        }
        .lib-fade[data-hidden="true"] { opacity: 0; }

        .lib-top {
          position: absolute; left: 50%; top: 10px; transform: translate(-50%, -8px);
          display: inline-flex; align-items: center; gap: 5px;
          height: 28px; padding: 0 12px; border-radius: 999px; cursor: pointer;
          border: 1px solid var(--line-2); background: var(--surface);
          box-shadow: var(--shadow-md); color: var(--ink-2);
          font-family: inherit; font-size: 0.74rem; font-weight: 500;
          opacity: 0; pointer-events: none; z-index: 3;
          transition: opacity 0.2s var(--ease), transform 0.2s var(--ease);
        }
        .lib-top[data-show="true"] { opacity: 1; transform: translate(-50%, 0); pointer-events: auto; }
        .lib-top:hover { color: var(--ink); border-color: var(--line-3); }

        @media (max-width: 860px) { .lib-scroll { max-height: 380px; } }
      `}</style>
    </div>
  );
}
