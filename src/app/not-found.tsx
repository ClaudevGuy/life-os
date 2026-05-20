import Link from "next/link";
import { Compass, Home } from "lucide-react";

export const metadata = { title: "Not found" };

export default function NotFound() {
  return (
    <div className="min-h-screen grid place-items-center p-6">
      <div className="w-full max-w-md life-card p-8 text-center pg-enter">
        <div
          className="mx-auto mb-5 grid place-items-center w-[54px] h-[54px] rounded-full"
          style={{
            background: "var(--gold-tint)",
            color: "var(--gold)",
            boxShadow: "var(--shadow-1)",
          }}
        >
          <Compass size={22} strokeWidth={1.6} />
        </div>
        <div className="text-[10.5px] uppercase tracking-[0.14em] font-semibold text-[var(--muted)]">
          404
        </div>
        <h1 className="mt-1 text-[22px] font-semibold tracking-[-0.02em] text-[var(--ink)]">
          Nothing here.
        </h1>
        <p className="mt-2 text-[13.5px] text-[var(--muted)] leading-relaxed">
          The page or item you were looking for doesn&apos;t exist (anymore).
          Maybe it was archived or deleted from another tab.
        </p>
        <div className="mt-6 flex items-center justify-center gap-2">
          <Link
            href="/today"
            className="life-btn life-btn-sm life-btn-primary"
          >
            <Home size={12} strokeWidth={2} />
            Back to Today
          </Link>
          <Link
            href="/inbox"
            className="life-btn life-btn-sm life-btn-secondary"
          >
            Open Inbox
          </Link>
        </div>
      </div>
    </div>
  );
}
