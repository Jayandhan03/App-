"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession, signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import ThemeToggle from "@/components/ThemeToggle";
import Logo from "@/components/Logo";
import { isNativeApp, nativeGoogleSignIn } from "@/lib/capacitor";

const AGENTS = [
  { icon: "📈", n: "Finance", s: "Recording your 8 AM brief" },
  { icon: "🤖", n: "AI & Tech", s: "Reading 24 articles" },
  { icon: "🔭", n: "My competitor", s: "Watching for launches" },
];

export default function SignIn() {
  const { status } = useSession();
  const router = useRouter();
  const [nativeError, setNativeError] = useState<string | null>(null);

  useEffect(() => { if (status === "authenticated") router.replace("/dashboard"); }, [status, router]);

  const handleGoogleSignIn = async () => {
    // Inside the native app, use the OS-level account picker (every Google
    // account on the device) instead of NextAuth's browser redirect flow.
    if (isNativeApp()) {
      setNativeError(null);
      try {
        await nativeGoogleSignIn();
        window.location.href = "/dashboard"; // hard nav so the new session cookie is picked up
      } catch (err: unknown) {
        setNativeError(err instanceof Error ? err.message : String(err));
      }
    } else {
      signIn("google", { callbackUrl: "/dashboard" });
    }
  };

  if (status === "loading" || status === "authenticated") {
    return <div className="row center" style={{ minHeight: "100vh" }}><span className="spinner" /></div>;
  }

  return (
    <div className="signin-shell" style={{ minHeight: "100vh", display: "grid", gridTemplateColumns: "1fr 1fr", background: "var(--bg)" }}>
      {/* ── Left: sign in ── */}
      <div style={{ position: "relative", display: "flex", flexDirection: "column" }}>
        <div className="row between" style={{ height: 64, padding: "0 28px" }}>
          <Link href="/" className="row" style={{ gap: 10 }}><Logo /><span style={{ fontWeight: 600, letterSpacing: "-0.02em" }}>Leora</span></Link>
          <ThemeToggle />
        </div>

        <div className="row center grow" style={{ padding: 24 }}>
          <div className="rise" style={{ width: "100%", maxWidth: 400 }}>
            <div style={{ textAlign: "center", marginBottom: 32 }}>
              <div className="badge badge-accent" style={{ marginBottom: 20 }}><span className="dot dot-live" /> Your AI agents</div>
              <h1 className="t-h2" style={{ marginBottom: 10 }}>Welcome <span className="serif" style={{ fontSize: "1.05em" }}>back.</span></h1>
              <p className="t-2" style={{ fontSize: "0.92rem" }}>Sign in to your agents and today&apos;s voice notes.</p>
            </div>

            <div className="card" style={{ padding: 28, borderRadius: "var(--r-xl)" }}>
              <button
                id="google-signin-btn"
                onClick={handleGoogleSignIn}
                className="btn btn-lg btn-secondary"
                style={{ width: "100%" }}
              >
                <svg width="18" height="18" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>
                Continue with Google
              </button>
              {nativeError && (
                <p style={{ color: "var(--danger, #E5484D)", fontSize: "0.75rem", marginTop: 10, textAlign: "center", wordBreak: "break-word" }}>
                  Sign-in failed: {nativeError}
                </p>
              )}

              <div className="row center" style={{ gap: 12, margin: "22px 0" }}>
                <span className="hairline grow" /><span className="t-muted" style={{ fontSize: "0.7rem", letterSpacing: "0.08em" }}>PRIVATE &amp; SECURE</span><span className="hairline grow" />
              </div>

              <div className="col" style={{ gap: 11 }}>
                {["We never sell your data or post on your behalf", "Encrypted in transit and at rest", "Delete your agents and data anytime"].map(t => (
                  <div key={t} className="row" style={{ gap: 9 }}>
                    <span className="row center" style={{ width: 16, height: 16, borderRadius: "50%", background: "var(--accent-soft)", color: "var(--accent)", flexShrink: 0 }}>
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
                    </span>
                    <span style={{ fontSize: "0.8rem", color: "var(--ink-2)" }}>{t}</span>
                  </div>
                ))}
              </div>
            </div>

            <p className="t-muted" style={{ textAlign: "center", fontSize: "0.75rem", marginTop: 20, lineHeight: 1.6 }}>
              By continuing you agree to our <a href="#" style={{ color: "var(--ink-2)", textDecoration: "underline" }}>Terms</a> and <a href="#" style={{ color: "var(--ink-2)", textDecoration: "underline" }}>Privacy Policy</a>.
            </p>
            <div style={{ textAlign: "center", marginTop: 12 }}>
              <Link href="/" className="nav-link" style={{ fontSize: "0.82rem" }}>← Back to home</Link>
            </div>
          </div>
        </div>
      </div>

      {/* ── Right: living product vignette ── */}
      <div className="signin-visual" style={{ position: "relative", overflow: "hidden", background: "var(--bg-tint)", borderLeft: "1px solid var(--line)", display: "flex", alignItems: "center", justifyContent: "center", padding: 48 }}>
        <div className="aurora" aria-hidden="true" />
        <div className="field-grid" style={{ position: "absolute", inset: 0, opacity: 0.5, pointerEvents: "none" }} />

        <div className="rise-2" style={{ position: "relative", width: "100%", maxWidth: 400 }}>
          <div className="card" style={{ padding: 22, borderRadius: "var(--r-xl)", boxShadow: "var(--shadow-xl)" }}>
            <div className="row between" style={{ marginBottom: 16 }}>
              <div className="eyebrow no-rule">While you were away</div>
              <span className="badge badge-accent" style={{ height: 22 }}><span className="dot dot-live" /> Live</span>
            </div>
            {AGENTS.map((a, k) => (
              <div key={k} className="row between" style={{ padding: "13px 0", borderTop: k ? "1px solid var(--line)" : "none" }}>
                <div className="row" style={{ gap: 11 }}>
                  <span className="row center" style={{ width: 34, height: 34, borderRadius: "var(--r-sm)", background: "var(--surface-2)", border: "1px solid var(--line)", fontSize: 16 }}>{a.icon}</span>
                  <div>
                    <div style={{ fontSize: "0.86rem", fontWeight: 600 }}>{a.n}</div>
                    <div style={{ fontSize: "0.72rem", color: "var(--ink-3)" }}>{a.s}</div>
                  </div>
                </div>
                <span className="eq" aria-hidden="true"><span /><span /><span /><span /><span /></span>
              </div>
            ))}
            <div className="row" style={{ gap: 11, background: "var(--surface-2)", border: "1px solid var(--line)", borderRadius: 14, padding: "12px 13px", marginTop: 14 }}>
              <span className="row center" style={{ width: 34, height: 34, borderRadius: "50%", background: "var(--accent)", color: "#fff", flexShrink: 0 }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
              </span>
              <div className="row" style={{ gap: 2, height: 22, flex: 1 }}>
                {[6, 12, 18, 9, 15, 20, 11, 7, 16, 13, 19, 8, 14, 10, 17, 6, 12, 18, 9, 15].map((h, i) => (
                  <span key={i} style={{ width: 2.5, borderRadius: 2, background: i < 7 ? "var(--accent)" : "var(--line-3)", height: h }} />
                ))}
              </div>
              <span className="mono" style={{ fontSize: "0.68rem", color: "var(--ink-3)" }}>2:04</span>
            </div>
          </div>
          <p style={{ textAlign: "center", marginTop: 24, fontSize: "0.9rem", color: "var(--ink-2)" }}>
            Your agents kept working. <span className="serif" style={{ color: "var(--ink)" }}>Press play to catch up.</span>
          </p>
        </div>
      </div>

      <style>{`
        @media (max-width: 900px) {
          .signin-shell { grid-template-columns: 1fr !important; }
          .signin-visual { display: none !important; }
        }
      `}</style>
    </div>
  );
}
