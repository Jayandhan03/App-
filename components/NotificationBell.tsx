"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { I } from "@/components/icons";
import NotificationRow, { NotificationListItem } from "@/components/NotificationRow";

const POLL_MS = 45_000;
const PAGE = 20;

type Filter = "all" | "unread";

const GROUP_ORDER = ["Today", "Yesterday", "This week", "Earlier"] as const;
type GroupLabel = (typeof GROUP_ORDER)[number];

function dayLabel(iso: string): GroupLabel {
  const d = new Date(iso);
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfYesterday = new Date(startOfToday.getTime() - 86_400_000);
  const startOfWeek = new Date(startOfToday.getTime() - 6 * 86_400_000);
  if (d >= startOfToday) return "Today";
  if (d >= startOfYesterday) return "Yesterday";
  if (d >= startOfWeek) return "This week";
  return "Earlier";
}

/* Rows arrive newest-first, so same-day rows are already adjacent and a single
   pass produces the buckets in display order. */
function groupByDay(list: NotificationListItem[]): { label: GroupLabel; items: NotificationListItem[] }[] {
  const out: { label: GroupLabel; items: NotificationListItem[] }[] = [];
  for (const n of list) {
    const label = dayLabel(n.createdAt);
    const last = out[out.length - 1];
    if (last && last.label === label) last.items.push(n);
    else out.push({ label, items: [n] });
  }
  return out;
}

/** Bell with an unread badge, opening a full-height right-side inbox.
 *
 * The panel is a real inbox rather than a read-only log: rows can be played,
 * marked read/unread and removed in place, the unread filter is applied
 * server-side so paging stays correct, and older pages load on scroll. */
