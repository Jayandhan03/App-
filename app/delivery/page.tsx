"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import AppNav from "@/components/AppNav";
import { useNotificationToggle } from "@/lib/push";

function TgIcon({ size = 20, color = "#fff" }: { size?: number; color?: string }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill={color}><path d="M20.665 3.717l-17.73 6.837c-1.21.486-1.203 1.161-.222 1.462l4.552 1.42 10.532-6.645c.498-.303.953-.14.579.192l-8.533 7.701-.314 4.692c.46 0 .663-.211.921-.46l2.211-2.15 4.599 3.397c.848.467 1.457.227 1.668-.787l3.019-14.228c.309-1.239-.473-1.8-1.282-1.432z" /></svg>;
}
function WaIcon({ size = 20, color = "#fff" }: { size?: number; color?: string }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill={color}><path d="M12.05 0C5.5 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.88 11.88 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.82 11.82 0 00-3.48-8.413A11.815 11.815 0 0012.05 0zm6.98 16.813c-.297.833-1.72 1.593-2.363 1.69-.604.09-1.368.128-2.208-.14-.51-.161-1.163-.377-2-.738-3.52-1.52-5.82-5.062-5.996-5.296-.173-.235-1.43-1.9-1.43-3.625s.905-2.573 1.226-2.925c.32-.352.7-.44.934-.44.234 0 .467.002.672.012.215.01.504-.082.788.602.297.703 1.008 2.428 1.096 2.604.09.176.148.383.03.618-.117.235-.176.383-.352.588-.176.204-.37.457-.53.614-.176.176-.36.367-.155.72.205.351.912 1.503 1.958 2.436 1.345 1.2 2.48 1.57 2.832 1.746.352.176.557.147.762-.088.205-.235.878-1.026 1.113-1.378.234-.352.469-.293.792-.176.323.117 2.048.966 2.4 1.142.352.176.586.264.674.41.088.147.088.851-.209 1.684z" /></svg>;
}
function AppIcon({ size = 20, color = "currentColor" }: { size?: number; color?: string }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="3" width="16" height="18" rx="3" /><path d="M8 8l3 3-3 3M13 15h3" /></svg>;
}

const STEPS = [
  { t: "Tap connect", d: "We open a private chat with the Leora bot on Telegram." },
  { t: "Press start", d: "One tap links your account — no codes, no phone number." },
  { t: "You're set", d: "Briefings now arrive right in your Telegram chat." },
];

const WA_STEPS = [
  { t: "Tap connect", d: "We open WhatsApp with a pre-filled message to our number." },
  { t: "Hit send", d: "One tap links your account — no typing required." },
  { t: "You're set", d: "Briefings now arrive right in your WhatsApp chat." },
];

