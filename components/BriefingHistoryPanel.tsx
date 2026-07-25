"use client";

import { useEffect, useState } from "react";
import BriefingRow, { BriefingListItem } from "@/components/BriefingRow";
import { I } from "@/components/icons";

export default function BriefingHistoryPanel({ agentId, accent }: { agentId: string; accent: string }) {
  const [briefings, setBriefings] = useState<BriefingListItem[] | null>(null);
  const [error, setError] = useState(false);
  const [playingId, setPlayingId] = useState<string | null>(null);

  // Mounts only when the row is expanded, so this doubles as "fetch on first expand" —
  // no separate lazy-load flag needed.
  useEffect(() => {
    let cancelled = false;
    fetch(`/api/agents/${agentId}/briefings`)
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        if (d.success) setBriefings(d.briefings);
        else setError(true);
      })
      .catch(() => { if (!cancelled) setError(true); });
    return () => { cancelled = true; };
  }, [agentId]);

  return (
    <div className="briefing-history">
      {briefings === null && !error && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div className="skeleton" style={{ height: 52, borderRadius: "var(--r-sm)" }} />
          <div className="skeleton" style={{ height: 52, borderRadius: "var(--r-sm)" }} />
        </div>
      )}

      {error && (
        <div style={{ textAlign: "center", padding: "18px 0", fontSize: "0.82rem", color: "var(--ink-3)" }}>
          Couldn&apos;t load briefing history — try again in a moment.
        </div>
      )}

      {briefings?.length === 0 && (
        <div style={{ textAlign: "center", padding: "22px 0", color: "var(--ink-3)" }}>
          <div className="row center" style={{ width: 36, height: 36, borderRadius: "50%", background: "var(--surface-2)", margin: "0 auto 10px" }}>{I.mic()}</div>
          <div style={{ fontSize: "0.85rem" }}>No briefings yet — this agent hasn&apos;t run.</div>
        </div>
      )}

      {briefings && briefings.length > 0 && (
        <div className="briefing-list">
          {briefings.map((b) => (
            <BriefingRow
              key={b.id}
              briefing={b}
              accent={accent}
              isPlaying={playingId === b.id}
              onToggle={() => setPlayingId(playingId === b.id ? null : b.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
