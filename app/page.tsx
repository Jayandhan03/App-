"use client";

import Link from "next/link";
import { useState, useEffect } from "react";

// Animated waveform bars for the hero audio visual
function Waveform() {
  return (
    <div className="flex items-center justify-center gap-[3px] h-16">
      {Array.from({ length: 60 }).map((_, i) => (
        <div
          key={i}
          className="waveform-bar"
          style={{
            animationDelay: `${(i * 0.05) % 1.5}s`,
            height: `${Math.floor(Math.random() * 48 + 8)}px`,
          }}
        />
      ))}
    </div>
  );
}

export default function LandingPage() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <div className="landing-root">
      {/* ── NAVBAR ── */}
      <header className="landing-nav">
        <div className="landing-nav-inner">
          <div className="landing-logo">
            <span className="logo-dot" />
            Instant Audio News
          </div>

          <nav className="landing-nav-links">
            <a href="#features">Features</a>
            <a href="#how-it-works">How it works</a>
            <a href="#pricing">Pricing</a>
          </nav>

          <div className="landing-nav-actions">
            <a href="#" className="nav-login">Log In</a>
            <Link href="/home" className="nav-cta">
              Open App →
            </Link>
          </div>
        </div>
      </header>

      {/* ── HERO ── */}
      <section className="hero-section">
        <div className="hero-badge">
          <span className="badge-dot" />
          With AI-based Automation
        </div>

        <h1 className="hero-title">
          Your Daily News,<br />
          <span className="hero-highlight">Delivered as Audio.</span>
        </h1>

        <p className="hero-sub">
          Get personalized news briefings sent directly to you — WhatsApp or Telegram.
          Listen while you commute, workout, or start your morning.
        </p>

        <div className="hero-actions">
          <Link href="/home" className="btn-primary">
            Get Started Now →
          </Link>
          <a href="#how-it-works" className="btn-secondary">
            View Sample
          </a>
        </div>

        {/* Waveform player card */}
        <div className="hero-player">
          <div className="player-glow" />
          {mounted && <Waveform />}
          <div className="play-btn-wrap">
            <button className="play-btn" aria-label="Play demo">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
                <path d="M8 5v14l11-7z" />
              </svg>
            </button>
          </div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section id="features" className="features-section">
        <div className="features-grid">
          <FeaturePill
            icon="🎛️"
            title="Deep Customization"
            desc="Select your favorite topics, trusted sources and use AI to tailor a news feed that suits your morning vibes."
          />
          <FeaturePill
            icon="⚡"
            title="Instant Updates"
            desc="No delays, no news breaks, our AI processes and generates your audio briefing in real-time, delivered instantly."
          />
          <FeaturePill
            icon="💬"
            title="Native Chat Experience"
            desc="No new apps to download. Works natively in your WhatsApp or Telegram with interactive voice chat controls."
          />
        </div>
      </section>

      {/* ── BRIEFING FEATURE ── */}
      <section id="how-it-works" className="briefing-section">
        <div className="briefing-text">
          <h2 className="briefing-title">
            The briefing you'll<br />
            <span className="hero-highlight">actually look forward to.</span>
          </h2>
          <p className="briefing-desc">
            Seamlessly integrated into your chat threads. Our AI sends you a clean, high-quality audio file
            every morning or whenever you request an update.
          </p>
          <ul className="briefing-list">
            <li>✅ High fidelity neural text-to-speech</li>
            <li>✅ Supports 20+ global languages</li>
            <li>✅ Variable playback speeds</li>
          </ul>
        </div>

        <div className="briefing-mock">
          <div className="mock-card">
            <div className="mock-header">
              <div className="mock-avatar" />
              <div>
                <div className="mock-name">Instant Audio News</div>
                <div className="mock-status">Online</div>
              </div>
            </div>
            <div className="mock-body">
              <div className="mock-bubble">
                <div className="mock-bubble-title">Good morning! Here is your custom briefing for Sunday 26 October 2024</div>
              </div>
              <div className="mock-audio-pill">
                <div className="pill-play">▶</div>
                <div className="pill-wave">
                  {Array.from({ length: 20 }).map((_, i) => (
                    <div key={i} className="pill-bar" style={{ height: `${Math.floor(Math.random() * 16 + 4)}px` }} />
                  ))}
                </div>
                <div className="pill-time">0:45 / 2:34</div>
              </div>
              <div className="mock-input-row">
                <div className="mock-input">Type your message...</div>
                <div className="mock-mic">🎤</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section id="pricing" className="cta-section">
        <div className="cta-card">
          <h2 className="cta-title">Start Listening Today.</h2>
          <p className="cta-sub">
            Stop scrolling and start listening. Join 50,000+ daily professionals who stay
            informed through our audio-first platform.
          </p>
          <div className="cta-actions">
            <Link href="/home" className="btn-primary">
              Get Started Free
            </Link>
            <a href="#" className="btn-outline">Join the Waitlist</a>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="landing-footer">
        <div className="footer-inner">
          <div className="footer-brand">
            <div className="landing-logo">
              <span className="logo-dot" />
              Instant Audio News
            </div>
            <p>Transforming the way we consume information through cutting-edge AI audio generation and real-time personalization.</p>
            <div className="footer-social">
              <a href="#">Twitter/X</a>
              <a href="#">LinkedIn</a>
              <a href="#">Instagram</a>
            </div>
          </div>

          <div className="footer-col">
            <h4>Product</h4>
            <a href="#features">Features</a>
            <a href="#how-it-works">Voice Link</a>
            <a href="#">Integrations</a>
          </div>

          <div className="footer-col">
            <h4>Company</h4>
            <a href="#">About Us</a>
            <a href="#">Our Blog</a>
            <a href="#">Careers</a>
          </div>

          <div className="footer-col">
            <h4>Subscribe to updates</h4>
            <div className="footer-subscribe">
              <input type="email" placeholder="Email address" />
              <button>→</button>
            </div>
          </div>
        </div>

        <div className="footer-bottom">
          <span>© {new Date().getFullYear()} Instant Audio News. All rights reserved.</span>
          <span><a href="#">Privacy Policy</a> · <a href="#">Terms of Service</a></span>
        </div>
      </footer>
    </div>
  );
}

function FeaturePill({ icon, title, desc }: { icon: string; title: string; desc: string }) {
  return (
    <div className="feature-pill">
      <div className="feature-icon">{icon}</div>
      <h3 className="feature-title">{title}</h3>
      <p className="feature-desc">{desc}</p>
    </div>
  );
}
