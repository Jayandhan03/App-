"use client";

import { I } from "@/components/icons";
import { formatElapsed } from "@/lib/format";

export type NotificationListItem = {
  id: string;
  title: string;
  body: string;
  type: "briefing" | "test";
  data: Record<string, string>;
  read: boolean;
  createdAt: string;
};

// Color-codes each notification type so the feed is scannable at a glance —
// real briefings in the app's accent color, test pings in --info so they
// read as distinctly "not a real delivery".
const TYPE_META = {
  briefing: { bg: "var(--accent-soft)", fg: "var(--accent-ink)", icon: I.mic },
  test: { bg: "var(--info-soft)", fg: "var(--info)", icon: I.bolt },
} as const;

export default function NotificationRow({
  notification,
  onOpen,
  index = 0,
}: {
  notification: NotificationListItem;
  onOpen: (n: NotificationListItem) => void;
  index?: number;
}) {
  const meta = TYPE_META[notification.type];

  return (
    <button
      onClick={() => onOpen(notification)}
      className="notif-row"
      style={{
        display: "flex", alignItems: "flex-start", gap: 12, width: "100%",
        textAlign: "left", cursor: "pointer", border: "none",
        padding: "11px 12px 11px 13px", borderRadius: "var(--r-sm)",
        borderLeft: `3px solid ${notification.read ? "transparent" : "var(--accent)"}`,
        background: notification.read ? "transparent" : "var(--accent-soft)",
        animation: "riseSm 0.24s var(--ease) both",
        animationDelay: `${Math.min(index, 10) * 0.025}s`,
      }}
    >
      <span
        className="row center"
        style={{ width: 34, height: 34, borderRadius: "50%", background: meta.bg, color: meta.fg, flexShrink: 0 }}
      >
        {meta.icon()}
      </span>

      <span style={{ flex: 1, minWidth: 0 }}>
        <span className="row" style={{ gap: 8, justifyContent: "space-between" }}>
          <span
            style={{
              fontSize: "0.84rem", fontWeight: notification.read ? 500 : 700, color: "var(--ink)",
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            }}
          >
            {notification.title}
          </span>
          <span style={{ fontSize: "0.66rem", color: "var(--ink-4)", flexShrink: 0, whiteSpace: "nowrap", marginTop: 2 }}>
            {formatElapsed(notification.createdAt)}
          </span>
        </span>
        <span
          style={{
            display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden",
            fontSize: "0.78rem", color: "var(--ink-3)", marginTop: 3, lineHeight: 1.45,
          }}
        >
          {notification.body}
        </span>
      </span>
    </button>
  );
}
