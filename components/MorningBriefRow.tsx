"use client";

import AudioPlayer from "@/components/AudioPlayer";
import { I } from "@/components/icons";
import { formatElapsed } from "@/lib/format";

export type RecentBriefing = {
  id: string;
  agentId: string;
  agentName: string;
  agentIcon: string;
  createdAt: string;
  label: string;
  articleCount: number;
  channels: { app?: boolean; telegram?: boolean; whatsapp?: boolean };
  niche: string;
  accent: string;
};

/* An agent's name, its topic and its briefing labels are very often the same
   string — an agent called "Agentic AI Trends for Developers" covering that
   niche labels every briefing with it too. Printed verbatim that produced a
   row saying the same phrase three times (heading, agent chip, topic chip).
   So the title claims the phrase first and the chips below only render what
   it hasn't already said. */
function chipsFor(b: RecentBriefing, title: string): { icon?: string; text: string }[] {
  const seen = new Set([title.toLowerCase()]);
  const out: { icon?: string; text: string }[] = [];
  const add = (text: string, icon?: string) => {
    const key = text.trim().toLowerCase();
    if (!key || seen.has(key)) return;
    seen.add(key);
    out.push({ text, icon });
  };
  add(b.agentName, b.agentIcon);
  add(b.niche);
  return out;
}

/* One briefing in the dashboard library. Times are shown as a clock reading
   as well as an age: the list is grouped by day and a single agent's rows are
   otherwise near-identical, so "7:32 AM" is what actually distinguishes two
   entries from the same morning. */
export default function MorningBriefRow({
  briefing,
  isPlaying,
  onToggle,
  divider,
  showAgent = true,
}: {
  briefing: RecentBriefing;
  isPlaying: boolean;
  onToggle: () => void;
  divider: boolean;
  showAgent?: boolean;
}) {
  const title = briefing.label?.trim() || briefing.agentName;
  const chips = showAgent ? chipsFor(briefing, title) : chipsFor({ ...briefing, agentName: "" }, title);
  const clock = new Date(briefing.createdAt).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });

  return (
    <div
      className="brief-row"
      data-playing={isPlaying || undefined}
      style={{ padding: "14px 22px", borderTop: divider ? "1px solid var(--line)" : "none" }}
    >
      <div className="row between" style={{ gap: 10, marginBottom: 9 }}>
        <div style={{ fontSize: "0.92rem", fontWeight: 600, letterSpacing: "-0.01em", lineHeight: 1.4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {title}
        </div>
        <span style={{ fontSize: "0.72rem", color: "var(--ink-3)", flexShrink: 0, whiteSpace: "nowrap" }}>
          {clock} <span style={{ color: "var(--ink-4)" }}>· {formatElapsed(briefing.createdAt)}</span>
        </span>
      </div>

      <AudioPlayer
        src={`/api/briefings/${briefing.id}/audio`}
        accent={briefing.accent}
        playing={isPlaying}
        onToggle={onToggle}
        onEnded={onToggle}
        label={title}
      />

      <div className="row wrap" style={{ gap: 8, marginTop: 9 }}>
        {chips.map((c) => (
          <span key={c.text} className="chip" style={{ padding: "2px 9px", fontSize: "0.72rem", gap: 5 }}>
            {c.icon && <span aria-hidden="true">{c.icon}</span>}
            <span style={{ maxWidth: 170, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.text}</span>
          </span>
        ))}
        {/* Older briefings predate source tracking and report 0 — saying
            "0 sources" reads as a failure, so the count is simply omitted. */}
        {briefing.articleCount > 0 && (
          <span style={{ fontSize: "0.75rem", color: "var(--ink-3)" }}>{briefing.articleCount} sources</span>
        )}
        {briefing.channels?.telegram && <span style={{ color: "var(--info)", display: "inline-flex" }} title="Delivered to Telegram">{I.tg()}</span>}
        {briefing.channels?.whatsapp && <span style={{ color: "var(--accent)", display: "inline-flex" }} title="Delivered to WhatsApp">{I.wa()}</span>}
      </div>
    </div>
  );
}
