"use client";

import { useEffect, useRef, useState } from "react";
import { I } from "@/components/icons";
import { formatElapsed, formatDuration } from "@/lib/format";

export type BriefingListItem = {
  id: string;
  createdAt: string;
  label: string;
  articleCount: number;
  language: string;
  tone: string;
  channels: { app?: boolean; telegram?: boolean; whatsapp?: boolean };
  sizeBytes: number;
};

export default function BriefingRow({
  briefing,
  accent,
  isPlaying,
  onToggle,
}: {
  briefing: BriefingListItem;
  accent: string;
  isPlaying: boolean;
  onToggle: () => void;
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
    <div className="briefing-row">
      <audio
        ref={audioRef}
        preload="none"
        src={`/api/briefings/${briefing.id}/audio`}
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
        onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
        onEnded={onToggle}
      />

      <button
        className="briefing-play"
        style={{ background: accent, color: "#fff" }}
        onClick={onToggle}
        aria-label={isPlaying ? "Pause" : "Play"}
      >
        {isPlaying ? I.pause() : I.play()}
      </button>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="row between" style={{ gap: 8 }}>
          <div style={{ fontSize: "0.84rem", fontWeight: 600, letterSpacing: "-0.01em", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {briefing.label}
          </div>
          <div style={{ fontSize: "0.7rem", color: "var(--ink-4)", flexShrink: 0 }}>{formatElapsed(briefing.createdAt)}</div>
        </div>

        <div className="row" style={{ gap: 8, marginTop: 6 }}>
          <input
            type="range"
            className="scrubber"
            min={0}
            max={duration || 0}
            value={Math.min(currentTime, duration || 0)}
            step={0.1}
            style={{ "--pct": `${pct}%`, color: accent } as React.CSSProperties}
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

        <div className="row" style={{ gap: 6, marginTop: 8 }}>
          <span className="badge badge-muted" style={{ fontSize: "0.65rem" }}>{briefing.articleCount} sources</span>
          {briefing.channels.telegram && (
            <span className="badge badge-muted" style={{ fontSize: "0.65rem", gap: 4 }}><span style={{ color: "var(--info)", display: "inline-flex" }}>{I.tg()}</span> Telegram</span>
          )}
          {briefing.channels.whatsapp && (
            <span className="badge badge-muted" style={{ fontSize: "0.65rem", gap: 4 }}><span style={{ color: "var(--accent)", display: "inline-flex" }}>{I.wa()}</span> WhatsApp</span>
          )}
        </div>
      </div>
    </div>
  );
}