export default function NotificationBell() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [items, setItems] = useState<NotificationListItem[] | null>(null);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(false);
  const [filter, setFilter] = useState<Filter>("all");
  /* Which row has its player open, and whether it is currently playing.
     Two fields, not one: collapsing the player on pause made play/pause
     unusable, so pausing only clears `playing` and leaves the row active. */
  const [player, setPlayer] = useState<{ id: string; playing: boolean } | null>(null);
  const [busy, setBusy] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const bellRef = useRef<HTMLButtonElement>(null);
  /* Only the newest list request may write state — switching filters quickly
     would otherwise let a stale response overwrite the current one. */
  const reqId = useRef(0);

  const refreshCount = useCallback(() => {
    fetch("/api/notifications/unread-count")
      .then((r) => r.json())
      .then((d) => { if (d.success) setUnreadCount(d.count); })
      .catch(() => {});
  }, []);

  // Poll for new unread notifications, and re-check whenever the tab regains
  // focus (covers a push arriving while the app was backgrounded).
  useEffect(() => {
    refreshCount();
    const interval = setInterval(refreshCount, POLL_MS);
    window.addEventListener("focus", refreshCount);
    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", refreshCount);
    };
  }, [refreshCount]);

  const fetchPage = useCallback(async (skip: number, f: Filter) => {
    const mine = ++reqId.current;
    const qs = new URLSearchParams({ limit: String(PAGE), skip: String(skip) });
    if (f === "unread") qs.set("unread", "1");
    try {
      const res = await fetch(`/api/notifications?${qs}`);
      const d = await res.json();
      if (mine !== reqId.current) return;
      if (!d.success) { setError(true); return; }
      setError(false);
      setTotal(d.total);
      setHasMore(d.hasMore);
      setUnreadCount(d.unreadCount);
      setItems((prev) => (skip === 0 || prev === null ? d.notifications : [...prev, ...d.notifications]));
    } catch {
      if (mine === reqId.current) setError(true);
    }
  }, []);

  // Load page one on open and on every filter change.
  useEffect(() => {
    if (!open) return;
    setItems(null);
    setError(false);
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
    fetchPage(0, filter);
  }, [open, filter, fetchPage]);

  const loadMore = useCallback(() => {
    if (loadingMore || !hasMore || items === null) return;
    setLoadingMore(true);
    fetchPage(items.length, filter).finally(() => setLoadingMore(false));
  }, [loadingMore, hasMore, items, filter, fetchPage]);

  useEffect(() => {
    const el = sentinelRef.current;
    const root = scrollRef.current;
    if (!open || !el || !root || !hasMore) return;
    const io = new IntersectionObserver(
      (entries) => { if (entries[0].isIntersecting) loadMore(); },
      { root, rootMargin: "160px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [open, hasMore, loadMore]);

  /* While the panel is open: Escape closes it, focus moves into it and is
     returned to the bell on close, and the page behind can't scroll. */
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("keydown", onKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panelRef.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = prevOverflow;
      bellRef.current?.focus();
    };
  }, [open]);

  // Tear the player down whenever the panel closes, so audio never outlives the UI.
  useEffect(() => { if (!open) setPlayer(null); }, [open]);

  /* Opens a row's player, or toggles play/pause when it is already the open
     one — which is what makes a second row's Listen steal playback. */
  const handlePlayPause = useCallback((n: NotificationListItem) => {
    setPlayer((p) => (p && p.id === n.id ? { id: n.id, playing: !p.playing } : { id: n.id, playing: true }));
  }, []);

  const patch = (body: Record<string, unknown>) =>
    fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }).catch(() => {});

  const handleOpenNotification = (n: NotificationListItem) => {
    if (!n.read) {
      setItems((prev) => prev?.map((x) => (x.id === n.id ? { ...x, read: true } : x)) ?? prev);
      setUnreadCount((c) => Math.max(0, c - 1));
      patch({ id: n.id });
    }
    setOpen(false);
    const target = n.data?.click_action;
    if (target) router.push(target);
  };

  const handleToggleRead = (n: NotificationListItem) => {
    const nextRead = !n.read;
    setUnreadCount((c) => Math.max(0, c + (nextRead ? -1 : 1)));
    /* Under the unread filter a row that's just been read no longer belongs in
       the list, so drop it rather than leaving a row the filter excludes. */
    if (filter === "unread" && nextRead) {
      setItems((prev) => prev?.filter((x) => x.id !== n.id) ?? prev);
      setTotal((t) => Math.max(0, t - 1));
    } else {
      setItems((prev) => prev?.map((x) => (x.id === n.id ? { ...x, read: nextRead } : x)) ?? prev);
    }
    patch({ id: n.id, read: nextRead });
  };

  const handleDelete = (n: NotificationListItem) => {
    if (player?.id === n.id) setPlayer(null);
    setItems((prev) => prev?.filter((x) => x.id !== n.id) ?? prev);
    setTotal((t) => Math.max(0, t - 1));
    if (!n.read) setUnreadCount((c) => Math.max(0, c - 1));
    fetch(`/api/notifications?id=${n.id}`, { method: "DELETE" }).catch(() => {});
  };

  const markAllRead = () => {
    setUnreadCount(0);
    if (filter === "unread") { setItems([]); setTotal(0); }
    else setItems((prev) => prev?.map((x) => ({ ...x, read: true })) ?? prev);
    patch({ all: true });
  };

  const clearRead = async () => {
    setBusy(true);
    try {
      await fetch("/api/notifications?scope=read", { method: "DELETE" });
      await fetchPage(0, filter);
    } catch { /* the list just stays as it was */ }
    setBusy(false);
  };

  const grouped = useMemo(() => (items ? groupByDay(items) : []), [items]);
  const readCount = Math.max(0, total - unreadCount);

  return (
    <>
      <button
        ref={bellRef}
        onClick={() => setOpen((v) => !v)}
        aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : "Notifications"}
        aria-expanded={open}
        className="notif-bell row center"
        data-active={open || undefined}
      >
        {I.bell()}
        {unreadCount > 0 && (
          <span className="notif-bell-badge">{unreadCount > 9 ? "9+" : unreadCount}</span>
        )}
      </button>

      {open && (
        <>
          <div className="notif-backdrop" onClick={() => setOpen(false)} />

          <div
            className="notif-panel"
            role="dialog"
            aria-modal="true"
            aria-label="Notifications"
            tabIndex={-1}
            ref={panelRef}
          >
            {/* ── Header ── */}
            <header className="notif-head">
              <div className="row between" style={{ gap: 10 }}>
                <div className="row" style={{ gap: 10, minWidth: 0 }}>
                  <span className="notif-head-icon">{I.bell()}</span>
                  <div style={{ minWidth: 0 }}>
                    <div className="notif-head-title">Notifications</div>
                    {/* `total` is scoped to the active filter, so the "total"
                        half is only meaningful — and only shown — on All. */}
                    <div className="notif-head-sub">
                      {unreadCount > 0 ? `${unreadCount} unread` : "All caught up"}
                      {filter === "all" && total > 0 && ` · ${total} total`}
                    </div>
                  </div>
                </div>
                <button onClick={() => setOpen(false)} aria-label="Close notifications" className="icon-btn">{I.x()}</button>
              </div>

              <div className="notif-tabs" role="tablist" aria-label="Filter notifications">
                <button
                  role="tab"
                  aria-selected={filter === "all"}
                  className="notif-tab"
                  data-on={filter === "all"}
                  onClick={() => setFilter("all")}
                >
                  All
                </button>
                <button
                  role="tab"
                  aria-selected={filter === "unread"}
                  className="notif-tab"
                  data-on={filter === "unread"}
                  onClick={() => setFilter("unread")}
                >
                  Unread
                  {unreadCount > 0 && <span className="notif-tab-n">{unreadCount}</span>}
                </button>
                <span className="notif-tabs-spacer" />
                {unreadCount > 0 && (
                  <button className="notif-link" onClick={markAllRead}>{I.check()} Mark all read</button>
                )}
                {unreadCount === 0 && readCount > 0 && (
                  <button className="notif-link" onClick={clearRead} disabled={busy}>{I.trash()} Clear read</button>
                )}
              </div>
            </header>

            {/* ── Feed ── */}
            <div className="notif-scroll" ref={scrollRef}>
              {items === null && !error && (
                <div className="notif-skeletons">
                  {[0, 1, 2, 3, 4].map((i) => (
                    <div key={i} className="row" style={{ gap: 12, padding: "12px 4px" }}>
                      <div className="skeleton" style={{ width: 38, height: 38, borderRadius: 12, flexShrink: 0 }} />
                      <div className="col" style={{ flex: 1, gap: 8 }}>
                        <div className="skeleton" style={{ height: 11, width: "62%", borderRadius: 4 }} />
                        <div className="skeleton" style={{ height: 10, width: "88%", borderRadius: 4 }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {error && (
                <div className="notif-empty">
                  <span className="notif-empty-icon">{I.bolt()}</span>
                  <div className="notif-empty-title">Couldn&apos;t load notifications</div>
                  <button className="btn btn-secondary btn-sm" style={{ marginTop: 14 }} onClick={() => fetchPage(0, filter)}>
                    Try again
                  </button>
                </div>
              )}

              {items?.length === 0 && !error && (
                <div className="notif-empty">
                  <span className="notif-empty-icon" data-tone={filter === "unread" ? "accent" : undefined}>
                    {filter === "unread" ? I.check() : I.bell()}
                  </span>
                  <div className="notif-empty-title">
                    {filter === "unread" ? "You're all caught up" : "No notifications yet"}
                  </div>
                  <div className="notif-empty-sub">
                    {filter === "unread"
                      ? "Every notification has been read."
                      : "When an agent delivers a briefing, it lands here."}
                  </div>
                  {filter === "unread" && (
                    <button className="btn btn-secondary btn-sm" style={{ marginTop: 14 }} onClick={() => setFilter("all")}>
                      View all notifications
                    </button>
                  )}
                </div>
              )}

              {grouped.map((g) => (
                <section key={g.label}>
                  <h3 className="notif-day">
                    {g.label}
                    <span className="notif-day-n">{g.items.length}</span>
                  </h3>
                  <ul className="notif-list">
                    {g.items.map((n, i) => (
                      <NotificationRow
                        key={n.id}
                        notification={n}
                        index={i}
                        onOpen={handleOpenNotification}
                        onToggleRead={handleToggleRead}
                        onDelete={handleDelete}
                        isActive={player?.id === n.id}
                        isPlaying={player?.id === n.id && player.playing}
                        onPlayPause={handlePlayPause}
                        onClosePlayer={() => setPlayer(null)}
                      />
                    ))}
                  </ul>
                </section>
              ))}

              {items !== null && items.length > 0 && (
                <div ref={sentinelRef} className="notif-foot">
                  {hasMore ? (
                    <button className="btn btn-ghost btn-sm" onClick={loadMore} disabled={loadingMore}>
                      {loadingMore ? <><span className="spinner" style={{ width: 13, height: 13 }} /> Loading…</> : "Load older"}
                    </button>
                  ) : (
                    <span>That&apos;s everything.</span>
                  )}
                </div>
              )}
            </div>
          </div>
        </>
      )}

      <style>{`
        /* ── Bell ── */
        .notif-bell {
          position: relative; width: 34px; height: 34px; border-radius: var(--r-full);
          border: 1px solid var(--line-2); background: var(--surface); color: var(--ink);
          cursor: pointer; transition: border-color 0.18s var(--ease), background 0.18s var(--ease);
        }
        .notif-bell:hover, .notif-bell[data-active] { border-color: var(--line-3); background: var(--surface-2); }
        .notif-bell:focus-visible { outline: none; box-shadow: 0 0 0 3px var(--ring); }
        .notif-bell-badge {
          position: absolute; top: -4px; right: -4px;
          min-width: 17px; height: 17px; padding: 0 4px;
          display: grid; place-items: center; border-radius: var(--r-full);
          background: var(--danger); color: #fff;
          font-size: 0.62rem; font-weight: 700; line-height: 1;
          border: 2px solid var(--bg);
        }

        /* ── Shell ── */
        .notif-backdrop {
          position: fixed; inset: 0; z-index: 190;
          background: rgba(10, 10, 14, 0.45); backdrop-filter: blur(2px);
          animation: fade 0.18s var(--ease) both;
        }
        .notif-panel {
          position: fixed; top: 0; right: 0; bottom: 0; z-index: 200;
          width: min(440px, 100vw); display: flex; flex-direction: column;
          background: var(--bg); border-left: 1px solid var(--line);
          box-shadow: var(--shadow-lg);
          animation: slideInRight 0.24s var(--ease) both;
        }
        .notif-panel:focus { outline: none; }

        /* ── Header ── */
        .notif-head {
          flex-shrink: 0; padding: 16px 16px 0;
          background: var(--surface); border-bottom: 1px solid var(--line);
        }
        .notif-head-icon {
          display: grid; place-items: center; width: 34px; height: 34px; flex-shrink: 0;
          border-radius: var(--r-sm); background: var(--accent-soft); color: var(--accent);
        }
        .notif-head-title { font-size: 1rem; font-weight: 700; letter-spacing: -0.01em; color: var(--ink); }
        .notif-head-sub { font-size: 0.74rem; color: var(--ink-3); margin-top: 1px; }

        .notif-tabs { display: flex; align-items: center; gap: 6px; padding: 12px 0 10px; }
        .notif-tab {
          display: inline-flex; align-items: center; gap: 6px;
          height: 28px; padding: 0 12px; border-radius: var(--r-full);
          border: 1px solid transparent; background: transparent; cursor: pointer;
          font-family: inherit; font-size: 0.79rem; font-weight: 550; color: var(--ink-3);
          transition: background 0.15s var(--ease), color 0.15s var(--ease);
        }
        .notif-tab:hover { background: var(--surface-2); color: var(--ink); }
        .notif-tab[data-on="true"] {
          background: var(--accent-soft); border-color: var(--accent-line); color: var(--accent-ink);
        }
        .notif-tab:focus-visible { outline: none; box-shadow: 0 0 0 3px var(--ring); }
        .notif-tab-n {
          display: inline-grid; place-items: center; min-width: 17px; height: 17px; padding: 0 5px;
          border-radius: var(--r-full); background: var(--accent); color: #fff;
          font-size: 0.63rem; font-weight: 700;
        }
        .notif-tabs-spacer { flex: 1; }
        .notif-link {
          display: inline-flex; align-items: center; gap: 5px;
          background: none; border: none; cursor: pointer; padding: 4px 6px; border-radius: var(--r-xs);
          font-family: inherit; font-size: 0.75rem; font-weight: 600; color: var(--ink-3);
          transition: color 0.15s var(--ease), background 0.15s var(--ease);
        }
        .notif-link:hover:not(:disabled) { color: var(--accent-ink); background: var(--accent-soft); }
        .notif-link:disabled { opacity: 0.5; cursor: not-allowed; }
        .notif-link svg { width: 12px; height: 12px; }

        /* ── Feed ── */
        .notif-scroll { flex: 1; min-height: 0; overflow-y: auto; overscroll-behavior: contain; padding-bottom: 8px; }
        .notif-scroll::-webkit-scrollbar { width: 9px; }
        .notif-scroll::-webkit-scrollbar-track { background: transparent; }
        .notif-scroll::-webkit-scrollbar-thumb { background: var(--line-3); border-radius: var(--r-full); }
        .notif-scroll::-webkit-scrollbar-thumb:hover { background: var(--ink-4); }
        .notif-skeletons { padding: 12px 14px; }

        .notif-day {
          position: sticky; top: 0; z-index: 3;
          display: flex; align-items: center; gap: 7px;
          margin: 0; padding: 9px 16px;
          background: var(--bg); border-bottom: 1px solid var(--line);
          font-size: 0.67rem; font-weight: 700; letter-spacing: 0.07em;
          text-transform: uppercase; color: var(--ink-4);
        }
        .notif-day-n {
          display: inline-grid; place-items: center; min-width: 16px; height: 16px; padding: 0 4px;
          border-radius: var(--r-full); background: var(--surface-2); border: 1px solid var(--line);
          font-size: 0.62rem; font-weight: 600; letter-spacing: 0; color: var(--ink-3);
        }
        .notif-list { list-style: none; margin: 0; padding: 6px 10px; display: flex; flex-direction: column; gap: 4px; }

        /* ── Row ──
           Unread is signalled by an accent rail plus a heavier title, not by
           tinting the whole row: with an inbox that is mostly unread, a filled
           background on every row turns the panel into one solid block of
           color and stops signalling anything at all. */
        .notif-row {
          position: relative; display: flex; gap: 11px; padding: 11px 12px;
          border-radius: var(--r-md); border: 1px solid transparent;
          background: var(--surface);
          animation: riseSm 0.24s var(--ease) both;
          transition: border-color 0.16s var(--ease), background 0.16s var(--ease), transform 0.16s var(--ease);
        }
        .notif-row::before {
          content: ""; position: absolute; left: 0; top: 12px; bottom: 12px; width: 3px;
          border-radius: 0 var(--r-full) var(--r-full) 0;
          background: var(--row-accent); opacity: 0; transition: opacity 0.16s var(--ease);
        }
        .notif-row[data-unread]::before { opacity: 1; }
        .notif-row:hover { border-color: var(--line-2); background: var(--surface-2); }
        .notif-row[data-active] { border-color: var(--row-accent); background: var(--surface-2); }
        .notif-row:not([data-unread]) .notif-avatar,
        .notif-row:not([data-unread]) .notif-open { opacity: 0.72; }

        .notif-avatar {
          display: grid; place-items: center; width: 38px; height: 38px; flex-shrink: 0;
          border-radius: var(--r-sm); border: 1px solid var(--line);
          background: var(--surface-2); color: var(--ink-3);
        }
        .notif-row[data-unread] .notif-avatar {
          border-color: color-mix(in srgb, var(--row-accent) 40%, transparent);
          background: color-mix(in srgb, var(--row-accent) 12%, var(--surface));
        }

        .notif-main { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 3px; }
        /* Stretched hit area: the whole row opens the notification, while the
           action buttons keep their own clicks by sitting on a higher layer. */
        .notif-open {
          background: none; border: none; padding: 0; margin: 0; cursor: pointer;
          font-family: inherit; font-size: 0.85rem; font-weight: 500; color: var(--ink);
          text-align: left; letter-spacing: -0.01em; line-height: 1.35;
          overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
        }
        .notif-row[data-unread] .notif-open { font-weight: 700; }
        .notif-open::after { content: ""; position: absolute; inset: 0; border-radius: var(--r-md); }
        .notif-open:focus-visible { outline: none; }
        .notif-open:focus-visible::after { box-shadow: 0 0 0 2px var(--ring); }

        .notif-meta {
          display: flex; flex-wrap: wrap; align-items: center; gap: 5px;
          font-size: 0.75rem; color: var(--ink-3); line-height: 1.4;
        }
        .notif-meta span { overflow: hidden; text-overflow: ellipsis; }
        .notif-meta span + span::before { content: "·"; margin-right: 5px; color: var(--ink-4); }

        .notif-play-line { position: relative; z-index: 1; display: flex; align-items: center; gap: 6px; margin-top: 7px; }
        /* Collapsed affordance. Once tapped the row goes data-active and this
           is replaced by the full transport, which then stays put through
           pause — see NotificationRow. */
        .notif-listen {
          display: inline-flex; align-items: center; gap: 5px; flex-shrink: 0;
          height: 26px; padding: 0 11px 0 9px; border-radius: var(--r-full); cursor: pointer;
          border: 1px solid var(--line-2); background: var(--surface);
          font-family: inherit; font-size: 0.72rem; font-weight: 600; color: var(--ink-2);
          transition: border-color 0.15s var(--ease), color 0.15s var(--ease), background 0.15s var(--ease);
        }
        .notif-listen:hover { border-color: var(--row-accent); color: var(--ink); background: var(--surface-2); }
        .notif-listen svg { width: 10px; height: 10px; }
        .notif-listen:focus-visible { outline: none; box-shadow: 0 0 0 3px var(--ring); }
        .notif-play-line .ap { flex: 1; min-width: 0; }

        /* ── Right rail: age, then actions on hover/focus ── */
        .notif-side { position: relative; z-index: 1; display: flex; flex-direction: column; align-items: flex-end; gap: 6px; flex-shrink: 0; }
        .notif-age { font-size: 0.68rem; color: var(--ink-4); white-space: nowrap; }
        .notif-actions { display: flex; gap: 2px; opacity: 0; transition: opacity 0.16s var(--ease); }
        .notif-row:hover .notif-actions,
        .notif-row:focus-within .notif-actions { opacity: 1; }
        .notif-act {
          display: grid; place-items: center; width: 24px; height: 24px; cursor: pointer;
          border-radius: var(--r-xs); border: none; background: none; color: var(--ink-4);
          transition: color 0.14s var(--ease), background 0.14s var(--ease);
        }
        .notif-act:hover { background: var(--surface); color: var(--ink); box-shadow: var(--shadow-xs); }
        .notif-act-danger:hover { color: var(--danger); }
        .notif-act:focus-visible { outline: none; box-shadow: 0 0 0 2px var(--ring); }
        .notif-act svg { width: 13px; height: 13px; }
        /* Touch devices get no hover, so the actions stay permanently visible. */
        @media (hover: none) { .notif-actions { opacity: 1; } }

        /* ── Empty / footer ── */
        .notif-empty { text-align: center; padding: 72px 26px; }
        .notif-empty-icon {
          display: grid; place-items: center; width: 48px; height: 48px; margin: 0 auto 14px;
          border-radius: var(--r-md); border: 1px solid var(--line);
          background: var(--surface-2); color: var(--ink-3);
        }
        .notif-empty-icon[data-tone="accent"] {
          background: var(--accent-soft); border-color: var(--accent-line); color: var(--accent-ink);
        }
        .notif-empty-title { font-size: 0.92rem; font-weight: 650; color: var(--ink); }
        .notif-empty-sub { font-size: 0.79rem; color: var(--ink-3); margin-top: 5px; line-height: 1.5; }
        .notif-foot { display: flex; justify-content: center; padding: 14px; font-size: 0.73rem; color: var(--ink-4); }

        /* Below 520px the drawer becomes a near-full-screen sheet. */
        @media (max-width: 520px) {
          .notif-panel { width: 100vw; border-left: none; }
          .notif-empty { padding: 56px 20px; }
        }
      `}</style>
    </>
  );
}
