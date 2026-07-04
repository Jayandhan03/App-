"use client";

import type { SavedTopicShape } from "@/app/api/saved-topics/route";

export type { SavedTopicShape };

/**
 * Lets a user reuse or forget a previously locked-in research topic instead of
 * losing it when they switch to something new. Shared by the create-agent
 * chat flow (swap the topic before deploying) and the dashboard Configure
 * modal (swap an existing agent's role).
 */
export default function SavedTopicPicker({
  topics,
  loading,
  onSelect,
  onDelete,
  onStartNew,
  onClose,
}: {
  topics: SavedTopicShape[];
  loading?: boolean;
  onSelect: (t: SavedTopicShape) => void;
  onDelete: (id: string) => void;
  onStartNew?: () => void;
  onClose: () => void;
}) {
  return (
    <div className="card" style={{ padding: 16, background: "var(--surface-2)", boxShadow: "none" }}>
      <div className="row between" style={{ marginBottom: 10 }}>
        <div className="eyebrow no-rule" style={{ fontSize: "0.68rem" }}>Your saved topics</div>
        <button type="button" onClick={onClose} className="btn btn-ghost btn-sm">Cancel</button>
      </div>

      {loading ? (
        <div className="skeleton" style={{ height: 60 }} />
      ) : topics.length === 0 ? (
        <p className="t-muted" style={{ fontSize: "0.82rem" }}>No saved topics yet — lock one in via the chat first.</p>
      ) : (
        <div className="col" style={{ gap: 8, maxHeight: 260, overflowY: "auto" }}>
          {topics.map(t => (
            <div key={t.id} className="row between" style={{ padding: "10px 12px", borderRadius: "var(--r-md)", border: "1px solid var(--line)", background: "var(--surface)", gap: 10 }}>
              <button
                type="button"
                onClick={() => onSelect(t)}
                style={{ flex: 1, minWidth: 0, textAlign: "left", background: "none", border: "none", cursor: "pointer", padding: 0 }}
              >
                <div style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.topic}</div>
                <div style={{ fontSize: "0.76rem", color: "var(--ink-3)", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>{t.summary}</div>
              </button>
              <button type="button" onClick={() => onDelete(t.id)} className="icon-btn danger" title="Forget this topic" style={{ flexShrink: 0 }}>✕</button>
            </div>
          ))}
        </div>
      )}

      {onStartNew && (
        <button type="button" onClick={onStartNew} className="btn btn-secondary btn-sm" style={{ width: "100%", marginTop: 12 }}>+ Start a new topic</button>
      )}
    </div>
  );
}
