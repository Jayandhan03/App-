"use client";

import { useState } from "react";
import AppNav from "@/components/AppNav";
import Logo from "@/components/Logo";

/* ── Inline icons ─────────────────────────────────────────────────────────── */
function AndroidIcon({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M6.18 15.64a2.18 2.18 0 0 1-2.18-2.18V9.36a2.18 2.18 0 0 1 4.36 0v4.1a2.18 2.18 0 0 1-2.18 2.18zm11.64 0a2.18 2.18 0 0 1-2.18-2.18V9.36a2.18 2.18 0 0 1 4.36 0v4.1a2.18 2.18 0 0 1-2.18 2.18zM5.63 7h12.74A2.63 2.63 0 0 1 21 9.63v6.74A2.63 2.63 0 0 1 18.37 19H5.63A2.63 2.63 0 0 1 3 16.37V9.63A2.63 2.63 0 0 1 5.63 7zm6.37-5 1.5-2 .5.3L12.5 3M11.5 3 10 .8l-.5.4L11 3" />
      <path d="M5 7l2-3.5a5 5 0 0 1 10 0L19 7" />
      <circle cx="9" cy="11" r="1" />
      <circle cx="15" cy="11" r="1" />
      <path d="M9.5 16.5h5" strokeWidth="1.5" stroke="currentColor" fill="none" strokeLinecap="round" />
    </svg>
  );
}

function WindowsIcon({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M0 3.449L9.75 2.1v9.451H0m10.949-9.602L24 0v11.4H10.949M0 12.6h9.75v9.451L0 20.699M10.949 12.6H24V24l-12.9-1.801" />
    </svg>
  );
}

function DownloadIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}

function CheckIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function SmartphoneIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
      <line x1="12" y1="18" x2="12.01" y2="18" />
    </svg>
  );
}

function MonitorIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
      <line x1="8" y1="21" x2="16" y2="21" />
      <line x1="12" y1="17" x2="12" y2="21" />
    </svg>
  );
}

/* ── Feature pills ────────────────────────────────────────────────────────── */
const MOBILE_FEATURES = [
  "Voice-note briefings on the go",
  "Firebase push notifications",
  "Telegram & WhatsApp deep links",
  "Offline playback",
  "Android 8.0+ (API 26+)",
];

const DESKTOP_FEATURES = [
  "Native Windows / macOS app",
  "System-tray quick access",
  "Background agent sync",
  "Auto-update on launch",
  "Coming soon — notify me",
];

