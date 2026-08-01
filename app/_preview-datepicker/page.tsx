"use client";

import { useState } from "react";
import DatePicker from "@/components/DatePicker";

export default function Preview() {
  const [value, setValue] = useState("2026-08-01");
  return (
    <div style={{ padding: 60, background: "var(--bg)", minHeight: "100vh" }}>
      <div className="card" style={{ maxWidth: 420, padding: 22 }}>
        <div className="row between" style={{ gap: 8 }}>
          <span style={{ fontWeight: 550 }}>Start from</span>
          <DatePicker value={value} min="2026-08-01" onChange={setValue} />
        </div>
        <p style={{ marginTop: 16 }}>Selected: {value}</p>
      </div>
    </div>
  );
}
