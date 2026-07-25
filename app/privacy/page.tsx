import Link from "next/link";
import Logo from "@/components/Logo";
import ThemeToggle from "@/components/ThemeToggle";

export const metadata = {
  title: "Privacy Policy — Leora",
};

const LAST_UPDATED = "July 25, 2026";
const CONTACT_EMAIL = "jayandhan2003@gmail.com";

export default function PrivacyPolicy() {
  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)" }}>
      <div className="row between" style={{ height: 64, padding: "0 24px", borderBottom: "1px solid var(--line)" }}>
        <Link href="/" className="row" style={{ gap: 10 }}>
          <Logo /><span style={{ fontWeight: 600, letterSpacing: "-0.02em" }}>Leora</span>
        </Link>
        <ThemeToggle />
      </div>

      <div className="container" style={{ maxWidth: 720, padding: "56px 24px 80px" }}>
        <h1 className="t-h2" style={{ marginBottom: 8 }}>Privacy Policy</h1>
        <p className="t-2" style={{ fontSize: "0.85rem", marginBottom: 40 }}>Last updated: {LAST_UPDATED}</p>

        <div style={{ display: "flex", flexDirection: "column", gap: 28, fontSize: "0.95rem", lineHeight: 1.7 }}>
          <section>
            <h2 className="t-h3" style={{ marginBottom: 10 }}>Overview</h2>
            <p className="t-2">
              Leora ("we", "us") runs AI agents that monitor topics you choose and send you voice-note
              briefings by app, Telegram, or WhatsApp. This page explains what information we collect,
              why we collect it, and the choices you have.
            </p>
          </section>

          <section>
            <h2 className="t-h3" style={{ marginBottom: 10 }}>Information We Collect</h2>
            <p className="t-2" style={{ marginBottom: 10 }}>We collect only what's needed to run your agents and deliver briefings:</p>
            <ul className="t-2" style={{ paddingLeft: 20, display: "flex", flexDirection: "column", gap: 8 }}>
              <li><strong>Account information</strong> — when you sign in with Google, we receive your name, email address, and profile picture.</li>
              <li><strong>Messaging identifiers</strong> — if you link WhatsApp or Telegram, we store the phone number, chat ID, and (for Telegram) username needed to send you messages there.</li>
              <li><strong>Agent and topic data</strong> — the topics, keywords, regions, and preferences you configure for your agents, so we know what to monitor and how to summarize it.</li>
              <li><strong>Generated content</strong> — the voice briefings we generate for you, stored so they can be delivered and replayed.</li>
              <li><strong>Usage data</strong> — basic timestamps (last login, last briefing sent) used to run scheduling and troubleshoot delivery issues.</li>
            </ul>
          </section>

          <section>
            <h2 className="t-h3" style={{ marginBottom: 10 }}>How We Use Your Information</h2>
            <p className="t-2">
              We use your information to operate your agents: monitoring the topics you've configured,
              generating voice briefings from that content, and delivering them through the channel(s) you've
              connected. We do not sell your data, and we do not post on your behalf.
            </p>
          </section>

          <section>
            <h2 className="t-h3" style={{ marginBottom: 10 }}>Third-Party Services</h2>
            <p className="t-2" style={{ marginBottom: 10 }}>
              Running Leora requires sharing limited data with a small number of service providers, solely
              to provide the features you use:
            </p>
            <ul className="t-2" style={{ paddingLeft: 20, display: "flex", flexDirection: "column", gap: 8 }}>
              <li><strong>Google</strong> — for account sign-in.</li>
              <li><strong>ElevenLabs</strong> — to synthesize your briefings into voice audio.</li>
              <li><strong>Kapso / WhatsApp Business Platform</strong> — to deliver briefings and buttons over WhatsApp, if you've linked it.</li>
              <li><strong>Telegram</strong> — to deliver briefings over Telegram, if you've linked it.</li>
            </ul>
            <p className="t-2" style={{ marginTop: 10 }}>
              Each of these providers only receives the minimum data needed to perform their function (e.g.
              WhatsApp only receives your phone number and message content, not your full account profile).
            </p>
          </section>

          <section>
            <h2 className="t-h3" style={{ marginBottom: 10 }}>Data Storage &amp; Security</h2>
            <p className="t-2">
              Your data is stored in our database and backend infrastructure, encrypted in transit (HTTPS/TLS)
              and access-controlled at rest. Only the systems required to run your agents and deliver
              briefings can access it.
            </p>
          </section>

          <section>
            <h2 className="t-h3" style={{ marginBottom: 10 }}>Your Rights</h2>
            <p className="t-2">
              You can delete your agents and associated data at any time from within the app. If you'd like
              your account and all associated data fully removed, contact us at{" "}
              <a href={`mailto:${CONTACT_EMAIL}`} style={{ color: "var(--accent)" }}>{CONTACT_EMAIL}</a> and
              we'll process the request.
            </p>
          </section>

          <section>
            <h2 className="t-h3" style={{ marginBottom: 10 }}>Children's Privacy</h2>
            <p className="t-2">
              Leora is not directed at children under 13, and we do not knowingly collect information from
              them.
            </p>
          </section>

          <section>
            <h2 className="t-h3" style={{ marginBottom: 10 }}>Changes to This Policy</h2>
            <p className="t-2">
              If we make material changes to this policy, we'll update the "Last updated" date above.
              Continued use of Leora after a change means you accept the updated policy.
            </p>
          </section>

          <section>
            <h2 className="t-h3" style={{ marginBottom: 10 }}>Contact</h2>
            <p className="t-2">
              Questions about this policy or your data? Reach us at{" "}
              <a href={`mailto:${CONTACT_EMAIL}`} style={{ color: "var(--accent)" }}>{CONTACT_EMAIL}</a>.
            </p>
          </section>
        </div>

        <div style={{ marginTop: 48 }}>
          <Link href="/" className="nav-link" style={{ fontSize: "0.85rem" }}>← Back to home</Link>
        </div>
      </div>
    </div>
  );
}
