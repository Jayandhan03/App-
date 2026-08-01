"use client";

/**
 * A calendar date picker matching the app's own visual language, instead of
 * the browser's native `<input type="date">` — which renders wildly
 * differently (and looks dated) across OS/browser combinations. Stores and
 * emits plain "YYYY-MM-DD" strings, same as the native input did.
 */

import { useEffect, useRef, useState } from "react";

const WD = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

function pad(n: number) { return String(n).padStart(2, "0"); }
function toStr(y: number, m: number, d: number) { return `${y}-${pad(m)}-${pad(d)}`; }
function parse(v: string): { y: number; m: number; d: number } {
  const [y, m, d] = v.split("-").map(Number);
  return { y: y || 1970, m: m || 1, d: d || 1 };
}
// Pure calendar-grid math — deliberately UTC so it never drifts with the
// browser's own timezone (a month's layout is the same everywhere).
function daysInMonth(y: number, m: number) { return new Date(Date.UTC(y, m, 0)).getUTCDate(); }
function firstWeekday(y: number, m: number) { return new Date(Date.UTC(y, m - 1, 1)).getUTCDay(); }
function formatLabel(v: string) {
  const { y, m, d } = parse(v);
  return `${MONTHS[m - 1].slice(0, 3)} ${d}, ${y}`;
}

export default function DatePicker({
  value,
  onChange,
  min,
  disabled,
}: {
  value: string; // "YYYY-MM-DD"
  onChange: (v: string) => void;
  min?: string; // "YYYY-MM-DD" — also doubles as the "Today" shortcut target
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const sel = parse(value);
  const [cursor, setCursor] = useState({ y: sel.y, m: sel.m });
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => { if (open) setCursor({ y: sel.y, m: sel.m }); }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!open) return;
    const onDocDown = (e: MouseEvent) => { if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onDocDown);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDocDown); document.removeEventListener("keydown", onKey); };
  }, [open]);

  const monthKey = `${cursor.y}-${pad(cursor.m)}`;
  const minMonthKey = min ? `${parse(min).y}-${pad(parse(min).m)}` : null;
  const canGoPrev = !minMonthKey || monthKey > minMonthKey;

  const goMonth = (delta: number) => setCursor(c => {
    let m = c.m + delta, y = c.y;
    if (m < 1) { m = 12; y -= 1; }
    if (m > 12) { m = 1; y += 1; }
    return { y, m };
  });

  const nDays = daysInMonth(cursor.y, cursor.m);
  const startWd = firstWeekday(cursor.y, cursor.m);
  const cells: (number | null)[] = [...Array(startWd).fill(null), ...Array.from({ length: nDays }, (_, i) => i + 1)];
  while (cells.length % 7 !== 0) cells.push(null);

  const pick = (d: number) => {
    const v = toStr(cursor.y, cursor.m, d);
    if (min && v < min) return;
    onChange(v);
    setOpen(false);
  };

  return (
    <div ref={wrapRef} style={{ position: "relative" }}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(o => !o)}
        className="row between"
        style={{
          height: 38, padding: "0 12px", borderRadius: "var(--r-sm)", border: "1px solid var(--line-2)",
          background: "var(--surface)", color: "var(--ink)", fontSize: "0.82rem", fontWeight: 550,
          cursor: disabled ? "not-allowed" : "pointer", gap: 10, width: 170,
          transition: "border-color 0.18s var(--ease)",
        }}
      >
        {formatLabel(value)}
        <span aria-hidden style={{ fontSize: "0.95rem", opacity: 0.55 }}>📆</span>
      </button>

      {open && (
        <div
          className="card"
          style={{
            position: "absolute", top: "calc(100% + 8px)", right: 0, zIndex: 50, width: 264, padding: 14,
            borderRadius: "var(--r-lg)", boxShadow: "var(--shadow-lg)", animation: "riseSm 0.16s var(--ease) both",
          }}
        >
          <div className="row between" style={{ marginBottom: 10 }}>
            <button
              type="button" onClick={() => goMonth(-1)} disabled={!canGoPrev} className="icon-btn" aria-label="Previous month"
              style={{ opacity: canGoPrev ? 1 : 0.35, cursor: canGoPrev ? "pointer" : "not-allowed", fontSize: "1rem" }}
            >‹</button>
            <span style={{ fontSize: "0.85rem", fontWeight: 650 }}>{MONTHS[cursor.m - 1]} {cursor.y}</span>
            <button type="button" onClick={() => goMonth(1)} className="icon-btn" aria-label="Next month" style={{ fontSize: "1rem" }}>›</button>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2, marginBottom: 2 }}>
            {WD.map(w => (
              <div key={w} style={{ textAlign: "center", fontSize: "0.64rem", fontWeight: 600, color: "var(--ink-4)", padding: "4px 0" }}>{w}</div>
            ))}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2 }}>
            {cells.map((d, i) => {
              if (d == null) return <div key={i} />;
              const v = toStr(cursor.y, cursor.m, d);
              const isSelected = v === value;
              const isDisabled = !!min && v < min;
              return (
                <button
                  key={i}
                  type="button"
                  disabled={isDisabled}
                  onClick={() => pick(d)}
                  style={{
                    height: 30, borderRadius: "var(--r-sm)", border: "none", fontSize: "0.78rem",
                    fontWeight: isSelected ? 700 : 500,
                    background: isSelected ? "var(--accent)" : "transparent",
                    color: isSelected ? "#fff" : isDisabled ? "var(--ink-4)" : "var(--ink-2)",
                    cursor: isDisabled ? "not-allowed" : "pointer",
                    opacity: isDisabled ? 0.45 : 1,
                    transition: "background 0.12s var(--ease), color 0.12s var(--ease)",
                  }}
                  onMouseEnter={e => { if (!isSelected && !isDisabled) e.currentTarget.style.background = "var(--surface-2)"; }}
                  onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = "transparent"; }}
                >
                  {d}
                </button>
              );
            })}
          </div>

          {min && (
            <button
              type="button"
              onClick={() => { onChange(min); setOpen(false); }}
              style={{
                marginTop: 10, paddingTop: 10, borderTop: "1px solid var(--line)", width: "100%",
                textAlign: "center", background: "none", border: "none", borderTopWidth: 1, borderTopStyle: "solid", borderTopColor: "var(--line)",
                color: "var(--accent-ink)", fontSize: "0.78rem", fontWeight: 600, cursor: "pointer",
              }}
            >
              Today
            </button>
          )}
        </div>
      )}
    </div>
  );
}
