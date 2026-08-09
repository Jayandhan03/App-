"use client";

import { useEffect, useRef, useState } from "react";
import { isNativeApp } from "@/lib/capacitor";

interface NowPlaying {
  title: string;
  body: string;
}

function fmt(s: number): string {
  if (!isFinite(s) || s < 0) return "0:00";
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

// The server always prefixes titles with an emoji (e.g. "🎧 Test briefing
// ready") for use as plain OS-notification text. We render our own icon
// avatar here, so strip a leading emoji to avoid showing it twice.
function stripLeadingEmoji(title: string): string {
  return title.replace(/^\p{Extended_Pictographic}\s*/u, "").trim() || title;
}

// Mounted app-wide (see app/layout.tsx). Web-only counterpart to the native
// VoiceNotePlayer flow in PushNotificationBridge: when the "▶ Play" action
// on a system notification is tapped, the service worker (which can't play
// audio itself) hands playback off here via postMessage instead of
// navigating/focusing the tab — so audio starts wherever the user already is.
export default function BackgroundAudioPlayer() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [nowPlaying, setNowPlaying] = useState<NowPlaying | null>(null);
  const [playing, setPlaying] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [duration, setDuration] = useState(0);
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    if (isNativeApp() || typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;

    const onMessage = (event: MessageEvent) => {
      if (event.data?.type !== "PLAY_AUDIO") return;
      const { url, title, body } = event.data as { url: string; title?: string; body?: string };
      const el = audioRef.current;
      if (!el || !url) return;

      setClosing(false);
      setElapsed(0);
      setDuration(0);
      el.src = url;
      el.currentTime = 0;
      el.play().catch((err) => console.warn("[audio] background play failed:", err));
      setNowPlaying({ title: title || "Leora", body: body || "" });

      if ("mediaSession" in navigator) {
        navigator.mediaSession.metadata = new MediaMetadata({
          title: title || "Leora",
          artist: body || "Voice briefing",
        });
        navigator.mediaSession.setActionHandler("play", () => el.play());
        navigator.mediaSession.setActionHandler("pause", () => el.pause());
      }
    };

    navigator.serviceWorker.addEventListener("message", onMessage);
    return () => navigator.serviceWorker.removeEventListener("message", onMessage);
  }, []);

  if (isNativeApp()) return null;

  const togglePlay = () => {
    const el = audioRef.current;
    if (!el) return;
    if (el.paused) el.play().catch((err) => console.warn("[audio] resume failed:", err));
    else el.pause();
  };

  const seekTo = (clientX: number, track: HTMLDivElement) => {
    const el = audioRef.current;
    if (!el || !isFinite(el.duration)) return;
    const rect = track.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    el.currentTime = ratio * el.duration;
    setElapsed(el.currentTime);
  };

  const dismiss = () => {
    const el = audioRef.current;
    if (el) el.pause();
    setClosing(true);
    setTimeout(() => {
      setNowPlaying(null);
      setClosing(false);
    }, 200);
  };

  const progress = duration > 0 ? Math.min(elapsed / duration, 1) : 0;
  const title = nowPlaying ? stripLeadingEmoji(nowPlaying.title) : "";

  return (
    <>
      <audio
        ref={audioRef}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
        onTimeUpdate={(e) => setElapsed(e.currentTarget.currentTime)}
        onLoadedMetadata={(e) => {
          if (isFinite(e.currentTarget.duration)) setDuration(e.currentTarget.duration);
        }}
        style={{ display: "none" }}
      />
      {nowPlaying && (
        <div className={`bap-wrap ${closing ? "bap-wrap-out" : "bap-wrap-in"}`}>
          <div className="bap-card" role="region" aria-label="Now playing">
            <div className="bap-top">
              <div className="bap-icon">
                🎧
                {playing && <span className="bap-dot" />}
              </div>

              <div className="bap-meta">
                <div className="bap-title">{title}</div>
                <div className="bap-subtitle" aria-live="polite">
                  {playing ? nowPlaying.body : "Paused"}
                </div>
              </div>

              <button
                type="button"
                onClick={togglePlay}
                aria-label={playing ? "Pause" : "Play"}
                className={`bap-play ${playing ? "bap-play-on" : ""}`}
              >
                {playing ? (
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                    <rect x="6" y="4" width="4" height="16" rx="1" />
                    <rect x="14" y="4" width="4" height="16" rx="1" />
                  </svg>
                ) : (
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" style={{ marginLeft: 2 }}>
                    <path d="M8 5v14l11-7z" />
                  </svg>
                )}
              </button>

              <button type="button" onClick={dismiss} aria-label="Dismiss" className="bap-close">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
                  <path d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
            </div>

            <div
              className="bap-progress"
              role="slider"
              aria-label="Seek"
              aria-valuemin={0}
              aria-valuemax={Math.round(duration) || 0}
              aria-valuenow={Math.round(elapsed)}
              tabIndex={0}
              onClick={(e) => seekTo(e.clientX, e.currentTarget)}
              onKeyDown={(e) => {
                const el = audioRef.current;
                if (!el || !isFinite(el.duration)) return;
                if (e.key === "ArrowRight") { el.currentTime = Math.min(el.duration, el.currentTime + 5); setElapsed(el.currentTime); }
                if (e.key === "ArrowLeft") { el.currentTime = Math.max(0, el.currentTime - 5); setElapsed(el.currentTime); }
              }}
            >
              <div className="bap-progress-fill" style={{ width: `${progress * 100}%` }} />
              <div className="bap-progress-thumb" style={{ left: `${progress * 100}%` }} />
            </div>

            <div className="bap-times">
              <span>{fmt(elapsed)}</span>
              <span>{fmt(duration)}</span>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .bap-wrap {
          position: fixed;
          left: 0; right: 0; bottom: 0;
          z-index: 9999;
          display: flex;
          justify-content: center;
          padding: 0 16px calc(16px + env(safe-area-inset-bottom, 0px));
          pointer-events: none;
        }
        .bap-wrap-in { animation: bapIn 0.4s cubic-bezier(0.16,1,0.3,1) both; }
        .bap-wrap-out { animation: bapOut 0.2s ease both; }

        .bap-card {
          pointer-events: auto;
          width: 100%;
          max-width: 380px;
          background: var(--surface, #fff);
          border: 1px solid var(--line-2, rgba(77,127,255,0.35));
          border-radius: 18px;
          box-shadow: 0 12px 44px rgba(0,0,0,0.16), 0 0 0 1px rgba(77,127,255,0.1);
          overflow: hidden;
          backdrop-filter: blur(20px);
        }

        .bap-top {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 14px 14px 12px;
        }

        .bap-icon {
          position: relative;
          flex-shrink: 0;
          width: 42px; height: 42px;
          border-radius: 13px;
          display: flex; align-items: center; justify-content: center;
          font-size: 19px;
          background: linear-gradient(135deg, rgba(77,127,255,0.16), rgba(139,92,246,0.12));
          border: 1px solid rgba(77,127,255,0.3);
        }
        .bap-dot {
          position: absolute; top: -3px; right: -3px;
          width: 10px; height: 10px; border-radius: 50%;
          background: #4d7fff;
          box-shadow: 0 0 0 2px var(--surface, #fff);
          animation: bapPulse 1.5s ease-in-out infinite;
        }

        .bap-meta { flex: 1; min-width: 0; }
        .bap-title {
          font-size: 0.86rem; font-weight: 700; color: var(--ink, #111);
          overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
          letter-spacing: -0.01em;
        }
        .bap-subtitle {
          font-size: 0.74rem; color: var(--ink-3, #666); margin-top: 2px;
          overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
        }

        .bap-play {
          flex-shrink: 0;
          width: 40px; height: 40px;
          border-radius: 50%;
          border: none; cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          background: rgba(77,127,255,0.12);
          color: #4d7fff;
          transition: transform 0.15s ease, background 0.2s ease, box-shadow 0.2s ease;
        }
        .bap-play-on {
          background: linear-gradient(135deg, #4d7fff, #8b5cf6);
          color: #fff;
          box-shadow: 0 6px 18px rgba(77,127,255,0.45);
        }
        .bap-play:hover { transform: scale(1.06); }
        .bap-play:active { transform: scale(0.94); }

        .bap-close {
          flex-shrink: 0;
          width: 28px; height: 28px;
          border-radius: 50%;
          border: none; cursor: pointer;
          background: transparent;
          color: var(--ink-4, #999);
          display: flex; align-items: center; justify-content: center;
          transition: background 0.15s ease, color 0.15s ease;
        }
        .bap-close:hover { background: var(--surface-2, rgba(0,0,0,0.05)); color: var(--ink-2, #333); }

        .bap-progress {
          position: relative;
          height: 16px;
          margin: 0 14px;
          cursor: pointer;
          display: flex;
          align-items: center;
        }
        .bap-progress::before {
          content: "";
          position: absolute;
          left: 0; right: 0; top: 50%;
          height: 4px;
          transform: translateY(-50%);
          border-radius: 4px;
          background: var(--line, #eee);
        }
        .bap-progress-fill {
          position: absolute; left: 0; top: 50%;
          height: 4px;
          transform: translateY(-50%);
          border-radius: 4px;
          background: linear-gradient(90deg, #4d7fff, #8b5cf6);
          transition: width 0.12s linear;
          pointer-events: none;
        }
        .bap-progress-thumb {
          position: absolute; top: 50%;
          width: 11px; height: 11px;
          border-radius: 50%;
          background: #fff;
          border: 2.5px solid #4d7fff;
          box-shadow: 0 1px 4px rgba(0,0,0,0.25);
          transform: translate(-50%, -50%);
          transition: left 0.12s linear;
          pointer-events: none;
        }
        .bap-progress:focus-visible {
          outline: 2px solid #4d7fff;
          outline-offset: 2px;
          border-radius: 8px;
        }

        .bap-times {
          display: flex; justify-content: space-between;
          padding: 4px 14px 12px;
          font-size: 0.68rem;
          font-variant-numeric: tabular-nums;
          color: var(--ink-4, #999);
        }

        /* Small screens: full-width docked bar, larger touch targets */
        @media (max-width: 520px) {
          .bap-wrap { padding: 0 10px calc(10px + env(safe-area-inset-bottom, 0px)); }
          .bap-card { max-width: 100%; border-radius: 20px; }
          .bap-play { width: 44px; height: 44px; }
          .bap-close { width: 32px; height: 32px; }
        }

        @media (prefers-reduced-motion: reduce) {
          .bap-wrap-in, .bap-wrap-out, .bap-dot { animation: none; }
        }

        @keyframes bapIn { from { opacity: 0; transform: translateY(24px) scale(0.96); } to { opacity: 1; transform: translateY(0) scale(1); } }
        @keyframes bapOut { from { opacity: 1; transform: translateY(0) scale(1); } to { opacity: 0; transform: translateY(24px) scale(0.96); } }
        @keyframes bapPulse { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.55; transform: scale(1.25); } }
      `}</style>
    </>
  );
}
