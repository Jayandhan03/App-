"use client";

import AudioPlayer from "@/components/AudioPlayer";
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
  agent: { id: string; name: string; icon: string; accent: string; niche: string } | null;
  briefing: { id: string; label: string; articleCount: number; icon?: string } | null;
};

/* Every briefing push is logged with title = agent name and body =
   "New briefing: <label>". When an agent's label matches its name — the common
   case — rendering both lines verbatim produced a feed where every row said the
   same sentence twice. So the body is unwrapped to its bare label and dropped
   entirely when it just restates the title; the metadata line carries the
   genuinely distinguishing facts (clock time, source count) instead. */
function describe(n: NotificationListItem): { title: string; meta: string[] } {
  const clock = new Date(n.createdAt).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });

  if (n.type !== "briefing") {
    return { title: n.title, meta: [n.body] };
  }

  const title = n.agent?.name || n.title;
  const label = (n.briefing?.label || n.body.replace(/^new briefing:\s*/i, "")).trim();
  const meta: string[] = [clock];
  if (label && label.toLowerCase() !== title.toLowerCase()) meta.push(label);
  // Older briefings predate source tracking and report 0; "0 sources" reads as
  // a failure, so it is omitted rather than shown.
  if (n.briefing && n.briefing.articleCount > 0) meta.push(`${n.briefing.articleCount} sources`);
  else if (n.agent?.niche && n.agent.niche.toLowerCase() !== title.toLowerCase()) meta.push(n.agent.niche);
  return { title, meta };
}

export default function NotificationRow({
  notification: n,
  onOpen,
  onToggleRead,
  onDelete,
  isActive,
  isPlaying,
  onPlayPause,
  onClosePlayer,
  index = 0,
}: {
  notification: NotificationListItem;
  onOpen: (n: NotificationListItem) => void;
  onToggleRead: (n: NotificationListItem) => void;
  onDelete: (n: NotificationListItem) => void;
  /** The row whose player is open. Independent of `isPlaying` so that pausing
   *  keeps the transport on screen instead of collapsing it back to a pill. */
  isActive: boolean;
  isPlaying: boolean;
  onPlayPause: (n: NotificationListItem) => void;
  onClosePlayer: () => void;
  index?: number;
}) {
  const { title, meta } = describe(n);
  const accent = n.agent?.accent ?? (n.type === "test" ? "var(--info)" : "var(--accent)");
  const avatar = n.agent?.icon || n.briefing?.icon;

  return (
    <li
      className="notif-row"
      data-unread={!n.read || undefined}
      data-active={isActive || undefined}
      style={{ ["--row-accent" as string]: accent, animationDelay: `${Math.min(index, 12) * 0.022}s` }}
    >
      <span className="notif-avatar" aria-hidden="true">
        {avatar ? <span style={{ fontSize: 16 }}>{avatar}</span> : n.type === "test" ? I.bolt() : I.mic()}
      </span>

      <div className="notif-main">
        {/* The ::after on this button stretches over the whole row, so the row
            is one big click target while the controls still take their own clicks. */}
        <button className="notif-open" onClick={() => onOpen(n)}>
          {title}
        </button>

        <div className="notif-meta">
          {meta.map((m, i) => (
            <span key={i}>{m}</span>
          ))}
        </div>

        {n.briefing && (
          <div className="notif-play-line">
            {isActive ? (
              <>
                <AudioPlayer
                  src={`/api/briefings/${n.briefing.id}/audio`}
                  accent={accent}
                  playing={isPlaying}
                  onToggle={() => onPlayPause(n)}
                  onEnded={onClosePlayer}
                  label={title}
                  variant="mini"
                />
                <button className="notif-act" onClick={onClosePlayer} aria-label="Close player" title="Close player">
                  {I.x()}
                </button>
              </>
            ) : (
              <button className="notif-listen" onClick={() => onPlayPause(n)} aria-label={`Play ${title}`}>
                {I.play()}<span>Listen</span>
              </button>
            )}
          </div>
        )}
      </div>

      <div className="notif-side">
        <time className="notif-age" dateTime={n.createdAt}>{formatElapsed(n.createdAt)}</time>
        <div className="notif-actions">
          <button
            className="notif-act"
            onClick={() => onToggleRead(n)}
            aria-label={n.read ? "Mark as unread" : "Mark as read"}
            title={n.read ? "Mark as unread" : "Mark as read"}
          >
            {n.read ? I.bell() : I.check()}
          </button>
          <button
            className="notif-act notif-act-danger"
            onClick={() => onDelete(n)}
            aria-label="Remove notification"
            title="Remove"
          >
            {I.trash()}
          </button>
        </div>
      </div>
    </li>
  );
}
