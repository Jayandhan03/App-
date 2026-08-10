"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import AppNav from "@/components/AppNav";

const SAMPLE_TEXT =
  "Good morning! This is a test briefing from Leora. " +
  "Your in-app voice notifications are working perfectly. " +
  "When your agents run, their audio briefings will be delivered right here — " +
  "just like this. Tap play and stay informed, hands-free.";

// One pre-recorded clip, generated once and committed to the repo — not
// regenerated via TTS on every test. See public/audio/test-briefing.mp3.
const AUDIO_SRC = "/audio/test-briefing.mp3";

// ── Animated waveform ─────────────────────────────────────────────────────────
const BARS = [6, 14, 20, 11, 18, 24, 9, 16, 22, 8, 19, 13, 21, 7, 17, 23, 10, 15, 20, 6, 18, 12];

function WaveformBars({ playing, progress }: { playing: boolean; progress: number }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 3, height: 32 }}>
      {BARS.map((h, i) => {
        const filled = i / BARS.length < progress;
        return (
          <span
            key={i}
            style={{
              width: 3,
              height: filled ? h : Math.max(4, h * 0.4),
              borderRadius: 2,
              background: filled ? "var(--accent)" : "var(--line-2)",
              transition: "height 0.12s ease",
              animation:
                playing && !filled
                  ? `wave-${(i % 4) + 1} 0.8s ease-in-out infinite`
                  : "none",
              animationDelay: `${i * 0.045}s`,
              display: "inline-block",
              transformOrigin: "center",
            }}
          />
        );
      })}
    </div>
  );
}

