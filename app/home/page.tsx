"use client";

import { useState, useRef } from "react";

/* ─── Design tokens ─── */
const C = {
    cyan: "#4db8ff",
    cyanDim: "rgba(77,184,255,0.08)",
    cyanBorder: "rgba(77,184,255,0.25)",
    cardBg: "rgba(255,255,255,0.025)",
    cardBorder: "rgba(255,255,255,0.08)",
    textMid: "rgba(255,255,255,0.55)",
    textFaint: "rgba(255,255,255,0.35)",
} as const;

/* ─── Shared button styles ─── */
const gradBtn: React.CSSProperties = {
    display: "inline-flex", alignItems: "center", gap: 8,
    padding: "13px 28px", borderRadius: 999,
    background: "linear-gradient(135deg, #4db8ff, #1a8cff)",
    color: "#0d0d14", fontSize: 14, fontWeight: 700,
    border: "none", cursor: "pointer", whiteSpace: "nowrap",
    boxShadow: "0 0 20px rgba(77,184,255,0.3)",
    transition: "transform 0.2s, box-shadow 0.2s",
    minWidth: 160, justifyContent: "center",
};
const ghostBtn: React.CSSProperties = {
    display: "inline-flex", alignItems: "center", gap: 6,
    padding: "13px 28px", borderRadius: 999,
    background: "rgba(255,255,255,0.05)",
    border: "1px solid rgba(255,255,255,0.14)",
    color: "rgba(255,255,255,0.8)", fontSize: 14, fontWeight: 600,
    cursor: "pointer",
};

/* ─── API response types ─── */
interface GenerateNewsRes {
    success: boolean;
    news?: string;   // bullet-point text from run_agent()
    error?: string;
}
interface SummarizeRes {
    success: boolean;
    topic?: string;
    article_count?: number;
    summary?: string;  // broadcast-script from LLM
    error?: string;
}

// Pipeline step: 0=idle 1=generating 2=summarizing 3=audio 4=done
type PipelineStep = 0 | 1 | 2 | 3 | 4;

/** Parse bullet-point / numbered list text into individual strings */
function parseBullets(text: string): string[] {
    const lines = text.split("\n");
    const out: string[] = [];
    let cur = "";
    for (const line of lines) {
        const t = line.trim();
        if (!t) continue;
        const isBullet = /^[-•*▶►]\s/.test(t) || /^\d+[.)]\s/.test(t);
        if (isBullet) {
            if (cur) out.push(cur.trim());
            cur = t.replace(/^[-•*▶►]\s*/, "").replace(/^\d+[.)]\s*/, "");
        } else {
            cur += (cur ? " " : "") + t;
        }
    }
    if (cur) out.push(cur.trim());
    return out.filter(b => b.length > 10);
}

/* ─── Spinner SVG ─── */
function Spinner() {
    return (
        <svg width="14" height="14" viewBox="0 0 14 14"
            style={{ animation: "spin 0.7s linear infinite", flexShrink: 0 }}>
            <circle cx="7" cy="7" r="5" stroke="rgba(13,13,20,0.35)"
                strokeWidth="2" fill="none" />
            <path d="M7 2 A5 5 0 0 1 12 7" stroke="#0d0d14"
                strokeWidth="2" fill="none" />
        </svg>
    );
}

