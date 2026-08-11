"use client";

import { useEffect, useRef, useState } from "react";
import { I } from "@/components/icons";
import { formatElapsed, formatDuration } from "@/lib/format";

export type RecentBriefing = {
  id: string;
  agentId: string;
  agentName: string;
  createdAt: string;
  articleCount: number;
  niche: string;
  accent: string;
};

/* A full play/pause + scrubber player for the dashboard's "Morning brief"
   card — controls stay visible at all times (same always-on convention as
   BriefingRow's player further down the page), rather than appearing only
   once playback starts. */
export default function MorningBriefRow({
  briefing,
  isPlaying,
  onToggle,
  divider,
}: {
  briefing: RecentBriefing;
  isPlaying: boolean;
  onToggle: () => void;
  divider: boolean;
}) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) {
      audio.play().catch(() => {}); // autoplay can reject if the user hasn't interacted yet — ignore, the click that got us here counts
    } else {
      audio.pause();
    }
  }, [isPlaying]);

  const pct = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="brief-row row" style={{ gap: 14, padding: "16px 22px", borderTop: divider ? "1px solid var(--line)" : "none" }}>
      <audio
        ref={audioRef}
        preload="metadata"
        src={`/api/briefings/${briefing.id}/audio`}
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
        onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
        onEnded={onToggle}
      />

      <button
        className="briefing-play"
        style={{ background: briefing.accent, color: "#fff", flexShrink: 0 }}
        onClick={onToggle}
        aria-label={isPlaying ? "Pause" : "Play"}
      >
        {isPlaying ? I.pause() : I.play()}
      </button>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="row between" style={{ gap: 8 }}>
          <div style={{ fontSize: "0.95rem", fontWeight: 550, letterSpacing: "-0.01em", lineHeight: 1.4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {briefing.agentName} sent a new briefing
          </div>
          <span style={{ fontSize: "0.75rem", color: "var(--ink-3)", flexShrink: 0 }}>{formatElapsed(briefing.createdAt)}</span>
        </div>

        <div className="row" style={{ gap: 8, marginTop: 7 }}>
          <input
            type="range"
            className="scrubber"
            min={0}
            max={duration || 0}
            value={Math.min(currentTime, duration || 0)}
            step={0.1}
            style={{ "--pct": `${pct}%`, color: briefing.accent } as React.CSSProperties}
            onChange={(e) => {
              const t = Number(e.target.value);
              if (audioRef.current) audioRef.current.currentTime = t;
              setCurrentTime(t);
            }}
          />
          <span className="mono" style={{ fontSize: "0.68rem", color: "var(--ink-4)", flexShrink: 0, minWidth: 72, textAlign: "right" }}>
            {formatDuration(currentTime)} / {formatDuration(duration)}
          </span>
        </div>

        <div className="row wrap" style={{ gap: 8, marginTop: 8 }}>
          {briefing.niche && <span className="chip" style={{ padding: "2px 9px", fontSize: "0.72rem" }}>{briefing.niche}</span>}
          <span style={{ fontSize: "0.75rem", color: "var(--ink-3)" }}>{briefing.articleCount} sources</span>
        </div>
      </div>
    </div>
  );
}
