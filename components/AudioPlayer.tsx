"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { I } from "@/components/icons";
import { formatDuration } from "@/lib/format";

const SPEEDS = [1, 1.25, 1.5, 2] as const;
const SKIP = 15;

/* One audio player for every briefing surface — the dashboard library and the
   notification inbox both mount this rather than each hand-rolling a
   <audio> + range input.
 *
 * Transport state is owned here; only "is this the row that should be
 * playing" comes from the parent, which is what enforces one-at-a-time
 * playback across a list. Crucially, pausing does NOT tear the player down:
 * `playing` going false just pauses, leaving the scrubber and position on
 * screen so play/pause is a real toggle rather than a disappearing act.
 *
 * `preload="metadata"` is deliberate. The briefing audio route serves
 * Accept-Ranges + Content-Length, so the browser reads just the header frames
 * it needs to report a duration — which is why timings are populated before
 * anyone presses play, instead of sitting at "—:—" until first playback. */
export default function AudioPlayer({
  src,
  accent,
  playing,
  onToggle,
  onEnded,
  label,
  variant = "full",
}: {
  src: string;
  accent: string;
  playing: boolean;
  onToggle: () => void;
  onEnded: () => void;
  label: string;
  variant?: "full" | "mini";
}) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [speed, setSpeed] = useState<number>(1);
  const [stalled, setStalled] = useState(false);

  // A live stream reports Infinity; treat only a finite, positive value as a
  // real duration so the UI can show "—:—" rather than "Infinity:NaN".
  const ready = Number.isFinite(duration) && duration > 0;

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      audio.play().catch(() => onToggle()); // rejected autoplay — hand control back so the parent doesn't think it's playing
    } else {
      audio.pause();
    }
    // onToggle is intentionally not a dep: it changes identity every render in
    // most callers, and re-running this effect would fight with the element.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing]);

  useEffect(() => {
    const audio = audioRef.current;
    if (audio) audio.playbackRate = speed;
  }, [speed]);

  const seek = useCallback((t: number) => {
    const audio = audioRef.current;
    const clamped = Math.max(0, ready ? Math.min(t, duration) : t);
    if (audio) audio.currentTime = clamped;
    setCurrentTime(clamped);
  }, [duration, ready]);

  const onMeta = (el: HTMLAudioElement) => {
    setDuration(el.duration);
    setStalled(false);
  };

  const pct = ready ? (currentTime / duration) * 100 : 0;
  const bufPct = ready ? Math.min(100, (buffered / duration) * 100) : 0;

  return (
    <div className="ap" data-variant={variant} data-playing={playing || undefined} style={{ ["--ap-accent" as string]: accent }}>
      <audio
        ref={audioRef}
        preload="metadata"
        src={src}
        onLoadedMetadata={(e) => onMeta(e.currentTarget)}
        onDurationChange={(e) => onMeta(e.currentTarget)}
        onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
        onProgress={(e) => {
          const b = e.currentTarget.buffered;
          if (b.length) setBuffered(b.end(b.length - 1));
        }}
        onWaiting={() => setStalled(true)}
        onPlaying={() => setStalled(false)}
        onEnded={() => { setCurrentTime(0); onEnded(); }}
      />

      <button
        className="ap-play"
        onClick={onToggle}
        aria-label={playing ? `Pause ${label}` : `Play ${label}`}
      >
        {stalled && playing
          ? <span className="ap-spin" aria-hidden="true" />
          : playing ? I.pause() : I.play()}
      </button>

      {variant === "full" && (
        <button className="ap-skip" onClick={() => seek(currentTime - SKIP)} aria-label={`Rewind ${SKIP} seconds`} title={`Back ${SKIP}s`}>
          {I.rewind()}
        </button>
      )}

      <div className="ap-track">
        <span className="ap-buffered" style={{ width: `${bufPct}%` }} aria-hidden="true" />
        <input
          type="range"
          className="scrubber ap-range"
          min={0}
          max={ready ? duration : 1}
          value={ready ? Math.min(currentTime, duration) : 0}
          step={0.05}
          disabled={!ready}
          aria-label={`Seek ${label}`}
          aria-valuetext={ready ? `${formatDuration(currentTime)} of ${formatDuration(duration)}` : "Loading"}
          style={{ "--pct": `${pct}%` } as React.CSSProperties}
          onChange={(e) => seek(Number(e.target.value))}
        />
      </div>

      {variant === "full" && (
        <button className="ap-skip" onClick={() => seek(currentTime + SKIP)} aria-label={`Forward ${SKIP} seconds`} title={`Forward ${SKIP}s`}>
          {I.forward()}
        </button>
      )}

      <span className="ap-time mono" data-ready={ready || undefined}>
        {formatDuration(currentTime)}<span className="ap-time-sep">/</span>{ready ? formatDuration(duration) : "—:—"}
      </span>

      {variant === "full" && (
        <button
          className="ap-speed"
          onClick={() => setSpeed(SPEEDS[(SPEEDS.indexOf(speed as typeof SPEEDS[number]) + 1) % SPEEDS.length])}
          aria-label={`Playback speed ${speed}x, tap to change`}
          title="Playback speed"
        >
          {speed}×
        </button>
      )}
    </div>
  );
}