/* ─── Main component ─── */
export default function HomePage() {
    const [topic, setTopic] = useState("");
    const [step, setStep] = useState<PipelineStep>(0);
    const [genRes, setGenRes] = useState<GenerateNewsRes | null>(null);
    const [sumRes, setSumRes] = useState<SummarizeRes | null>(null);
    const [audioUrl, setAudioUrl] = useState<string | null>(null);
    const [audioName, setAudioName] = useState("news_audio.mp3");
    const [audioErr, setAudioErr] = useState<string | null>(null);
    const audioRef = useRef<HTMLAudioElement>(null);

    /* ══ Pipeline ══ */
    const handleGenerate = async () => {
        if (!topic.trim()) return;
        const q = topic.trim();

        // reset state
        setStep(1); setGenRes(null); setSumRes(null);
        setAudioUrl(null); setAudioErr(null);

        // ── Step 1: Generate News (LangChain agent) ──────────────
        let gen: GenerateNewsRes;
        try {
            const r = await fetch("/api/generate-news", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ topic: q }),
            });
            gen = await r.json();
        } catch (e: any) {
            setGenRes({ success: false, error: e.message ?? "Network error" });
            setStep(0); return;
        }
        setGenRes(gen);
        if (!gen.success) { setStep(0); return; }

        // ── Step 2: Summarize News (broadcast-style LLM script) ──
        setStep(2);
        let sum: SummarizeRes;
        try {
            const r = await fetch("/api/summarize-news", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ topic: q, limit: 5 }),
            });
            sum = await r.json();
        } catch (e: any) {
            sum = { success: false, error: e.message ?? "Summarize failed" };
        }
        setSumRes(sum);

        // ── Step 3: Generate Audio (Google TTS / gTTS via FastAPI) ────────
        setStep(3);
        try {
            const r = await fetch("/api/news-audio", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                // gTTS: voice_id = BCP-47 language code, model_id ignored
                body: JSON.stringify({ topic: q, limit: 5, voice_id: "en", model_id: "" }),
            });
            if (r.ok) {
                const blob = await r.blob();
                const url = URL.createObjectURL(blob);
                const disp = r.headers.get("Content-Disposition") ?? "";
                const match = disp.match(/filename="?([^"]+)"?/);
                // Backend streams MP3 (Google TTS / gTTS)
                setAudioUrl(url);
                setAudioName(match ? match[1] : `${q.replace(/\s+/g, "_")}_news.mp3`);

                const articleCountHeader = r.headers.get("X-Article-Count");
                if (articleCountHeader) {
                    const newArticleCount = parseInt(articleCountHeader, 10);
                    setSumRes(prev =>
                        prev ? { ...prev, article_count: newArticleCount } : { success: true, article_count: newArticleCount }
                    );
                }
            } else {
                const err = await r.json().catch(() => ({ error: "Audio failed" }));
                setAudioErr(err.error ?? "Audio generation failed.");
            }
        } catch (e: any) {
            setAudioErr("Could not reach audio service.");
        }

        setStep(4);
    };

    const handleDownload = () => {
        if (!audioUrl) return;
        Object.assign(document.createElement("a"),
            { href: audioUrl, download: audioName }).click();
    };

    /* ─── derived display values ─── */
    const isLoading = step > 0 && step < 4;
    const bullets = genRes?.news ? parseBullets(genRes.news) : [];
    const rawGenText = genRes?.news ?? "";

    const progressWidth =
        step === 1 ? "28%" : step === 2 ? "57%" : step === 3 ? "82%" : "100%";
    const progressLabel =
        step === 1 ? "Running news agent…"
            : step === 2 ? "Summarizing articles…"
                : step === 3 ? "Generating audio briefing…"
                    : "Done";

    /* ─── Render ─── */
    return (
        <div style={{
            maxWidth: 1100, margin: "0 auto", padding: "70px 24px 80px",
            display: "flex", flexDirection: "column", gap: 72
        }}>

            {/* ★ HERO */}
            <section style={{
                textAlign: "center", display: "flex", flexDirection: "column",
                alignItems: "center", gap: 20
            }}>

                <div style={{
                    display: "inline-flex", alignItems: "center", gap: 8,
                    fontSize: 12, fontWeight: 500, color: C.cyan, background: C.cyanDim,
                    border: `1px solid ${C.cyanBorder}`, borderRadius: 999, padding: "5px 14px"
                }}>
                    <span style={{
                        width: 6, height: 6, borderRadius: "50%",
                        background: C.cyan, display: "inline-block"
                    }} />
                    Personalized AI News Platform
                </div>

                <h1 style={{
                    fontSize: "clamp(36px,6vw,60px)", fontWeight: 800,
                    lineHeight: 1.1, letterSpacing: "-0.03em", margin: 0
                }}>
                    Your intelligence.<br />
                    <span style={{ color: C.cyan }}>Your signal.</span>
                </h1>

                <p style={{
                    fontSize: 16, lineHeight: 1.65, color: C.textMid,
                    maxWidth: 540, margin: 0
                }}>
                    YOUR News is a fully customizable AI-powered news layer. Build your own
                    news agent, define its voice and personality, and receive curated insights
                    across the channels you use daily.
                </p>

                <div style={{ display: "flex", gap: 14, flexWrap: "wrap", justifyContent: "center" }}>
                    <button style={gradBtn}>Customize Your Agent</button>
                    <button style={ghostBtn}>Explore Demo →</button>
                </div>

                <p style={{ fontSize: 12, color: C.textFaint, margin: 0 }}>
                    Designed for founders, operators, and focused thinkers.
                </p>
            </section>

            {/* ★ GENERATE CARD */}
            <section style={{ display: "flex", flexDirection: "column", gap: 28, alignItems: "center" }}>
                <div style={{
                    width: "100%", maxWidth: 740, background: C.cardBg,
                    border: "1px solid rgba(77,184,255,0.18)", borderRadius: 24,
                    padding: "36px 32px", display: "flex", flexDirection: "column", gap: 20,
                    boxShadow: "0 0 60px rgba(77,184,255,0.06)"
                }}>

                    {/* Header */}
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <span style={{ fontSize: 20 }}>⚡</span>
                        <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>
                            Generate My Latest News
                        </h2>
                    </div>

                    {/* Input + button */}
                    <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                        <input
                            type="text"
                            placeholder="Enter a topic (e.g. AI, Climate, Crypto)…"
                            value={topic}
                            onChange={e => setTopic(e.target.value)}
                            onKeyDown={e => e.key === "Enter" && !isLoading && handleGenerate()}
                            disabled={isLoading}
                            style={{
                                flex: 1, minWidth: 200, padding: "13px 20px",
                                background: "rgba(255,255,255,0.05)",
                                border: "1px solid rgba(255,255,255,0.1)", borderRadius: 999,
                                fontSize: 14, color: "#fff", outline: "none"
                            }}
                            onFocus={e => {
                                e.currentTarget.style.borderColor = "rgba(77,184,255,0.5)";
                                e.currentTarget.style.background = "rgba(77,184,255,0.05)";
                            }}
                            onBlur={e => {
                                e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)";
                                e.currentTarget.style.background = "rgba(255,255,255,0.05)";
                            }}
                        />
                        <button onClick={handleGenerate}
                            disabled={isLoading || !topic.trim()}
                            style={{
                                ...gradBtn,
                                opacity: isLoading || !topic.trim() ? 0.6 : 1,
                                cursor: isLoading || !topic.trim() ? "not-allowed" : "pointer"
                            }}>
                            {isLoading ? <><Spinner />{step === 1 ? "Generating…" : step === 2 ? "Summarizing…" : "Audio…"}</> : "Generate News"}
                        </button>
                    </div>

                    {/* Three-step progress bar */}
                    {(isLoading || step === 4) && (
                        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                            {/* Step pills */}
                            <div style={{ display: "flex", gap: 6 }}>
                                {[
                                    { n: 1, label: "Generate" },
                                    { n: 2, label: "Summarize" },
                                    { n: 3, label: "Audio" },
                                ].map(({ n, label }) => {
                                    const done = step > n;
                                    const active = step === n;
                                    return (
                                        <div key={n} style={{
                                            display: "flex", alignItems: "center",
                                            gap: 5, padding: "4px 12px", borderRadius: 999, fontSize: 11,
                                            fontWeight: 600,
                                            background: done ? "rgba(77,184,255,0.18)" : active ? "rgba(77,184,255,0.1)" : "rgba(255,255,255,0.04)",
                                            border: done ? "1px solid rgba(77,184,255,0.4)" : active ? "1px solid rgba(77,184,255,0.25)" : "1px solid rgba(255,255,255,0.08)",
                                            color: done || active ? C.cyan : C.textFaint,
                                            transition: "all 0.3s"
                                        }}>
                                            {done ? "✓" : active ? <Spinner /> : n} {label}
                                        </div>
                                    );
                                })}
                            </div>
                            {/* Bar */}
                            <div style={{
                                height: 3, borderRadius: 3,
                                background: "rgba(255,255,255,0.06)", overflow: "hidden"
                            }}>
                                <div style={{
                                    height: "100%", borderRadius: 3,
                                    background: "linear-gradient(90deg, #4db8ff, #1a8cff)",
                                    width: progressWidth, transition: "width 0.7s ease",
                                    boxShadow: "0 0 8px rgba(77,184,255,0.6)"
                                }} />
                            </div>
                            <span style={{ fontSize: 12, color: "rgba(255,255,255,0.38)" }}>
                                {progressLabel}
                            </span>
                        </div>
                    )}

                    {/* Generate error */}
                    {genRes && !genRes.success && (
                        <div style={{
                            background: "rgba(255,80,80,0.07)",
                            border: "1px solid rgba(255,80,80,0.2)", borderRadius: 14,
                            padding: "15px 20px"
                        }}>
                            <div style={{ fontSize: 13, fontWeight: 600, color: "#ff6b6b", marginBottom: 4 }}>
                                ⚠ Generation failed
                            </div>
                            <div style={{ fontSize: 13, color: "rgba(255,255,255,0.5)" }}>
                                {genRes.error}
                            </div>
                        </div>
                    )}
                </div>

                {/* ★ RESULTS — shown once we have data ─────────────────────── */}
                {(genRes?.success || sumRes?.success) && (
                    <div style={{
                        width: "100%", maxWidth: 860,
                        display: "flex", flexDirection: "column", gap: 28
                    }}>

                        {/* ── Meta row ── */}
                        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                            <div style={{
                                display: "inline-flex", alignItems: "center", gap: 6,
                                padding: "5px 14px", borderRadius: 999, background: C.cyanDim,
                                border: `1px solid ${C.cyanBorder}`, fontSize: 12, fontWeight: 600,
                                color: C.cyan
                            }}>
                                🗞 {sumRes?.topic ?? topic}
                            </div>
                            {(sumRes?.article_count ?? 0) > 0 && (
                                <span style={{ fontSize: 12, color: C.textFaint }}>
                                    {sumRes!.article_count} articles analysed
                                </span>
                            )}
                            <span style={{ fontSize: 12, color: C.textFaint, marginLeft: "auto" }}>
                                {new Date().toLocaleDateString("en-US",
                                    { weekday: "short", year: "numeric", month: "short", day: "numeric" })}
                            </span>
                        </div>

                        {/* ── Generate-News results (bullet cards) ── */}
                        {genRes?.success && rawGenText && (
                            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                                {/* Section header */}
                                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                    <div style={{
                                        width: 3, height: 18, borderRadius: 2,
                                        background: "linear-gradient(#4db8ff, #1a8cff)"
                                    }} />
                                    <span style={{
                                        fontSize: 13, fontWeight: 700, color: "#fff",
                                        letterSpacing: "0.02em"
                                    }}>
                                        📰 Agent News Feed
                                    </span>
                                    <span style={{ fontSize: 11, color: C.textFaint, marginLeft: 4 }}>
                                        via LangChain + Tavily + Grok
                                    </span>
                                </div>

                                {bullets.length > 1 ? (
                                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                                        {bullets.map((item, i) => (
                                            <div key={i}
                                                style={{
                                                    display: "flex", gap: 14, background: C.cardBg,
                                                    border: `1px solid ${C.cardBorder}`, borderRadius: 14,
                                                    padding: "16px 20px", alignItems: "flex-start",
                                                    transition: "border-color 0.2s"
                                                }}
                                                onMouseEnter={e =>
                                                    (e.currentTarget.style.borderColor = "rgba(77,184,255,0.28)")}
                                                onMouseLeave={e =>
                                                    (e.currentTarget.style.borderColor = C.cardBorder)}>
                                                <div style={{
                                                    flexShrink: 0, width: 22, height: 22,
                                                    borderRadius: "50%",
                                                    background: "rgba(77,184,255,0.14)",
                                                    border: "1px solid rgba(77,184,255,0.3)",
                                                    display: "flex", alignItems: "center", justifyContent: "center",
                                                    fontSize: 11, fontWeight: 700, color: C.cyan, marginTop: 1
                                                }}>
                                                    {i + 1}
                                                </div>
                                                <p style={{
                                                    margin: 0, fontSize: 14, lineHeight: 1.7,
                                                    color: "rgba(255,255,255,0.78)"
                                                }}>{item}</p>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div style={{
                                        background: C.cardBg, border: `1px solid ${C.cardBorder}`,
                                        borderRadius: 14, padding: "22px 26px",
                                        fontSize: 14, lineHeight: 1.8, color: "rgba(255,255,255,0.75)",
                                        whiteSpace: "pre-wrap"
                                    }}>
                                        {rawGenText}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* ── Summarize-News results (broadcast script) ── */}
                        {sumRes !== null && (
                            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                                {/* Divider */}
                                <div style={{
                                    height: 1, background: "rgba(255,255,255,0.06)",
                                    borderRadius: 1
                                }} />

                                {/* Section header */}
                                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                    <div style={{
                                        width: 3, height: 18, borderRadius: 2,
                                        background: "linear-gradient(#f0a500, #ff7b2e)"
                                    }} />
                                    <span style={{
                                        fontSize: 13, fontWeight: 700, color: "#fff",
                                        letterSpacing: "0.02em"
                                    }}>
                                        🎙 IndustryEar Summary
                                    </span>
                                    <span style={{ fontSize: 11, color: C.textFaint, marginLeft: 4 }}>
                                        broadcast-style · ready for audio
                                    </span>
                                </div>

                                {sumRes.success && sumRes.summary ? (
                                    <div style={{
                                        position: "relative", background: "rgba(240,165,0,0.04)",
                                        border: "1px solid rgba(240,165,0,0.18)", borderRadius: 16,
                                        padding: "26px 28px"
                                    }}>
                                        {/* Decorative mic icon top-right */}
                                        <span style={{
                                            position: "absolute", top: 16, right: 20,
                                            fontSize: 22, opacity: 0.15
                                        }}>🎙</span>
                                        <p style={{
                                            margin: 0, fontSize: 14.5, lineHeight: 1.85,
                                            color: "rgba(255,255,255,0.82)",
                                            fontStyle: "normal", letterSpacing: "0.01em"
                                        }}>
                                            {sumRes.summary}
                                        </p>
                                    </div>
                                ) : (
                                    <div style={{
                                        background: "rgba(255,170,0,0.06)",
                                        border: "1px solid rgba(255,170,0,0.2)", borderRadius: 12,
                                        padding: "14px 18px", fontSize: 13, color: "rgba(255,200,100,0.8)"
                                    }}>
                                        ⚠ Summarize step failed: {sumRes.error ?? "Unknown error"}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* ── Audio error ── */}
                        {audioErr && (
                            <div style={{
                                background: "rgba(255,170,0,0.06)",
                                border: "1px solid rgba(255,170,0,0.18)", borderRadius: 12,
                                padding: "12px 18px", fontSize: 13, color: "rgba(255,200,100,0.8)"
                            }}>
                                🔇 Audio unavailable — {audioErr}
                            </div>
                        )}

                        {/* ── Audio player ── */}
                        {audioUrl && (
                            <div style={{
                                display: "flex", alignItems: "center", gap: 12,
                                flexWrap: "wrap", background: C.cardBg,
                                border: "1px solid rgba(77,184,255,0.15)", borderRadius: 16,
                                padding: "16px 22px"
                            }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 8, flex: "0 0 auto" }}>
                                    <span style={{ fontSize: 20 }}>🎙️</span>
                                    <span style={{ fontSize: 13, fontWeight: 600, color: C.cyan }}>
                                        Audio Briefing
                                    </span>
                                </div>
                                <audio ref={audioRef} src={audioUrl} controls
                                    style={{ flex: 1, minWidth: 200, accentColor: "#4db8ff" }} />
                                <button onClick={handleDownload}
                                    style={{
                                        display: "inline-flex", alignItems: "center", gap: 6,
                                        padding: "9px 18px", borderRadius: 999,
                                        border: "1px solid rgba(77,184,255,0.3)",
                                        background: "rgba(77,184,255,0.08)", color: C.cyan,
                                        fontSize: 13, fontWeight: 600, cursor: "pointer",
                                        whiteSpace: "nowrap"
                                    }}>
                                    ⬇ MP3
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </section>

            {/* ★ PLATFORM MODULES */}
            <section style={{ display: "flex", flexDirection: "column", gap: 24 }}>
                <div style={{
                    fontSize: 13, fontWeight: 700, letterSpacing: "0.08em",
                    textTransform: "uppercase", color: C.textFaint, textAlign: "center"
                }}>
                    Platform Modules
                </div>
                <div style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 16
                }}>
                    {[
                        { icon: "🎛️", title: "Agent Studio", desc: "Customize your AI news agent — voice, personality, avatar, tone, and briefing style." },
                        { icon: "📡", title: "Feed Engine", desc: "Select categories, control summary depth, and define your signal filters." },
                        { icon: "🎙️", title: "Voice Delivery", desc: "Receive daily AI-generated voice briefings with your personalized news agent." },
                        { icon: "💬", title: "Channels", desc: "Deliver briefings via WhatsApp, Email, and future integrations." },
                        { icon: "📊", title: "Analytics", desc: "Track reading patterns, engagement, and content preferences." },
                        { icon: "⚙️", title: "Settings", desc: "Manage account preferences, notification timing, and system controls." },
                    ].map(({ icon, title, desc }) => (
                        <button key={title}
                            style={{
                                textAlign: "left", background: C.cardBg,
                                border: `1px solid ${C.cardBorder}`, borderRadius: 18,
                                padding: "24px 22px", cursor: "pointer",
                                display: "flex", flexDirection: "column", gap: 8,
                                transition: "border-color 0.2s, transform 0.2s, background 0.2s"
                            }}
                            onMouseEnter={e => {
                                const el = e.currentTarget as HTMLElement;
                                el.style.borderColor = "rgba(77,184,255,0.35)";
                                el.style.transform = "translateY(-3px)";
                                el.style.background = "rgba(77,184,255,0.04)";
                            }}
                            onMouseLeave={e => {
                                const el = e.currentTarget as HTMLElement;
                                el.style.borderColor = C.cardBorder;
                                el.style.transform = "translateY(0)";
                                el.style.background = C.cardBg;
                            }}>
                            <span style={{ fontSize: 22 }}>{icon}</span>
                            <h3 style={{ fontSize: 15, fontWeight: 700, margin: 0, color: "#fff" }}>
                                {title}
                            </h3>
                            <p style={{
                                fontSize: 13, lineHeight: 1.6,
                                color: "rgba(255,255,255,0.48)", margin: 0
                            }}>{desc}</p>
                        </button>
                    ))}
                </div>
            </section>

            {/* ★ PREVIEW PLACEHOLDER */}
            <section style={{
                background: "rgba(255,255,255,0.02)",
                border: "1px dashed rgba(77,184,255,0.15)", borderRadius: 20, height: 220,
                display: "flex", flexDirection: "column", alignItems: "center",
                justifyContent: "center", gap: 12
            }}>
                <span style={{ fontSize: 32, opacity: 0.18 }}>📡</span>
                <span style={{
                    fontSize: 14, color: "rgba(255,255,255,0.2)",
                    letterSpacing: "0.02em"
                }}>Live feed preview coming soon</span>
            </section>

            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
    );
}
