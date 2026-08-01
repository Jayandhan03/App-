"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();

  useEffect(() => {
    console.error("[app error boundary]", error);
  }, [error]);

  return (
    <div
      className="row center col"
      style={{ minHeight: "100vh", gap: 16, padding: 24, textAlign: "center" }}
    >
      <div style={{ fontSize: "1.05rem", fontWeight: 700 }}>Something went wrong</div>
      <p className="t-muted" style={{ maxWidth: 420, fontSize: "0.85rem" }}>
        That page hit an unexpected error. You can try again, or head back and continue from there.
      </p>
      <div className="row" style={{ gap: 10 }}>
        <button className="btn btn-secondary" onClick={() => reset()}>
          Try again
        </button>
        <button className="btn" onClick={() => router.push("/dashboard")}>
          Back to dashboard
        </button>
      </div>
    </div>
  );
}
