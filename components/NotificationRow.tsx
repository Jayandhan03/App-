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

export default function NotificationRow({
  notification,
  onOpen,
}: {
  notification: NotificationListItem;
  onOpen: (n: NotificationListItem) => void;
}) {
  const icon = notification.type === "briefing" ? I.mic() : I.bolt();

  return (
    <button
      onClick={() => onOpen(notification)}
      className="menu-row"
      style={{
        display: "flex", alignItems: "flex-start", gap: 10, width: "100%",
        textAlign: "left", background: notification.read ? "none" : "var(--accent-soft)",
        border: "none", cursor: "pointer", padding: "9px 10px", borderRadius: "var(--r-sm)",
      }}
    >
      <span
        className="row center"
        style={{ width: 28, height: 28, borderRadius: "50%", background: "var(--surface-2)", color: "var(--ink-2)", flexShrink: 0, marginTop: 1 }}
      >
        {icon}
      </span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span className="row between" style={{ gap: 8 }}>
          <span style={{ fontSize: "0.82rem", fontWeight: 600, color: "var(--ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {notification.title}
          </span>
          {!notification.read && <span className="dot" style={{ background: "var(--danger)", flexShrink: 0, marginTop: 4 }} />}
        </span>
        <span style={{ display: "block", fontSize: "0.78rem", color: "var(--ink-3)", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {notification.body}
        </span>
        <span style={{ display: "block", fontSize: "0.68rem", color: "var(--ink-4)", marginTop: 3 }}>
          {formatElapsed(notification.createdAt)}
        </span>
      </span>
    </button>
  );
}
