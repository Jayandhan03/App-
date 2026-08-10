"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { I } from "@/components/icons";
import NotificationRow, { NotificationListItem } from "@/components/NotificationRow";

const POLL_MS = 45_000;
type Filter = "all" | "unread";

const GROUP_ORDER = ["Today", "Yesterday", "This week", "Earlier"] as const;

function dayLabel(iso: string): (typeof GROUP_ORDER)[number] {
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

function groupByDay(list: NotificationListItem[]): [string, NotificationListItem[]][] {
  const buckets = new Map<string, NotificationListItem[]>();
  for (const n of list) {
    const label = dayLabel(n.createdAt);
    if (!buckets.has(label)) buckets.set(label, []);
    buckets.get(label)!.push(n);
  }
  return GROUP_ORDER.filter((g) => buckets.has(g)).map((g) => [g, buckets.get(g)!]);
}

/** Bell icon with an unread-count dot. Opens a full-height right-side
 * notification panel (feed-style, like the YouTube/Instagram notification
 * drawer) rather than a small dropdown. Mounted in AppNav so it's present on
 * every signed-in page. */
export default function NotificationBell() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<NotificationListItem[] | null>(null);
  const [error, setError] = useState(false);
  const [filter, setFilter] = useState<Filter>("all");

  const refreshCount = () => {
    fetch("/api/notifications/unread-count")
      .then((r) => r.json())
      .then((d) => { if (d.success) setUnreadCount(d.count); })
      .catch(() => {});
  };

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
  }, []);

  // While the panel is open: Escape closes it, and the page behind it can't
  // scroll — same behavior as a full-screen drawer on YouTube/Instagram.
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("keydown", handleKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [open]);

  const toggleOpen = () => {
    const next = !open;
    setOpen(next);
    // Lazy-load the full list on first open, same trick as BriefingHistoryPanel.
    if (next && notifications === null) {
      fetch("/api/notifications")
        .then((r) => r.json())
        .then((d) => {
          if (!d.success) { setError(true); return; }
          setNotifications(d.notifications);
          setUnreadCount(d.unreadCount);
        })
        .catch(() => setError(true));
    }
  };

  const handleOpenNotification = (n: NotificationListItem) => {
    if (!n.read) {
      setNotifications((prev) => prev?.map((x) => (x.id === n.id ? { ...x, read: true } : x)) ?? prev);
      setUnreadCount((c) => Math.max(0, c - 1));
      fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: n.id }),
      }).catch(() => {});
    }
    setOpen(false);
    const target = n.data?.click_action;
    if (target) router.push(target);
  };

  const markAllRead = () => {
    setNotifications((prev) => prev?.map((x) => ({ ...x, read: true })) ?? prev);
    setUnreadCount(0);
    fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ all: true }),
    }).catch(() => {});
  };

  const visible = useMemo(
    () => notifications?.filter((n) => filter === "all" || !n.read) ?? null,
    [notifications, filter]
  );
  const grouped = useMemo(() => (visible ? groupByDay(visible) : []), [visible]);

  const chipStyle = (active: boolean): React.CSSProperties =>
    active
      ? { background: "var(--accent-soft)", color: "var(--accent-ink)", borderColor: "var(--accent-line)" }
      : {};

  return (
    <>
      <button
        onClick={toggleOpen}
        aria-label="Notifications"
        className="row center"
        style={{
          position: "relative", width: 34, height: 34, borderRadius: "var(--r-full)",
          border: "1px solid var(--line-2)", background: "var(--surface)", cursor: "pointer", color: "var(--ink)",
          transition: "border-color 0.18s var(--ease)",
        }}
      >
        {I.bell()}
        {unreadCount > 0 && (
          <span
            className="dot dot-live"
            style={{ position: "absolute", top: 6, right: 7, background: "var(--danger)" }}
          />
        )}
      </button>

      {open && (
        <>
          {/* Backdrop — click to close, same as tapping outside a YouTube/IG notification drawer */}
          <div
            onClick={() => setOpen(false)}
            style={{ position: "fixed", inset: 0, background: "rgba(10,10,14,0.5)", zIndex: 190, animation: "fade 0.18s var(--ease) both" }}
          />

          {/* Full-height panel, pinned to the right edge of the viewport */}
          <div
            className="card"
            role="dialog"
            aria-label="Notifications"
            style={{
              position: "fixed", top: 0, right: 0, bottom: 0, height: "100vh",
              width: "min(420px, 100vw)", borderRadius: 0, borderTop: "none", borderBottom: "none", borderRight: "none",
              display: "flex", flexDirection: "column",
              boxShadow: "var(--shadow-lg)", zIndex: 200,
              animation: "slideInRight 0.22s var(--ease) both",
            }}
          >
            <div className="row between" style={{ padding: "18px 18px 4px", flexShrink: 0 }}>
              <span className="row" style={{ gap: 9 }}>
                <span style={{ fontSize: "1.02rem", fontWeight: 700, color: "var(--ink)" }}>Notifications</span>
                {unreadCount > 0 && (
                  <span className="badge badge-accent" style={{ height: 20, padding: "0 8px", fontSize: "0.66rem" }}>
                    {unreadCount} new
                  </span>
                )}
              </span>
              <button onClick={() => setOpen(false)} aria-label="Close" className="icon-btn">{I.x()}</button>
            </div>

            {notifications !== null && notifications.length > 0 && (
              <div className="row" style={{ padding: "12px 18px 14px", gap: 8, flexShrink: 0 }}>
                <button className="chip chip-hover" style={{ ...chipStyle(filter === "all"), fontSize: "0.76rem", padding: "5px 12px" }} onClick={() => setFilter("all")}>
                  All
                </button>
                <button className="chip chip-hover" style={{ ...chipStyle(filter === "unread"), fontSize: "0.76rem", padding: "5px 12px" }} onClick={() => setFilter("unread")}>
                  Unread{unreadCount > 0 ? ` · ${unreadCount}` : ""}
                </button>
                {unreadCount > 0 && (
                  <button
                    onClick={markAllRead}
                    style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", color: "var(--accent-ink)", fontSize: "0.76rem", fontWeight: 600 }}
                  >
                    Mark all read
                  </button>
                )}
              </div>
            )}
            <div className="hairline" style={{ flexShrink: 0 }} />

            <div style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "4px 10px 10px" }}>
              {notifications === null && !error && (
                <div style={{ display: "flex", flexDirection: "column", gap: 16, padding: 10 }}>
                  {[0, 1, 2, 3].map((i) => (
                    <div key={i} className="row" style={{ gap: 12 }}>
                      <div className="skeleton" style={{ width: 34, height: 34, borderRadius: "50%", flexShrink: 0 }} />
                      <div className="col" style={{ flex: 1, gap: 7 }}>
                        <div className="skeleton" style={{ height: 11, width: "65%", borderRadius: 4 }} />
                        <div className="skeleton" style={{ height: 10, width: "92%", borderRadius: 4 }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {error && (
                <div style={{ textAlign: "center", padding: "60px 0", fontSize: "0.85rem", color: "var(--ink-3)" }}>
                  Couldn&apos;t load notifications — try again in a moment.
                </div>
              )}

              {notifications?.length === 0 && (
                <div style={{ textAlign: "center", padding: "70px 0", color: "var(--ink-3)" }}>
                  <div className="row center" style={{ width: 44, height: 44, borderRadius: "50%", background: "var(--surface-2)", margin: "0 auto 14px" }}>{I.bell()}</div>
                  <div style={{ fontSize: "0.88rem", fontWeight: 600, color: "var(--ink-2)" }}>No notifications yet</div>
                  <div style={{ fontSize: "0.78rem", marginTop: 4 }}>Briefing pushes will show up here.</div>
                </div>
              )}

              {notifications && notifications.length > 0 && visible?.length === 0 && (
                <div style={{ textAlign: "center", padding: "70px 0", color: "var(--ink-3)" }}>
                  <div className="row center" style={{ width: 44, height: 44, borderRadius: "50%", background: "var(--accent-soft)", color: "var(--accent-ink)", margin: "0 auto 14px" }}>{I.check()}</div>
                  <div style={{ fontSize: "0.88rem", fontWeight: 600, color: "var(--ink-2)" }}>You&apos;re all caught up</div>
                </div>
              )}

              {grouped.map(([label, items]) => (
                <div key={label} style={{ marginBottom: 4 }}>
                  <div
                    style={{
                      position: "sticky", top: 0, zIndex: 1, background: "var(--surface)",
                      padding: "10px 6px 6px", fontSize: "0.68rem", fontWeight: 700,
                      letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--ink-4)",
                    }}
                  >
                    {label}
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    {items.map((n, i) => (
                      <NotificationRow key={n.id} notification={n} onOpen={handleOpenNotification} index={i} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </>
  );
}
