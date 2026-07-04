"use client";

/**
 * A 12-hour AM/PM time-of-day picker. Native `<input type="time">` renders in
 * whatever format the OS locale dictates (often 24-hour, with no way for the
 * page to override it) — this always shows hour/minute/AM-PM explicitly,
 * while still storing/emitting the same "HH:MM" 24-hour string every other
 * part of the schedule pipeline (computeNextRunAt, describeSchedule, the
 * backend) already expects.
 */

type Period = "AM" | "PM";

function to12Hour(hhmm: string): { hour12: number; minute: number; period: Period } {
  const [hh = 9, mm = 0] = (hhmm || "09:00").split(":").map(Number);
  const period: Period = hh >= 12 ? "PM" : "AM";
  const hour12 = hh % 12 === 0 ? 12 : hh % 12;
  return { hour12, minute: mm, period };
}

function to24Hour(hour12: number, minute: number, period: Period): string {
  const hh = period === "AM" ? (hour12 % 12) : (hour12 % 12) + 12;
  return `${String(hh).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

const HOURS = Array.from({ length: 12 }, (_, i) => i + 1);
const MINUTES = Array.from({ length: 60 }, (_, i) => i);

export default function TimePicker({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  const { hour12, minute, period } = to12Hour(value);
  const set = (h: number, m: number, p: Period) => onChange(to24Hour(h, m, p));

  return (
    <div className="row" style={{ gap: 6 }}>
      <select
        aria-label="Hour"
        value={hour12}
        disabled={disabled}
        onChange={e => set(Number(e.target.value), minute, period)}
        className="input"
        style={{ height: 42, width: 60, fontSize: "0.9rem", textAlign: "center", padding: "0 2px", borderRadius: "var(--r-md)" }}
      >
        {HOURS.map(h => <option key={h} value={h}>{h}</option>)}
      </select>
      <span style={{ alignSelf: "center", color: "var(--ink-3)", fontWeight: 600 }}>:</span>
      <select
        aria-label="Minute"
        value={minute}
        disabled={disabled}
        onChange={e => set(hour12, Number(e.target.value), period)}
        className="input"
        style={{ height: 42, width: 64, fontSize: "0.9rem", textAlign: "center", padding: "0 2px", borderRadius: "var(--r-md)" }}
      >
        {MINUTES.map(m => <option key={m} value={m}>{String(m).padStart(2, "0")}</option>)}
      </select>
      <div className="row" role="group" aria-label="AM or PM" style={{ gap: 2, background: "var(--surface-3)", padding: 3, borderRadius: "var(--r-md)" }}>
        {(["AM", "PM"] as const).map(p => (
          <button
            key={p}
            type="button"
            disabled={disabled}
            onClick={() => set(hour12, minute, p)}
            style={{
              height: 36, padding: "0 13px", borderRadius: "var(--r-sm)", border: "none",
              cursor: disabled ? "not-allowed" : "pointer", fontSize: "0.78rem", fontWeight: 700,
              background: period === p ? "var(--accent)" : "transparent",
              color: period === p ? "#fff" : "var(--ink-3)",
              transition: "all 0.15s var(--ease)",
            }}
          >
            {p}
          </button>
        ))}
      </div>
    </div>
  );
}
