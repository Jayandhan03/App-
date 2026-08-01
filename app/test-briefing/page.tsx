"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import AppNav from "@/components/AppNav";

const SAMPLE_TEXT =
  "Good morning! This is a test briefing from Leora. " +
  "Your in-app voice notifications are working perfectly. " +
  "When your agents run, their audio briefings will be delivered right here — " +
  "just like this. Tap play and stay informed, hands-free.";

const SAMPLE_DURATION_APPROX = 14; // seconds (varies by voice)

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
              background: filled
                ? "linear-gradient(180deg, #4d7fff, #8b5cf6)"
                : "rgba(255,255,255,0.15)",
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

  const utterRef = useRef<SpeechSynthesisUtterance | null>(null);
  const startTimeRef = useRef<number>(0);
  const rafRef = useRef<number>(0);

  const [supported, setSupported] = useState(true);
  const [playing, setPlaying] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [totalDuration, setTotalDuration] = useState(SAMPLE_DURATION_APPROX);
  const [ended, setEnded] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") router.replace("/signin");
    if (typeof window !== "undefined" && !("speechSynthesis" in window)) {
      setSupported(false);
    }
  }, [status, router]);

  // Keep elapsed time ticking while speaking.
  const tick = useCallback(() => {
    const dt = (Date.now() - startTimeRef.current) / 1000;
    setElapsed(Math.min(dt, totalDuration));
    rafRef.current = requestAnimationFrame(tick);
  }, [totalDuration]);

  const stopTicking = () => cancelAnimationFrame(rafRef.current);

  const buildUtterance = useCallback(() => {
    const u = new SpeechSynthesisUtterance(SAMPLE_TEXT);
    u.lang = "en-US";
    u.rate = 0.92;
    u.pitch = 1.05;

    // Pick the first English female-ish voice if available.
    const voices = speechSynthesis.getVoices();
    const preferred = voices.find(
      (v) =>
        v.lang.startsWith("en") &&
        (v.name.toLowerCase().includes("female") ||
          v.name.toLowerCase().includes("zira") ||
          v.name.toLowerCase().includes("samantha") ||
          v.name.toLowerCase().includes("google us english"))
    ) ?? voices.find((v) => v.lang.startsWith("en"));
    if (preferred) u.voice = preferred;

    u.onstart = () => {
      startTimeRef.current = Date.now();
      setPlaying(true);
      setEnded(false);
      rafRef.current = requestAnimationFrame(tick);
    };
    u.onend = () => {
      stopTicking();
      setElapsed(totalDuration);
      setPlaying(false);
      setEnded(true);
    };
    u.onerror = () => {
      stopTicking();
      setPlaying(false);
    };
    u.onboundary = (ev) => {
      if (ev.name === "word") {
        const ratio = ev.charIndex / SAMPLE_TEXT.length;
        setTotalDuration(Math.max(SAMPLE_DURATION_APPROX, (Date.now() - startTimeRef.current) / 1000 / ratio));
      }
    };

    utterRef.current = u;
    return u;
  }, [tick, totalDuration]);

  // Auto-play on mount (simulates opening from a notification tap).
  useEffect(() => {
    if (status !== "authenticated" || !supported) return;

    // Voices may load async.
    const tryPlay = () => {
      if (speechSynthesis.speaking) speechSynthesis.cancel();
      const u = buildUtterance();
      speechSynthesis.speak(u);
    };

    const voices = speechSynthesis.getVoices();
    if (voices.length > 0) {
      tryPlay();
    } else {
      speechSynthesis.addEventListener("voiceschanged", tryPlay, { once: true });
    }

    return () => {
      speechSynthesis.cancel();
      stopTicking();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, supported]);

  function togglePlay() {
    if (!supported) return;
    if (speechSynthesis.speaking && !speechSynthesis.paused) {
      speechSynthesis.pause();
      stopTicking();
      setPlaying(false);
    } else if (speechSynthesis.paused) {
      speechSynthesis.resume();
      startTimeRef.current = Date.now() - elapsed * 1000;
      rafRef.current = requestAnimationFrame(tick);
      setPlaying(true);
    } else {
      // Restart.
      setElapsed(0);
      setEnded(false);
      const u = buildUtterance();
      speechSynthesis.speak(u);
    }
  }

  function handleSeekClick(e: React.MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    // SpeechSynthesis doesn't support true seeking — restart if clicking past half.
    if (ratio < 0.05) {
      speechSynthesis.cancel();
      setElapsed(0);
      setEnded(false);
      const u = buildUtterance();
      speechSynthesis.speak(u);
    }
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
          style={{
            width: "100%",
            maxWidth: 500,
            background:
              "linear-gradient(160deg, rgba(77,127,255,0.09) 0%, rgba(139,92,246,0.06) 100%)",
            border: "1px solid rgba(77,127,255,0.2)",
            borderRadius: 28,
            padding: "40px 36px",
            backdropFilter: "blur(24px)",
            boxShadow:
              "0 0 80px rgba(77,127,255,0.12), 0 24px 60px rgba(0,0,0,0.28)",
            position: "relative",
            overflow: "hidden",
          }}
        >
          {/* Ambient glows */}
          <div
            style={{
              position: "absolute",
              top: -70,
              right: -50,
              width: 240,
              height: 160,
              borderRadius: "50%",
              background: "rgba(139,92,246,0.16)",
              filter: "blur(60px)",
              pointerEvents: "none",
            }}
          />
          <div
            style={{
              position: "absolute",
              bottom: -50,
              left: -40,
              width: 200,
              height: 140,
              borderRadius: "50%",
              background: "rgba(77,127,255,0.12)",
              filter: "blur(50px)",
              pointerEvents: "none",
            }}
          />

          {/* ── Header ── */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 14,
              marginBottom: 28,
              position: "relative",
            }}
          >
            <div
              style={{
                width: 52,
                height: 52,
                borderRadius: 16,
                flexShrink: 0,
                background: "linear-gradient(135deg, #4d7fff, #8b5cf6)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 8px 28px rgba(77,127,255,0.45)",
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
                    border: "2px solid rgba(77,127,255,0.6)",
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
            <div
              style={{
                marginLeft: "auto",
                fontSize: "0.68rem",
                fontWeight: 700,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                color: "#8b5cf6",
                background: "rgba(139,92,246,0.12)",
                border: "1px solid rgba(139,92,246,0.28)",
                borderRadius: 999,
                padding: "4px 11px",
              }}
            >
              Test
            </div>
          </div>

          {/* ── Script preview ── */}
          <div
            style={{
              padding: "14px 16px",
              borderRadius: 14,
              marginBottom: 24,
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.07)",
            }}
          >
            <div
              style={{
                fontSize: "0.7rem",
                fontWeight: 700,
                color: "#8b5cf6",
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
                color: "rgba(200,215,255,0.65)",
                lineHeight: 1.7,
                fontStyle: "italic",
              }}
            >
              &ldquo;{SAMPLE_TEXT}&rdquo;
            </p>
          </div>

          {/* ── Audio player ── */}
          {!supported ? (
            <div
              style={{
                padding: "18px",
                borderRadius: 14,
                background: "rgba(239,68,68,0.08)",
                border: "1px solid rgba(239,68,68,0.3)",
                textAlign: "center",
                fontSize: "0.82rem",
                color: "#ef4444",
              }}
            >
              Speech synthesis isn&apos;t available in this browser. Try Chrome or Edge.
            </div>
          ) : (
            <div
              style={{
                borderRadius: 18,
                background: playing
                  ? "linear-gradient(135deg, rgba(77,127,255,0.18), rgba(139,92,246,0.14))"
                  : "rgba(255,255,255,0.04)",
                border: `1px solid ${playing ? "rgba(77,127,255,0.45)" : "rgba(255,255,255,0.1)"}`,
                padding: "20px 20px 16px",
                boxShadow: playing ? "0 0 40px rgba(77,127,255,0.2)" : "none",
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
                    background: playing
                      ? "linear-gradient(135deg, #4d7fff, #8b5cf6)"
                      : ended
                      ? "rgba(52,211,153,0.25)"
                      : "rgba(77,127,255,0.2)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                    boxShadow: playing ? "0 4px 22px rgba(77,127,255,0.55)" : "none",
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
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="#34d399" style={{ marginRight: 1 }}>
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

              {/* Seek bar (click to restart) */}
              <div
                onClick={handleSeekClick}
                style={{
                  height: 4,
                  borderRadius: 4,
                  background: "rgba(255,255,255,0.12)",
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
                    background: ended
                      ? "linear-gradient(90deg, #34d399, #10b981)"
                      : "linear-gradient(90deg, #4d7fff, #8b5cf6)",
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
                  color: "rgba(160,175,220,0.5)",
                }}
              >
                <span>{fmt(elapsed)}</span>
                <span style={{ color: "rgba(160,175,220,0.32)" }}>
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
              color: ended
                ? "#34d399"
                : playing
                ? "rgba(77,127,255,0.7)"
                : "rgba(160,175,220,0.4)",
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
