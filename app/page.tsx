"use client";

import { useState } from "react";

export default function Home() {
  const [topic, setTopic] = useState("");
  const [news, setNews] = useState("");
  const [loading, setLoading] = useState(false);

  const handleGenerate = async () => {
    if (!topic.trim()) return;

    setLoading(true);
    setNews("");

    try {
      const res = await fetch("/api/generate-news", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ topic }),
      });

      const data = await res.json();

      if (data.success) {
        setNews(data.news);
      } else {
        setNews("⚠️ Error generating news.");
      }
    } catch (error) {
      setNews("🚨 Server error. Is FastAPI running?");
    }

    setLoading(false);
  };

  return (
    <main className="max-w-6xl mx-auto px-6 py-20 space-y-20">

      {/* HERO SECTION */}
      <section className="text-center space-y-6">
        <div className="text-sm text-white/50">
          Personalized AI News Platform
        </div>

        <h1 className="text-5xl font-semibold tracking-tight leading-tight">
          Your intelligence.
          <br />
          Your signal.
        </h1>

        <p className="text-white/60 max-w-2xl mx-auto leading-relaxed">
          YOUR News is a fully customizable AI-powered news layer.
          Build your own news agent, define its voice and personality,
          and receive curated insights delivered across the channels you use daily.
        </p>

        <div className="flex justify-center gap-4 pt-4">
          <button className="px-6 py-3 bg-white text-black rounded-full text-sm font-medium hover:opacity-90 transition">
            Build Your Agent
          </button>

          <button className="px-6 py-3 border border-white/20 rounded-full text-sm text-white/80 hover:border-white/40 transition">
            Explore Demo →
          </button>
        </div>

        <div className="pt-6 text-xs text-white/40">
          Designed for founders, operators, and focused thinkers.
        </div>
      </section>

      {/* GENERATE NEWS SECTION */}
      <section className="space-y-6">
        <h2 className="text-center text-xl font-semibold text-white/80">
          Generate My Latest News
        </h2>

        <div className="flex flex-col sm:flex-row gap-4 max-w-lg mx-auto">
          <input
            type="text"
            placeholder="Enter a topic..."
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            className="flex-1 px-6 py-3 bg-[#151515] border border-white/10 rounded-full text-sm text-white focus:outline-none focus:border-white/30 transition"
          />

          <button
            onClick={handleGenerate}
            disabled={loading}
            className="px-6 py-3 bg-white text-black rounded-full text-sm font-medium hover:opacity-90 transition whitespace-nowrap disabled:opacity-50"
          >
            {loading ? "Generating..." : "Generate News"}
          </button>
        </div>

        {/* NEWS OUTPUT */}
        {news && (
          <div className="max-w-3xl mx-auto mt-8 p-6 bg-[#111] border border-white/10 rounded-2xl text-white/80 leading-relaxed whitespace-pre-wrap">
            {news}
          </div>
        )}
      </section>

      {/* FEATURE TABS SECTION */}
      <section className="space-y-10">

        <h2 className="text-center text-xl font-semibold text-white/80">
          Platform Modules
        </h2>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-4xl mx-auto">

          <FeatureCard
            title="Agent Studio"
            description="Customize your AI news agent — voice, personality, avatar, tone, and briefing style."
          />

          <FeatureCard
            title="Feed Engine"
            description="Select categories, control summary depth, and define your signal filters."
          />

          <FeatureCard
            title="Voice Delivery"
            description="Receive daily AI-generated voice briefings with your personalized news agent."
          />

          <FeatureCard
            title="Channels"
            description="Deliver briefings via WhatsApp, Email, and future integrations."
          />

          <FeatureCard
            title="Analytics"
            description="Track reading patterns, engagement, and content preferences."
          />

          <FeatureCard
            title="Settings"
            description="Manage account preferences, notification timing, and system controls."
          />

        </div>
      </section>

      {/* PREVIEW BLOCK */}
      <section className="bg-[#151515] border border-white/10 rounded-2xl h-80 flex items-center justify-center text-white/30">
        Live feed preview coming soon
      </section>

    </main>
  );
}

function FeatureCard({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <button className="text-left bg-[#151515] border border-white/10 rounded-2xl p-6 hover:border-white/20 hover:bg-[#1a1a1a] transition space-y-3">
      <h3 className="text-lg font-semibold">{title}</h3>
      <p className="text-sm text-white/60 leading-relaxed">
        {description}
      </p>
    </button>
  );
}