export default function Delivery() {
  const { status } = useSession();
  const router = useRouter();

  const [tgConnected, setTgConnected] = useState(false);
  const [tgUsername, setTgUsername] = useState<string | null>(null);
  const [tgConnecting, setTgConnecting] = useState(false);
  const [tgTesting, setTgTesting] = useState(false);
  const [tgTestSent, setTgTestSent] = useState(false);
  const [tgError, setTgError] = useState<string | null>(null);

  const [waConnected, setWaConnected] = useState(false);
  const [waId, setWaId] = useState<string | null>(null);
  const [waConnecting, setWaConnecting] = useState(false);
  const [waTesting, setWaTesting] = useState(false);
  const [waTestSent, setWaTestSent] = useState(false);
  const [waError, setWaError] = useState<string | null>(null);

  const { permission: notifPermission, enabled: notifEnabled, working: notifWorking, supported: notifSupported, error: notifError, toggle: handleToggleNotifications } = useNotificationToggle();

  useEffect(() => { if (status === "unauthenticated") router.replace("/signin"); }, [status, router]);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/telegram-auth");
        if (res.ok) { const d = await res.json(); if (d.connected) { setTgConnected(true); setTgUsername(d.username ?? d.first_name ?? null); } }
      } catch { /* silent */ }
    })();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/whatsapp-auth");
        if (res.ok) { const d = await res.json(); if (d.connected) { setWaConnected(true); setWaId(d.waId ?? null); } }
      } catch { /* silent */ }
    })();
  }, []);

  useEffect(() => {
    if (!tgConnecting || tgConnected) return;
    const start = Date.now();
    const id = setInterval(async () => {
      if (Date.now() - start > 180_000) { clearInterval(id); setTgConnecting(false); setTgError("Timed out. Tap connect to try again."); return; }
      try {
        const res = await fetch("/api/telegram-auth");
        if (res.ok) { const d = await res.json(); if (d.connected) { clearInterval(id); setTgConnecting(false); setTgConnected(true); setTgUsername(d.username ?? d.first_name ?? null); } }
      } catch { /* keep polling */ }
    }, 2500);
    return () => clearInterval(id);
  }, [tgConnecting, tgConnected]);

  useEffect(() => {
    if (!waConnecting || waConnected) return;
    const start = Date.now();
    const id = setInterval(async () => {
      if (Date.now() - start > 180_000) { clearInterval(id); setWaConnecting(false); setWaError("Timed out. Tap connect to try again."); return; }
      try {
        const res = await fetch("/api/whatsapp-auth");
        if (res.ok) { const d = await res.json(); if (d.connected) { clearInterval(id); setWaConnecting(false); setWaConnected(true); setWaId(d.waId ?? null); } }
      } catch { /* keep polling */ }
    }, 2500);
    return () => clearInterval(id);
  }, [waConnecting, waConnected]);

  const handleConnect = async () => {
    setTgError(null); setTgConnecting(true);
    try {
      const res = await fetch("/api/telegram-auth", { method: "POST" });
      const d = await res.json();
      if (!res.ok || !d.deepLink) { setTgConnecting(false); setTgError(d.error ?? "Could not start connection."); return; }
      window.open(d.deepLink, "_blank", "noopener,noreferrer");
    } catch { setTgConnecting(false); setTgError("Network error — try again."); }
  };
  const handleDisconnect = async () => { setTgError(null); try { await fetch("/api/telegram-auth", { method: "DELETE" }); } catch { /* ignore */ } setTgConnected(false); setTgUsername(null); setTgConnecting(false); setTgTestSent(false); };
  const handleTest = async () => {
    if (tgTesting) return; setTgTesting(true); setTgError(null); setTgTestSent(false);
    try {
      const res = await fetch("/api/telegram-test", { method: "POST" });
      if (res.ok) { setTgTestSent(true); setTimeout(() => setTgTestSent(false), 4000); }
      else { const e = await res.json().catch(() => ({})); setTgError(e.error ?? "Test failed."); }
    } catch { setTgError("Network error — try again."); } finally { setTgTesting(false); }
  };

  const handleWaConnect = async () => {
    setWaError(null); setWaConnecting(true);
    try {
      const res = await fetch("/api/whatsapp-auth", { method: "POST" });
      const d = await res.json();
      if (!res.ok || !d.deepLink) { setWaConnecting(false); setWaError(d.error ?? "Could not start connection."); return; }
      window.open(d.deepLink, "_blank", "noopener,noreferrer");
    } catch { setWaConnecting(false); setWaError("Network error — try again."); }
  };
  const handleWaDisconnect = async () => { setWaError(null); try { await fetch("/api/whatsapp-auth", { method: "DELETE" }); } catch { /* ignore */ } setWaConnected(false); setWaId(null); setWaConnecting(false); setWaTestSent(false); };
  const handleWaTest = async () => {
    if (waTesting) return; setWaTesting(true); setWaError(null); setWaTestSent(false);
    try {
      const res = await fetch("/api/whatsapp-test", { method: "POST" });
      if (res.ok) { setWaTestSent(true); setTimeout(() => setWaTestSent(false), 4000); }
      else { const e = await res.json().catch(() => ({})); setWaError(e.error ?? "Test failed."); }
    } catch { setWaError("Network error — try again."); } finally { setWaTesting(false); }
  };

  if (status === "loading" || status === "unauthenticated") {
    return <div className="row center" style={{ minHeight: "100vh" }}><span className="spinner" /></div>;
  }

  const anyConnected = tgConnected || waConnected;

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)" }}>
      <AppNav />
      <main className="container" style={{ padding: "40px 24px 88px", maxWidth: 1000 }}>
        {/* Header */}
        <div className="rise" style={{ marginBottom: 36 }}>
          <div className="eyebrow" style={{ marginBottom: 14 }}>Delivery channels</div>
          <h1 className="t-h2" style={{ marginBottom: 12, maxWidth: 640 }}>
            {anyConnected ? <>Where your voice notes <span className="serif" style={{ fontSize: "1.05em" }}>land.</span></> : <>Get your voice notes <span className="serif" style={{ fontSize: "1.05em" }}>in your chat app.</span></>}
          </h1>
          <p className="t-lead" style={{ maxWidth: 580 }}>
            Your agents deliver voice-note updates to three places — the Leora app, Telegram and WhatsApp.
            {anyConnected ? " Manage or switch channels anytime." : " Connect a chat app to also get them where you already are — it takes about 15 seconds."}
          </p>
        </div>

        <div className="deliver-grid rise-1">
          {/* Left: channels */}
          <div className="col" style={{ gap: 16 }}>
            {/* In-app inbox — always on */}
            <div className="card card-interactive" style={{ padding: 22 }}>
              <div className="row between wrap" style={{ gap: 10 }}>
                <div className="row" style={{ gap: 13 }}>
                  <span className="row center" style={{ width: 44, height: 44, borderRadius: "var(--r-md)", background: "var(--solid)", color: "var(--solid-ink)", flexShrink: 0 }}><AppIcon size={22} /></span>
                  <div>
                    <div style={{ fontSize: "1rem", fontWeight: 600, letterSpacing: "-0.02em" }}>In the Leora app</div>
                    <div style={{ fontSize: "0.8rem", color: "var(--ink-3)" }}>Turn on in-app notifications here</div>
                  </div>
                </div>
                {!notifSupported ? (
                  <span className="badge badge-muted"><span className="dot" /> Not supported here</span>
                ) : notifPermission === "denied" ? (
                  <span className="badge badge-muted"><span className="dot" /> Notifications blocked</span>
                ) : notifEnabled ? (
                  <span className="badge badge-accent"><span className="dot dot-live" /> Notifications on</span>
                ) : (
                  <span className="badge badge-muted"><span className="dot" /> Notifications off</span>
                )}
              </div>

              <button
                type="button"
                onClick={handleToggleNotifications}
                disabled={notifWorking || !notifSupported || notifPermission === "denied"}
                className="row between wrap"
                style={{ width: "100%", gap: 10, marginTop: 16, paddingTop: 16, borderTop: "1px solid var(--line)", textAlign: "left", cursor: !notifSupported || notifPermission === "denied" ? "not-allowed" : "pointer" }}
              >
                <div>
                  <div style={{ fontSize: "0.85rem", fontWeight: 550 }}>Notify me on new briefings</div>
                  <div style={{ fontSize: "0.76rem", color: "var(--ink-3)" }}>
                    {!notifSupported
                      ? "Push notifications aren't supported in this browser."
                      : notifPermission === "denied"
                      ? "Blocked — enable notifications for Leora in your browser or system settings."
                      : notifEnabled
                      ? "Get a push when your agent scheduler is triggered."
                      : "Off — you won't get a push when a briefing is ready."}
                  </div>
                </div>
                {notifSupported && notifPermission !== "denied" && <span className="toggle" data-on={notifEnabled} />}
              </button>
              {notifError && <div style={{ fontSize: "0.76rem", color: "var(--danger)", marginTop: 8 }}>{notifError}</div>}
            </div>

            {/* Telegram */}
            <div className={`card ${tgConnected ? "card-featured" : ""}`} style={{ overflow: "hidden" }}>
              <div className="row between wrap" style={{ padding: 22, borderBottom: "1px solid var(--line)", gap: 10 }}>
                <div className="row" style={{ gap: 13 }}>
                  <span className="row center" style={{ width: 44, height: 44, borderRadius: "var(--r-md)", background: "#229ED9", flexShrink: 0, boxShadow: "0 6px 18px rgba(34,158,217,0.3)" }}><TgIcon size={22} /></span>
                  <div>
                    <div style={{ fontSize: "1rem", fontWeight: 600, letterSpacing: "-0.02em" }}>Telegram</div>
                    <div style={{ fontSize: "0.8rem", color: "var(--ink-3)" }}>Voice-note updates in your chat</div>
                  </div>
                </div>
                <span className={`badge ${tgConnected ? "badge-accent" : "badge-muted"}`}>
                  <span className={tgConnected ? "dot dot-live" : "dot"} style={{ background: tgConnected ? "var(--accent)" : "var(--ink-4)" }} />
                  {tgConnected ? "Connected" : tgConnecting ? "Connecting" : "Not connected"}
                </span>
              </div>

              <div style={{ padding: 22 }}>
                {tgConnected ? (
                  <>
                    <div className="card" style={{ display: "flex", alignItems: "center", gap: 12, padding: 16, background: "var(--accent-soft)", borderColor: "var(--accent-line)", boxShadow: "none", animation: "riseSm 0.3s var(--ease) both" }}>
                      <span className="row center" style={{ width: 38, height: 38, borderRadius: "var(--r-sm)", background: "#229ED9", flexShrink: 0 }}><TgIcon size={19} /></span>
                      <div>
                        <div style={{ fontSize: "0.9rem", fontWeight: 600, color: "var(--accent-ink)" }}>Leora bot connected</div>
                        <div style={{ fontSize: "0.8rem", color: "var(--ink-2)", marginTop: 1 }}>{tgUsername ? <>Delivering to <strong style={{ color: "var(--ink)" }}>@{tgUsername}</strong></> : "Your Telegram account is linked"}</div>
                      </div>
                    </div>
                    <div className="row" style={{ gap: 10, marginTop: 14, flexWrap: "wrap" }}>
                      <button onClick={handleTest} disabled={tgTesting} className={`btn ${tgTestSent ? "btn-accent" : "btn-secondary"}`} style={{ flex: 1, minWidth: 160 }}>
                        {tgTestSent ? "✓ Sent — check Telegram" : tgTesting ? <><span className="spinner" style={{ width: 15, height: 15 }} /> Sending…</> : "Send test voice note"}
                      </button>
                      <button onClick={handleDisconnect} className="btn btn-ghost" style={{ color: "var(--danger)" }}>Disconnect</button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="col" style={{ gap: 2, marginBottom: 18 }}>
                      {STEPS.map((s, i) => (
                        <div key={i} className="row" style={{ gap: 13, alignItems: "flex-start" }}>
                          <div className="col center" style={{ alignItems: "center" }}>
                            <span className="row center" style={{ width: 26, height: 26, borderRadius: "50%", fontSize: "0.75rem", fontWeight: 700, background: tgConnecting && i === 0 ? "var(--accent)" : "var(--surface-2)", color: tgConnecting && i === 0 ? "#fff" : "var(--ink-3)", border: "1px solid var(--line-2)", flexShrink: 0, transition: "background 0.3s var(--ease), color 0.3s var(--ease)" }}>{i + 1}</span>
                            {i < STEPS.length - 1 && <span style={{ width: 1.5, height: 22, background: "var(--line)" }} />}
                          </div>
                          <div style={{ paddingBottom: 12 }}>
                            <div style={{ fontSize: "0.88rem", fontWeight: 600 }}>{s.t}</div>
                            <div style={{ fontSize: "0.8rem", color: "var(--ink-3)", marginTop: 2 }}>{s.d}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                    {tgConnecting ? (
                      <div className="card" style={{ padding: 18, textAlign: "center", background: "var(--surface-2)", boxShadow: "none" }}>
                        <div className="row center" style={{ gap: 9, marginBottom: 8 }}><span className="spinner" style={{ width: 15, height: 15 }} /><span style={{ fontSize: "0.88rem", fontWeight: 600 }}>Waiting for Telegram…</span></div>
                        <p style={{ fontSize: "0.82rem", color: "var(--ink-2)", marginBottom: 12, lineHeight: 1.55 }}>Press <strong style={{ color: "var(--ink)" }}>START</strong> in the chat that opened. This updates automatically.</p>
                        <button onClick={handleConnect} className="btn btn-secondary btn-sm">Reopen Telegram</button>
                      </div>
                    ) : (
                      <button onClick={handleConnect} className="btn btn-lg" style={{ width: "100%", background: "#229ED9", color: "#fff", boxShadow: "0 6px 20px rgba(34,158,217,0.25)" }}>
                        <TgIcon size={18} /> Open Telegram &amp; connect
                      </button>
                    )}
                  </>
                )}
                {tgError && <div className="card" style={{ marginTop: 12, padding: "10px 14px", background: "var(--danger-soft)", borderColor: "var(--danger)", color: "var(--danger)", fontSize: "0.82rem", boxShadow: "none", animation: "riseSm 0.25s var(--ease) both" }}>{tgError}</div>}
                <p className="t-muted" style={{ fontSize: "0.74rem", marginTop: 16, paddingTop: 14, borderTop: "1px solid var(--line)", textAlign: "center" }}>We only receive your chat ID — never your messages or contacts.</p>
              </div>
            </div>

            {/* WhatsApp */}
            <div className={`card ${waConnected ? "card-featured" : ""}`} style={{ overflow: "hidden" }}>
              <div className="row between wrap" style={{ padding: 22, borderBottom: "1px solid var(--line)", gap: 10 }}>
                <div className="row" style={{ gap: 13 }}>
                  <span className="row center" style={{ width: 44, height: 44, borderRadius: "var(--r-md)", background: "#25D366", flexShrink: 0, boxShadow: "0 6px 18px rgba(37,211,102,0.3)" }}><WaIcon size={22} /></span>
                  <div>
                    <div style={{ fontSize: "1rem", fontWeight: 600, letterSpacing: "-0.02em" }}>WhatsApp</div>
                    <div style={{ fontSize: "0.8rem", color: "var(--ink-3)" }}>Voice-note updates in your chat</div>
                  </div>
                </div>
                <span className={`badge ${waConnected ? "badge-accent" : "badge-muted"}`}>
                  <span className={waConnected ? "dot dot-live" : "dot"} style={{ background: waConnected ? "var(--accent)" : "var(--ink-4)" }} />
                  {waConnected ? "Connected" : waConnecting ? "Connecting" : "Not connected"}
                </span>
              </div>

              <div style={{ padding: 22 }}>
                {waConnected ? (
                  <>
                    <div className="card" style={{ display: "flex", alignItems: "center", gap: 12, padding: 16, background: "var(--accent-soft)", borderColor: "var(--accent-line)", boxShadow: "none", animation: "riseSm 0.3s var(--ease) both" }}>
                      <span className="row center" style={{ width: 38, height: 38, borderRadius: "var(--r-sm)", background: "#25D366", flexShrink: 0 }}><WaIcon size={19} /></span>
                      <div>
                        <div style={{ fontSize: "0.9rem", fontWeight: 600, color: "var(--accent-ink)" }}>WhatsApp connected</div>
                        <div style={{ fontSize: "0.8rem", color: "var(--ink-2)", marginTop: 1 }}>{waId ? <>Delivering to <strong style={{ color: "var(--ink)" }}>{waId}</strong></> : "Your WhatsApp account is linked"}</div>
                      </div>
                    </div>
                    <div className="row" style={{ gap: 10, marginTop: 14, flexWrap: "wrap" }}>
                      <button onClick={handleWaTest} disabled={waTesting} className={`btn ${waTestSent ? "btn-accent" : "btn-secondary"}`} style={{ flex: 1, minWidth: 160 }}>
                        {waTestSent ? "✓ Sent — check WhatsApp" : waTesting ? <><span className="spinner" style={{ width: 15, height: 15 }} /> Sending…</> : "Send test message"}
                      </button>
                      <button onClick={handleWaDisconnect} className="btn btn-ghost" style={{ color: "var(--danger)" }}>Disconnect</button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="col" style={{ gap: 2, marginBottom: 18 }}>
                      {WA_STEPS.map((s, i) => (
                        <div key={i} className="row" style={{ gap: 13, alignItems: "flex-start" }}>
                          <div className="col center" style={{ alignItems: "center" }}>
                            <span className="row center" style={{ width: 26, height: 26, borderRadius: "50%", fontSize: "0.75rem", fontWeight: 700, background: waConnecting && i === 0 ? "var(--accent)" : "var(--surface-2)", color: waConnecting && i === 0 ? "#fff" : "var(--ink-3)", border: "1px solid var(--line-2)", flexShrink: 0, transition: "background 0.3s var(--ease), color 0.3s var(--ease)" }}>{i + 1}</span>
                            {i < WA_STEPS.length - 1 && <span style={{ width: 1.5, height: 22, background: "var(--line)" }} />}
                          </div>
                          <div style={{ paddingBottom: 12 }}>
                            <div style={{ fontSize: "0.88rem", fontWeight: 600 }}>{s.t}</div>
                            <div style={{ fontSize: "0.8rem", color: "var(--ink-3)", marginTop: 2 }}>{s.d}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                    {waConnecting ? (
                      <div className="card" style={{ padding: 18, textAlign: "center", background: "var(--surface-2)", boxShadow: "none" }}>
                        <div className="row center" style={{ gap: 9, marginBottom: 8 }}><span className="spinner" style={{ width: 15, height: 15 }} /><span style={{ fontSize: "0.88rem", fontWeight: 600 }}>Waiting for WhatsApp…</span></div>
                        <p style={{ fontSize: "0.82rem", color: "var(--ink-2)", marginBottom: 12, lineHeight: 1.55 }}>Press <strong style={{ color: "var(--ink)" }}>SEND</strong> in the chat that opened. This updates automatically.</p>
                        <button onClick={handleWaConnect} className="btn btn-secondary btn-sm">Reopen WhatsApp</button>
                      </div>
                    ) : (
                      <button onClick={handleWaConnect} className="btn btn-lg" style={{ width: "100%", background: "#25D366", color: "#fff", boxShadow: "0 6px 20px rgba(37,211,102,0.25)" }}>
                        <WaIcon size={18} /> Open WhatsApp &amp; connect
                      </button>
                    )}
                  </>
                )}
                {waError && <div className="card" style={{ marginTop: 12, padding: "10px 14px", background: "var(--danger-soft)", borderColor: "var(--danger)", color: "var(--danger)", fontSize: "0.82rem", boxShadow: "none", animation: "riseSm 0.25s var(--ease) both" }}>{waError}</div>}
                <p className="t-muted" style={{ fontSize: "0.74rem", marginTop: 16, paddingTop: 14, borderTop: "1px solid var(--line)", textAlign: "center" }}>We only receive your WhatsApp number — never your messages or contacts.</p>
              </div>
            </div>
          </div>

          {/* Right: preview + features */}
          <div className="col" style={{ gap: 16 }}>
            <div className="card" style={{ overflow: "hidden", padding: 0, boxShadow: "var(--shadow-lg)", borderRadius: "var(--r-xl)" }}>
              <div className="row" style={{ gap: 10, padding: "14px 16px", borderBottom: "1px solid var(--line)", background: "var(--surface-2)" }}>
                <span className="row center" style={{ width: 34, height: 34, borderRadius: "50%", background: "#229ED9", flexShrink: 0 }}><TgIcon size={17} /></span>
                <div><div style={{ fontSize: "0.85rem", fontWeight: 600 }}>Leora</div><div className="row" style={{ gap: 6, fontSize: "0.72rem", color: "var(--accent-ink)" }}><span className="dot" style={{ width: 5, height: 5 }} /> bot · online</div></div>
              </div>
              <div style={{ padding: "18px 16px", display: "flex", flexDirection: "column", gap: 10, minHeight: 200 }}>
                <div style={{ alignSelf: "flex-start", maxWidth: "88%", background: "var(--surface-2)", border: "1px solid var(--line)", borderRadius: "14px 14px 14px 4px", padding: "11px 13px" }}>
                  <div style={{ fontSize: "0.82rem", lineHeight: 1.5 }}>Good morning. Your Finance agent found 3 market-moving updates overnight — here&apos;s your voice note.</div>
                  <div style={{ fontSize: "0.68rem", color: "var(--ink-4)", textAlign: "right", marginTop: 4 }}>8:00 AM</div>
                </div>
                <div style={{ alignSelf: "flex-start", maxWidth: "88%", background: "var(--surface-2)", border: "1px solid var(--line)", borderRadius: 14, padding: "11px 13px" }} className="row">
                  <span className="row center" style={{ width: 34, height: 34, borderRadius: "50%", background: "var(--accent)", color: "#fff", flexShrink: 0, marginRight: 11, boxShadow: "0 4px 14px var(--accent-glow)" }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
                  </span>
                  <div className="row" style={{ gap: 2, height: 22, flex: 1 }}>
                    {Array.from({ length: 22 }).map((_, i) => <span key={i} style={{ width: 2.5, borderRadius: 2, background: i < 8 ? "var(--accent)" : "var(--line-3)", height: `${[6,12,18,9,15,20,11,7,16,13,19,8,14,10,17,6,12,18,9,15,11,7][i]}px` }} />)}
                  </div>
                </div>
                <div style={{ alignSelf: "flex-start", fontSize: "0.7rem", color: "var(--ink-4)", paddingLeft: 4 }}>English · Analytical tone · 3:12</div>
              </div>
            </div>
            <div className="grid" style={{ gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              {[["On your schedule", "Daily, hourly or custom."], ["Instant delivery", "Tap and listen anywhere."], ["Any language", "In your voice & tone."], ["Quiet hours", "No pings while you sleep."]].map(([t, d]) => (
                <div key={t} className="card card-interactive" style={{ padding: 16 }}>
                  <div style={{ fontSize: "0.82rem", fontWeight: 600 }}>{t}</div>
                  <div style={{ fontSize: "0.75rem", color: "var(--ink-3)", marginTop: 3, lineHeight: 1.45 }}>{d}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>

      <style>{`
        .deliver-grid { display: grid; grid-template-columns: 1.05fr 0.95fr; gap: 20px; align-items: start; }
        @media (max-width: 860px) { .deliver-grid { grid-template-columns: 1fr; } }
      `}</style>
    </div>
  );
}
