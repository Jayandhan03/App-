"use client";

import { useEffect, useRef, useState } from "react";

export type DropdownOption<T extends string> = { value: T; label: string; icon?: string };

/**
 * A premium custom select — the trigger reads like a real control (icon,
 * current value, chevron) and the menu is our own styled popover, not the
 * browser's native <select> chrome. Used for every N-way field in the
 * create-agent panel (lookback window, cadence, language, tone).
 */
export default function Dropdown<T extends string>({
  options,
  value,
  onChange,
  disabled,
  align = "right",
}: {
  options: DropdownOption<T>[];
  value: T;
  onChange: (v: T) => void;
  disabled?: boolean;
  /** Which edge the menu hangs from — keeps it on-screen for controls near the card's right edge. */
  align?: "left" | "right";
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const cur = options.find(o => o.value === value) ?? options[0];

  useEffect(() => {
    if (!open) return;
    const onDocDown = (e: MouseEvent) => { if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onDocDown);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDocDown); document.removeEventListener("keydown", onKey); };
  }, [open]);

  return (
    <div ref={wrapRef} style={{ position: "relative", flexShrink: 0 }}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(o => !o)}
        className="dd-trigger"
        data-open={open}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        {cur?.icon && <span aria-hidden>{cur.icon}</span>}
        <span>{cur?.label}</span>
        <svg width="11" height="11" viewBox="0 0 20 20" fill="none" className="dd-chevron" data-open={open}>
          <path d="M5 7.5L10 12.5L15 7.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <div className={`card dd-menu dd-menu-${align}`} role="listbox">
          {options.map(o => {
            const on = o.value === value;
            return (
              <button
                key={o.value}
                type="button"
                role="option"
                aria-selected={on}
                onClick={() => { onChange(o.value); setOpen(false); }}
                className="dd-item"
                data-on={on}
              >
                <span className="row" style={{ gap: 8 }}>
                  {o.icon && <span aria-hidden>{o.icon}</span>}
                  {o.label}
                </span>
                {on && <span className="dd-check" aria-hidden>✓</span>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
