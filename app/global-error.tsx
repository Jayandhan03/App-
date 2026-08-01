"use client";

// Catches errors thrown by the root layout itself (app/error.tsx only
// catches errors in nested route segments) — must render its own
// <html>/<body> since it replaces the root layout entirely.
export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body>
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 16,
            padding: 24,
            textAlign: "center",
            fontFamily: "system-ui, sans-serif",
          }}
        >
          <div style={{ fontSize: "1.05rem", fontWeight: 700 }}>Something went wrong</div>
          <p style={{ maxWidth: 420, fontSize: "0.85rem", color: "#666" }}>
            Leora hit an unexpected error loading this page. Please try again.
          </p>
          <button
            onClick={() => reset()}
            style={{
              padding: "10px 18px",
              borderRadius: 8,
              border: "1px solid #ccc",
              background: "#fff",
              cursor: "pointer",
              fontSize: "0.85rem",
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
