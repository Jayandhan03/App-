"use client";

import Link from "next/link";


export default function HomeLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div style={{ minHeight: "100vh", background: "#0d0d14", color: "#fff", fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif", display: "flex", flexDirection: "column" }}>

            {/* NAVBAR */}
            <header style={{ position: "sticky", top: 0, zIndex: 50, background: "rgba(13,13,20,0.88)", backdropFilter: "blur(14px)", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
                <div style={{ maxWidth: 1180, margin: "0 auto", padding: "0 24px", height: 60, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 24 }}>

                    {/* Logo */}
                    <Link href="/" style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 15, fontWeight: 600, color: "#4db8ff", textDecoration: "none", letterSpacing: "-0.01em" }}>
                        <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#4db8ff", boxShadow: "0 0 8px #4db8ff", display: "inline-block", animation: "pulse-dot 2s ease-in-out infinite" }} />
                        Instant Audio News
                    </Link>

                    {/* Nav links */}
                    <nav style={{ display: "flex", alignItems: "center", gap: 32 }}>
                        {["Customization", "Settings", "Preferences"].map((item) => (
                            <a key={item} style={{ fontSize: 13, color: "rgba(255,255,255,0.65)", textDecoration: "none", cursor: "pointer", transition: "color 0.2s" }}
                                onMouseEnter={e => (e.currentTarget.style.color = "#fff")}
                                onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.65)")}>
                                {item}
                            </a>
                        ))}
                    </nav>

                    {/* Right actions */}
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <span style={{ color: "rgba(255,255,255,0.45)", fontSize: 18, cursor: "pointer" }}>🔍</span>
                        <Link href="/"
                            style={{ fontSize: 12, fontWeight: 600, padding: "7px 16px", borderRadius: 999, border: "1px solid rgba(77,184,255,0.3)", background: "rgba(77,184,255,0.08)", color: "#4db8ff", textDecoration: "none", whiteSpace: "nowrap", transition: "background 0.2s" }}
                            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(77,184,255,0.16)"; (e.currentTarget as HTMLElement).style.borderColor = "rgba(77,184,255,0.55)"; }}
                            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "rgba(77,184,255,0.08)"; (e.currentTarget as HTMLElement).style.borderColor = "rgba(77,184,255,0.3)"; }}
                        >
                            ← Back to Home
                        </Link>
                    </div>
                </div>
            </header>

            {/* PAGE CONTENT */}
            <main style={{ flex: 1 }}>
                {children}
            </main>

            {/* FOOTER */}
            <footer style={{ borderTop: "1px solid rgba(255,255,255,0.07)", padding: "60px 24px 0" }}>
                <div style={{ maxWidth: 1100, margin: "0 auto", display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1.5fr", gap: 40, paddingBottom: 40 }}>

                    {/* Brand */}
                    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 15, fontWeight: 600, color: "#4db8ff" }}>
                            <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#4db8ff", display: "inline-block" }} />
                            Instant Audio News
                        </div>
                        <p style={{ fontSize: 13, color: "rgba(255,255,255,0.45)", lineHeight: 1.65, margin: 0 }}>
                            AI-powered personalized news intelligence. Designed to eliminate noise and deliver structured signal.
                        </p>
                        <div style={{ display: "flex", gap: 16 }}>
                            {["Twitter", "LinkedIn", "GitHub"].map((s) => (
                                <a key={s} href="#" style={{ fontSize: 12, color: "rgba(255,255,255,0.45)", textDecoration: "none" }}>{s}</a>
                            ))}
                        </div>
                    </div>

                    {/* Product */}
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                        <h4 style={{ fontSize: 13, fontWeight: 700, color: "#fff", margin: 0 }}>Product</h4>
                        {["Agent Studio", "Feed Engine", "Voice Delivery", "Channels"].map((l) => (
                            <a key={l} href="#" style={{ fontSize: 13, color: "rgba(255,255,255,0.45)", textDecoration: "none" }}>{l}</a>
                        ))}
                    </div>

                    {/* Company */}
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                        <h4 style={{ fontSize: 13, fontWeight: 700, color: "#fff", margin: 0 }}>Company</h4>
                        {["About", "Leadership", "Careers", "Contact"].map((l) => (
                            <a key={l} href="#" style={{ fontSize: 13, color: "rgba(255,255,255,0.45)", textDecoration: "none" }}>{l}</a>
                        ))}
                    </div>

                    {/* Contact */}
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                        <h4 style={{ fontSize: 13, fontWeight: 700, color: "#fff", margin: 0 }}>Contact</h4>
                        {["support@yournews.ai", "press@yournews.ai", "+91 00000 00000"].map((l) => (
                            <span key={l} style={{ fontSize: 13, color: "rgba(255,255,255,0.45)" }}>{l}</span>
                        ))}
                    </div>
                </div>

                <div style={{ maxWidth: 1100, margin: "0 auto", padding: "20px 0", display: "flex", justifyContent: "space-between", fontSize: 12, color: "rgba(255,255,255,0.3)", borderTop: "1px solid rgba(255,255,255,0.07)", flexWrap: "wrap", gap: 8 }}>
                    <span>© {new Date().getFullYear()} Instant Audio News. All rights reserved.</span>
                    <span>
                        <a href="#" style={{ color: "rgba(255,255,255,0.4)", textDecoration: "none" }}>Privacy Policy</a>
                        {" · "}
                        <a href="#" style={{ color: "rgba(255,255,255,0.4)", textDecoration: "none" }}>Terms of Service</a>
                    </span>
                </div>
            </footer>
        </div>
    );
}
