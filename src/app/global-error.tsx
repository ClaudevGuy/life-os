"use client";

/**
 * Catches errors that happen INSIDE the root layout itself (font loading,
 * theme bootstrap script, etc.). Must render its own <html><body>, so it
 * has no access to globals.css — keep the styling inline.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          background: "#F6F1E8",
          color: "#1A1A1A",
          fontFamily: "ui-sans-serif, system-ui, -apple-system, sans-serif",
          padding: "24px",
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: "420px",
            padding: "32px",
            borderRadius: "16px",
            border: "1px solid rgba(26,26,26,0.14)",
            background: "#FBF7EE",
            boxShadow:
              "0 1px 0 rgba(255,255,255,0.7) inset, 0 18px 50px -16px rgba(26,26,26,0.32)",
            textAlign: "center",
          }}
        >
          <h1
            style={{
              margin: 0,
              fontSize: "22px",
              fontWeight: 600,
              letterSpacing: "-0.02em",
              color: "#1A1A1A",
            }}
          >
            Life OS couldn&apos;t start.
          </h1>
          <p
            style={{
              marginTop: "8px",
              fontSize: "13.5px",
              lineHeight: 1.6,
              color: "#8A7F6B",
            }}
          >
            Something at the root level crashed. Your data is fine — it lives
            in your browser&apos;s IndexedDB. Reload the page or click below.
          </p>
          {error.message && (
            <pre
              style={{
                marginTop: "16px",
                padding: "12px",
                borderRadius: "10px",
                background: "#F2EBDA",
                border: "1px solid rgba(26,26,26,0.08)",
                fontSize: "11.5px",
                fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
                color: "#B5A98F",
                textAlign: "left",
                whiteSpace: "pre-wrap",
                overflowX: "auto",
              }}
            >
              {error.message}
            </pre>
          )}
          <button
            type="button"
            onClick={reset}
            style={{
              marginTop: "24px",
              padding: "8px 16px",
              borderRadius: "10px",
              border: "none",
              background: "#D45A3F",
              color: "#FBF7EE",
              fontSize: "13.5px",
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            Reload
          </button>
        </div>
      </body>
    </html>
  );
}
