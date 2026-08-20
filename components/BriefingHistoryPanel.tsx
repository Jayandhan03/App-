"use client";

import { useCallback, useEffect, useState } from "react";
import BriefingRow, { BriefingListItem } from "@/components/BriefingRow";
import { I } from "@/components/icons";

const PAGE = 10;

export default function BriefingHistoryPanel({ agentId, accent }: { agentId: string; accent: string }) {
  const [briefings, setBriefings] = useState<BriefingListItem[] | null>(null);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(false);
  const [playingId, setPlayingId] = useState<string | null>(null);

  const load = useCallback(async (skip: number) => {
    try {
      const r = await fetch(`/api/agents/${agentId}/briefings?limit=${PAGE}&skip=${skip}`);
      const d = await r.json();
      if (!d.success) { setError(true); return; }
      setTotal(d.total ?? d.briefings.length);
      setHasMore(!!d.hasMore);
      setBriefings((prev) => (skip === 0 || prev === null ? d.briefings : [...prev, ...d.briefings]));
    } catch {
      setError(true);
    }
  }, [agentId]);

  // Mounts only when the row is expanded, so this doubles as "fetch on first expand" —
  // no separate lazy-load flag needed.
  useEffect(() => {
    let cancelled = false;
    fetch(`/api/agents/${agentId}/briefings?limit=${PAGE}&skip=0`)
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        if (d.success) {
          setBriefings(d.briefings);
          setTotal(d.total ?? d.briefings.length);
          setHasMore(!!d.hasMore);
        } else setError(true);
      })
      .catch(() => { if (!cancelled) setError(true); });
    return () => { cancelled = true; };
  }, [agentId]);

  const loadMore = () => {
    if (loadingMore || !briefings) return;
    setLoadingMore(true);
    load(briefings.length).finally(() => setLoadingMore(false));
  };

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
        <>
          <div className="row between" style={{ marginBottom: 10 }}>
            <span style={{ fontSize: "0.72rem", fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase", color: "var(--ink-4)" }}>
              Briefing history
            </span>
            <span style={{ fontSize: "0.72rem", color: "var(--ink-4)" }}>
              Showing {briefings.length} of {total}
            </span>
          </div>

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

            {hasMore && (
              <button
                className="btn btn-secondary btn-sm"
                style={{ alignSelf: "center", marginTop: 2 }}
                onClick={loadMore}
                disabled={loadingMore}
              >
                {loadingMore ? <><span className="spinner" style={{ width: 13, height: 13 }} /> Loading…</> : "Load older"}
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
