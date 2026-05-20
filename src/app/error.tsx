"use client";

import Link from "next/link";
import { useEffect } from "react";
import { AlertTriangle, RotateCcw, Home } from "lucide-react";

/**
 * Route-level error boundary. Catches anything thrown by client components
 * below the root layout. Studio-styled so a crash doesn't blow up to the
 * default Next.js error overlay.
 */
export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Local-only app, so just console — no telemetry to send.
    console.error("Life OS route error:", error);
  }, [error]);

  return (
    <div className="min-h-screen grid place-items-center p-6">
      <div className="w-full max-w-md life-card p-8 text-center pg-enter">
        <div
          className="mx-auto mb-5 grid place-items-center w-[54px] h-[54px] rounded-full"
          style={{
            background: "var(--terra-tint)",
            color: "var(--terra)",
            boxShadow: "var(--shadow-1)",
          }}
        >
          <AlertTriangle size={22} strokeWidth={1.6} />
        </div>
        <h1 className="text-[22px] font-semibold tracking-[-0.02em] text-[var(--ink)]">
          Something broke.
        </h1>
        <p className="mt-2 text-[13.5px] text-[var(--muted)] leading-relaxed">
          A page crashed — your data is fine, it lives in your browser. Try
          reloading the route, or head back to Today.
        </p>
        {error.message && (
          <pre className="mt-4 text-left text-[11.5px] font-mono text-[var(--muted-2)] bg-[var(--paper-2)] border border-[var(--line)] rounded-[10px] p-3 overflow-x-auto whitespace-pre-wrap">
            {error.message}
            {error.digest && (
              <span className="block mt-1 opacity-60">
                digest: {error.digest}
              </span>
            )}
          </pre>
        )}
        <div className="mt-6 flex items-center justify-center gap-2">
          <button
            type="button"
            onClick={reset}
            className="life-btn life-btn-sm life-btn-primary"
          >
            <RotateCcw size={12} strokeWidth={2} />
            Try again
          </button>
          <Link href="/today" className="life-btn life-btn-sm life-btn-secondary">
            <Home size={12} strokeWidth={1.6} />
            Back to Today
          </Link>
        </div>
      </div>
    </div>
  );
}