function fmt(s: number): string {
  if (!isFinite(s) || s < 0) return "0:00";
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

export default function TestBriefingPage() {
  const { status } = useSession();
  const router = useRouter();

  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [playing, setPlaying] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [totalDuration, setTotalDuration] = useState(0);
  const [ended, setEnded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") router.replace("/signin");
  }, [status, router]);

  // Try to auto-play on load (simulates opening from a notification tap).
  // Browsers/WebViews may block autoplay across a full page navigation —
  // that's fine, the user just taps play manually in that case.
  useEffect(() => {
    if (status !== "authenticated") return;
    audioRef.current?.play().catch(() => { /* autoplay blocked — wait for tap */ });
  }, [status]);

  function togglePlay() {
    const el = audioRef.current;
    if (!el) return;
    if (el.paused) {
      setEnded(false);
      el.play().catch((err) => {
        console.warn("[test-briefing] audio play failed:", err);
        setError("Couldn't play the voice note — try again.");
      });
    } else {
      el.pause();
    }
  }

  function handleSeekClick(e: React.MouseEvent<HTMLDivElement>) {
    const el = audioRef.current;
    if (!el || !isFinite(el.duration)) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    el.currentTime = ratio * el.duration;
    setEnded(false);
  }

  const progress = totalDuration > 0 ? Math.min(elapsed / totalDuration, 1) : 0;

  if (status === "loading" || status === "unauthenticated") {
    return (
      <div className="row center" style={{ minHeight: "100vh" }}>
        <span className="spinner" />
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)" }}>
      <AppNav />

      <audio
        ref={audioRef}
        src={AUDIO_SRC}
        preload="auto"
        style={{ display: "none" }}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => { setPlaying(false); setEnded(true); }}
        onTimeUpdate={(e) => setElapsed(e.currentTarget.currentTime)}
        onLoadedMetadata={(e) => {
          if (isFinite(e.currentTarget.duration)) setTotalDuration(e.currentTarget.duration);
        }}
        onError={() => setError("Couldn't load the voice note — check your connection and try again.")}
      />

      <main
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "calc(100vh - 64px)",
          padding: "24px",
        }}
      >
        <div
          className="card"
          style={{
            width: "100%",
            maxWidth: 500,
            borderRadius: "var(--r-xl)",
            padding: "40px 36px",
            boxShadow: "var(--shadow-glow)",
          }}
        >
          {/* ── Header ── */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 14,
              marginBottom: 28,
            }}
          >
            <div
              style={{
                width: 52,
                height: 52,
                borderRadius: 16,
                flexShrink: 0,
                background: "var(--accent)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 8px 24px var(--accent-glow)",
                fontSize: 24,
                position: "relative",
              }}
            >
              🎧
              {playing && (
                <span
                  style={{
                    position: "absolute",
                    inset: -1,
                    borderRadius: 17,
                    border: "2px solid var(--accent-line)",
                    animation: "ring-pulse 1.5s ease-in-out infinite",
                  }}
                />
              )}
            </div>
            <div>
              <div
                style={{
                  fontSize: "1.1rem",
                  fontWeight: 800,
                  letterSpacing: "-0.02em",
                  color: "var(--ink)",
                  marginBottom: 3,
                }}
              >
                Test Briefing
              </div>
              <div style={{ fontSize: "0.77rem", color: "var(--ink-3)" }}>
                Leora · Sample voice note
              </div>
            </div>
            <span
              className="badge badge-accent"
              style={{ marginLeft: "auto", fontSize: "0.68rem", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase" }}
            >
              Test
            </span>
          </div>

          {/* ── Script preview ── */}
          <div
            style={{
              padding: "14px 16px",
              borderRadius: "var(--r-sm)",
              marginBottom: 24,
              background: "var(--surface-2)",
              border: "1px solid var(--line)",
            }}
          >
            <div
              style={{
                fontSize: "0.7rem",
                fontWeight: 700,
                color: "var(--accent-ink)",
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                marginBottom: 8,
              }}
            >
              Briefing script
            </div>
            <p
              style={{
                margin: 0,
                fontSize: "0.82rem",
                color: "var(--ink-2)",
                lineHeight: 1.7,
                fontStyle: "italic",
              }}
            >
              &ldquo;{SAMPLE_TEXT}&rdquo;
            </p>
          </div>

          {/* ── Audio player ── */}
          {error ? (
            <div
              className="card"
              style={{
                padding: "14px 16px",
                background: "var(--danger-soft)",
                borderColor: "var(--danger)",
                boxShadow: "none",
                textAlign: "center",
                fontSize: "0.82rem",
                color: "var(--danger)",
              }}
            >
              {error}
            </div>
          ) : (
            <div
              style={{
                borderRadius: "var(--r-sm)",
                background: playing ? "var(--accent-soft)" : "var(--surface-2)",
                border: `1px solid ${playing ? "var(--accent-line)" : "var(--line)"}`,
                padding: "20px 20px 16px",
                transition: "all 0.3s ease",
              }}
            >
              {/* Play row */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                  marginBottom: 14,
                }}
              >
                <button
                  onClick={togglePlay}
                  style={{
                    width: 52,
                    height: 52,
                    borderRadius: "50%",
                    flexShrink: 0,
                    border: "none",
                    background: "var(--accent)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                    boxShadow: playing ? "0 4px 20px var(--accent-glow)" : "none",
                    transition: "all 0.2s ease",
                  }}
                >
                  {playing ? (
                    /* Pause */
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="#fff">
                      <rect x="6" y="4" width="4" height="16" rx="1" />
                      <rect x="14" y="4" width="4" height="16" rx="1" />
                    </svg>
                  ) : ended ? (
                    /* Replay */
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="#fff" style={{ marginRight: 1 }}>
                      <path d="M12 5V1L7 6l5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z" />
                    </svg>
                  ) : (
                    /* Play */
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="#fff" style={{ marginLeft: 2 }}>
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  )}
                </button>
                <WaveformBars playing={playing} progress={progress} />
              </div>

              {/* Seek bar */}
              <div
                onClick={handleSeekClick}
                style={{
                  height: 4,
                  borderRadius: 4,
                  background: "var(--line-2)",
                  cursor: "pointer",
                  position: "relative",
                  marginBottom: 8,
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    left: 0,
                    top: 0,
                    height: "100%",
                    borderRadius: 4,
                    width: `${progress * 100}%`,
                    background: "var(--accent)",
                    transition: "width 0.12s linear",
                  }}
                />
              </div>

              {/* Time */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: "0.7rem",
                  color: "var(--ink-4)",
                }}
              >
                <span>{fmt(elapsed)}</span>
                <span style={{ color: "var(--ink-4)" }}>
                  English · Analytical
                </span>
                <span>~{fmt(totalDuration)}</span>
              </div>
            </div>
          )}

          {/* Status label */}
          <div
            style={{
              textAlign: "center",
              marginTop: 14,
              fontSize: "0.74rem",
              color: ended || playing ? "var(--accent-ink)" : "var(--ink-4)",
              transition: "color 0.3s ease",
              minHeight: 18,
            }}
          >
            {ended
              ? "✓ Playback complete — notifications are working end-to-end"
              : playing
              ? "Playing…"
              : "Tap play to hear your sample briefing"}
          </div>

          {/* Footer buttons */}
          <div
            style={{
              marginTop: 24,
              display: "flex",
              justifyContent: "center",
              gap: 10,
            }}
          >
            <button
              className="btn btn-sm btn-secondary"
              onClick={() => router.push("/delivery")}
            >
              ← Back to Delivery
            </button>
            <button
              className="btn btn-sm btn-secondary"
              onClick={() => router.push("/dashboard")}
            >
              Dashboard
            </button>
          </div>
        </div>
      </main>

      <style>{`
        @keyframes wave-1 { 0%,100%{transform:scaleY(1)} 50%{transform:scaleY(0.35)} }
        @keyframes wave-2 { 0%,100%{transform:scaleY(0.5)} 50%{transform:scaleY(1)} }
        @keyframes wave-3 { 0%,100%{transform:scaleY(0.8)} 50%{transform:scaleY(0.25)} }
        @keyframes wave-4 { 0%,100%{transform:scaleY(0.25)} 50%{transform:scaleY(0.9)} }
        @keyframes ring-pulse {
          0%,100%{opacity:1;transform:scale(1)}
          50%{opacity:0.3;transform:scale(1.15)}
        }
      `}</style>
    </div>
  );
}