/* ── Page ─────────────────────────────────────────────────────────────────── */
export default function GetLeora() {
  const [notified, setNotified] = useState(false);

  return (
    <>
      <AppNav />

      <main style={{ padding: "64px 24px 120px", maxWidth: 1100, margin: "0 auto" }}>

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div className="rise" style={{ textAlign: "center", marginBottom: 72 }}>
          <div
            className="row center"
            style={{ gap: 8, justifyContent: "center", marginBottom: 20 }}
          >
            <span
              style={{
                display: "inline-flex", alignItems: "center", gap: 6,
                fontSize: "0.72rem", fontWeight: 600, letterSpacing: "0.08em",
                textTransform: "uppercase", color: "var(--accent)",
                background: "var(--accent-soft)", border: "1px solid var(--accent-line)",
                borderRadius: "var(--r-full)", padding: "4px 12px",
              }}
            >
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--accent)", display: "inline-block" }} />
              Now available
            </span>
          </div>

          <h1
            style={{
              fontSize: "clamp(2.2rem, 5vw, 3.6rem)",
              fontWeight: 760,
              letterSpacing: "-0.04em",
              lineHeight: 1.08,
              marginBottom: 20,
              color: "var(--ink)",
            }}
          >
            Get Leora on every{" "}
            <span
              className="serif"
              style={{ fontSize: "1.05em", color: "var(--accent)" }}
            >
              device.
            </span>
          </h1>

          <p
            style={{
              fontSize: "clamp(1rem, 1.8vw, 1.2rem)",
              color: "var(--ink-3)",
              maxWidth: 520,
              margin: "0 auto",
              lineHeight: 1.6,
            }}
          >
            Your AI voice briefings, wherever you are. Download the Android app
            now — desktop is on its way.
          </p>
        </div>

        {/* ── Cards grid ──────────────────────────────────────────────────── */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
            gap: 24,
          }}
        >
          {/* ── Mobile card ─────────────────────────────────────────────── */}
          <div
            className="card"
            style={{
              padding: 0,
              overflow: "hidden",
              border: "1px solid var(--accent-line)",
              boxShadow: "var(--shadow-glow)",
              position: "relative",
            }}
          >
            {/* gradient top strip */}
            <div
              style={{
                height: 4,
                background: "linear-gradient(90deg, var(--accent), #0BD9AA)",
              }}
            />

            <div style={{ padding: "32px 32px 36px" }}>
              {/* platform badge */}
              <div className="row" style={{ gap: 12, marginBottom: 28 }}>
                <span
                  style={{
                    width: 52, height: 52, borderRadius: "var(--r-md)",
                    background: "linear-gradient(135deg, #3DDC84, #0BA678)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    color: "#fff", flexShrink: 0,
                  }}
                >
                  <AndroidIcon size={26} />
                </span>
                <div>
                  <div style={{ fontSize: "0.72rem", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--accent)", marginBottom: 2 }}>Android</div>
                  <div style={{ fontSize: "1.15rem", fontWeight: 700, letterSpacing: "-0.02em", color: "var(--ink)" }}>Leora Mobile</div>
                </div>
              </div>

              {/* version info */}
              <div
                className="row"
                style={{
                  gap: 8, marginBottom: 28,
                  padding: "10px 14px",
                  background: "var(--surface-2)",
                  borderRadius: "var(--r-sm)",
                  border: "1px solid var(--line)",
                }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: "0.72rem", color: "var(--ink-3)", marginBottom: 1 }}>Latest version</div>
                  <div style={{ fontSize: "0.9rem", fontWeight: 600, color: "var(--ink)" }}>v1.2</div>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: "0.72rem", color: "var(--ink-3)", marginBottom: 1 }}>File size</div>
                  <div style={{ fontSize: "0.9rem", fontWeight: 600, color: "var(--ink)" }}>4.6 MB</div>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: "0.72rem", color: "var(--ink-3)", marginBottom: 1 }}>Format</div>
                  <div style={{ fontSize: "0.9rem", fontWeight: 600, color: "var(--ink)" }}>.apk</div>
                </div>
              </div>

              {/* features */}
              <ul style={{ listStyle: "none", marginBottom: 32, display: "flex", flexDirection: "column", gap: 10 }}>
                {MOBILE_FEATURES.map((f) => (
                  <li key={f} className="row" style={{ gap: 10, fontSize: "0.85rem", color: "var(--ink-2)" }}>
                    <span
                      style={{
                        width: 20, height: 20, borderRadius: "50%",
                        background: "var(--accent-soft)", color: "var(--accent)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      <CheckIcon size={11} />
                    </span>
                    {f}
                  </li>
                ))}
              </ul>

              {/* install notice */}
              <div
                style={{
                  fontSize: "0.75rem", color: "var(--ink-3)",
                  padding: "10px 14px",
                  background: "var(--warn-soft)",
                  borderRadius: "var(--r-sm)",
                  border: "1px solid rgba(180,121,27,0.2)",
                  marginBottom: 20,
                  lineHeight: 1.5,
                }}
              >
                <strong style={{ color: "var(--warn)" }}>Sideload note:</strong>{" "}
                Enable <em>Install unknown apps</em> in your Android settings before installing the APK.
              </div>

              {/* download button */}
              <a
                href="/downloads/leora-v1.2.apk"
                download="leora-v1.2.apk"
                style={{
                  display: "flex", alignItems: "center", justifyContent: "center",
                  gap: 10, width: "100%", height: 50,
                  background: "var(--accent)",
                  color: "#fff",
                  borderRadius: "var(--r-md)",
                  fontWeight: 650,
                  fontSize: "0.95rem",
                  letterSpacing: "-0.01em",
                  transition: "background 0.18s var(--ease), transform 0.15s var(--ease), box-shadow 0.18s var(--ease)",
                  textDecoration: "none",
                  boxShadow: "0 4px 20px var(--accent-glow)",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLAnchorElement).style.background = "var(--accent-strong)";
                  (e.currentTarget as HTMLAnchorElement).style.transform = "translateY(-1px)";
                  (e.currentTarget as HTMLAnchorElement).style.boxShadow = "0 8px 32px var(--accent-glow)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLAnchorElement).style.background = "var(--accent)";
                  (e.currentTarget as HTMLAnchorElement).style.transform = "translateY(0)";
                  (e.currentTarget as HTMLAnchorElement).style.boxShadow = "0 4px 20px var(--accent-glow)";
                }}
              >
                <DownloadIcon size={18} />
                Download for Android
              </a>

              <div style={{ textAlign: "center", marginTop: 12, fontSize: "0.72rem", color: "var(--ink-4)" }}>
                Free · No account required to install
              </div>
            </div>
          </div>

          {/* ── Desktop card ─────────────────────────────────────────────── */}
          <div
            className="card"
            style={{
              padding: 0,
              overflow: "hidden",
              position: "relative",
              opacity: 0.92,
            }}
          >
            {/* gradient top strip */}
            <div
              style={{
                height: 4,
                background: "linear-gradient(90deg, var(--ink-4), var(--ink-3))",
              }}
            />

            {/* coming-soon badge */}
            <div
              style={{
                position: "absolute", top: 20, right: 20,
                fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.08em",
                textTransform: "uppercase", color: "var(--ink-3)",
                background: "var(--surface-2)", border: "1px solid var(--line-2)",
                borderRadius: "var(--r-full)", padding: "3px 10px",
              }}
            >
              Coming soon
            </div>

            <div style={{ padding: "32px 32px 36px" }}>
              {/* platform badge */}
              <div className="row" style={{ gap: 12, marginBottom: 28 }}>
                <span
                  style={{
                    width: 52, height: 52, borderRadius: "var(--r-md)",
                    background: "var(--surface-3)",
                    border: "1px solid var(--line-2)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    color: "var(--ink-3)", flexShrink: 0,
                  }}
                >
                  <WindowsIcon size={24} />
                </span>
                <div>
                  <div style={{ fontSize: "0.72rem", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--ink-3)", marginBottom: 2 }}>Windows · macOS</div>
                  <div style={{ fontSize: "1.15rem", fontWeight: 700, letterSpacing: "-0.02em", color: "var(--ink)" }}>Leora Desktop</div>
                </div>
              </div>

              {/* version info */}
              <div
                className="row"
                style={{
                  gap: 8, marginBottom: 28,
                  padding: "10px 14px",
                  background: "var(--surface-2)",
                  borderRadius: "var(--r-sm)",
                  border: "1px solid var(--line)",
                }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: "0.72rem", color: "var(--ink-3)", marginBottom: 1 }}>Version</div>
                  <div style={{ fontSize: "0.9rem", fontWeight: 600, color: "var(--ink-3)" }}>In progress</div>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: "0.72rem", color: "var(--ink-3)", marginBottom: 1 }}>Platform</div>
                  <div style={{ fontSize: "0.9rem", fontWeight: 600, color: "var(--ink)" }}>Win / Mac</div>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: "0.72rem", color: "var(--ink-3)", marginBottom: 1 }}>Format</div>
                  <div style={{ fontSize: "0.9rem", fontWeight: 600, color: "var(--ink)" }}>.exe / .dmg</div>
                </div>
              </div>

              {/* features */}
              <ul style={{ listStyle: "none", marginBottom: 32, display: "flex", flexDirection: "column", gap: 10 }}>
                {DESKTOP_FEATURES.map((f) => (
                  <li key={f} className="row" style={{ gap: 10, fontSize: "0.85rem", color: "var(--ink-3)" }}>
                    <span
                      style={{
                        width: 20, height: 20, borderRadius: "50%",
                        background: "var(--surface-3)",
                        color: "var(--ink-4)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      <CheckIcon size={11} />
                    </span>
                    {f}
                  </li>
                ))}
              </ul>

              {/* notify me */}
              {!notified ? (
                <button
                  onClick={() => setNotified(true)}
                  style={{
                    display: "flex", alignItems: "center", justifyContent: "center",
                    gap: 10, width: "100%", height: 50,
                    background: "var(--surface-2)",
                    color: "var(--ink-2)",
                    border: "1px solid var(--line-2)",
                    borderRadius: "var(--r-md)",
                    fontWeight: 600,
                    fontSize: "0.95rem",
                    cursor: "pointer",
                    transition: "background 0.18s var(--ease), border-color 0.18s var(--ease)",
                    fontFamily: "inherit",
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.background = "var(--surface-3)";
                    (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--line-3)";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.background = "var(--surface-2)";
                    (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--line-2)";
                  }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                  </svg>
                  Notify me when it's ready
                </button>
              ) : (
                <div
                  style={{
                    display: "flex", alignItems: "center", justifyContent: "center",
                    gap: 10, width: "100%", height: 50,
                    background: "var(--accent-soft)",
                    color: "var(--accent)",
                    border: "1px solid var(--accent-line)",
                    borderRadius: "var(--r-md)",
                    fontWeight: 600,
                    fontSize: "0.9rem",
                  }}
                >
                  <CheckIcon size={16} />
                  You&apos;re on the list — we&apos;ll let you know!
                </div>
              )}

              <div style={{ textAlign: "center", marginTop: 12, fontSize: "0.72rem", color: "var(--ink-4)" }}>
                .exe installer · Auto-updater included
              </div>
            </div>
          </div>
        </div>

        {/* ── Bottom stat strip ───────────────────────────────────────────── */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
            gap: 1,
            marginTop: 56,
            background: "var(--line)",
            borderRadius: "var(--r-lg)",
            overflow: "hidden",
            border: "1px solid var(--line)",
          }}
        >
          {[
            { icon: <SmartphoneIcon size={18} />, label: "Android 8.0+", sub: "API level 26 and above" },
            { icon: <MonitorIcon size={18} />, label: "Desktop soon", sub: "Windows & macOS" },
            { icon: <DownloadIcon size={18} />, label: "Free to download", sub: "No credit card needed" },
            { icon: <CheckIcon size={18} />, label: "No ads, ever", sub: "Clean, private experience" },
          ].map((s) => (
            <div
              key={s.label}
              style={{
                background: "var(--surface)",
                padding: "22px 20px",
                display: "flex", flexDirection: "column", alignItems: "center",
                textAlign: "center", gap: 8,
              }}
            >
              <span style={{ color: "var(--accent)", opacity: 0.85 }}>{s.icon}</span>
              <div style={{ fontSize: "0.88rem", fontWeight: 650, color: "var(--ink)", letterSpacing: "-0.01em" }}>{s.label}</div>
              <div style={{ fontSize: "0.73rem", color: "var(--ink-3)" }}>{s.sub}</div>
            </div>
          ))}
        </div>

      </main>
    </>
  );
}
