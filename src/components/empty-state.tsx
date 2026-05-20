import Link from "next/link";

type Action = {
  label: string;
  href?: string;
  onClickKey?: string; // "c" → tells user to press c
};

export function EmptyState({
  icon: Icon,
  tint,
  title,
  body,
  actions,
}: {
  icon: React.ComponentType<{
    size?: number;
    className?: string;
    style?: React.CSSProperties;
  }>;
  tint?: string;
  title: string;
  body?: string;
  actions?: Action[];
}) {
  const t = tint ?? "var(--accent)";
  return (
    <div className="mt-8 relative overflow-hidden life-card p-10 sm:p-14">
      <div
        aria-hidden
        className="absolute inset-0 opacity-40 pointer-events-none"
        style={{
          background: `radial-gradient(circle at 50% 25%, color-mix(in oklch, ${t} 22%, transparent), transparent 60%)`,
        }}
      />
      <div className="relative max-w-md mx-auto text-center">
        <div
          className="mx-auto mb-5 grid place-items-center w-14 h-14 rounded-full shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
          style={{
            background: `color-mix(in oklch, ${t} 16%, transparent)`,
            color: t,
            boxShadow: `0 0 0 4px color-mix(in oklch, ${t} 8%, transparent), 0 0 30px color-mix(in oklch, ${t} 35%, transparent)`,
          }}
        >
          <Icon size={22} />
        </div>
        <h3 className="text-base font-semibold tracking-tight life-shine">
          {title}
        </h3>
        {body && (
          <p className="mt-2 text-sm text-[var(--text-muted)] leading-relaxed">
            {body}
          </p>
        )}
        {actions && actions.length > 0 && (
          <div className="mt-6 flex items-center justify-center gap-2 flex-wrap">
            {actions.map((a) =>
              a.href ? (
                <Link
                  key={a.label}
                  href={a.href}
                  className="life-btn life-btn-primary"
                >
                  {a.label}
                </Link>
              ) : (
                <span
                  key={a.label}
                  className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border-soft)] bg-[var(--bg-card)] text-[var(--text-muted)] px-3 py-1.5 text-xs"
                >
                  {a.onClickKey && (
                    <kbd className="font-mono text-[10px] bg-[var(--bg-rail)] border border-[var(--border-soft)] rounded px-1.5 py-0.5 text-[var(--text)]">
                      {a.onClickKey}
                    </kbd>
                  )}
                  {a.label}
                </span>
              ),
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * A small reusable page header — icon + title + subtitle on the left, primary
 * action (usually a "New X" pill) slot on the right. Several pages had the
 * same hand-rolled layout; this consolidates them.
 */
export function PageHeader({
  icon: Icon,
  title,
  subtitle,
  tint,
  action,
  meta,
}: {
  icon: React.ComponentType<{
    size?: number;
    className?: string;
    style?: React.CSSProperties;
  }>;
  title: string;
  subtitle?: string;
  tint?: string;
  action?: React.ReactNode;
  meta?: React.ReactNode;
}) {
  const t = tint ?? "var(--accent)";
  return (
    <div className="flex items-baseline justify-between flex-wrap gap-3">
      <div>
        <h1 className="life-h1 inline-flex items-center gap-2">
          <Icon size={18} style={{ color: t }} />
          {title}
        </h1>
        {subtitle && (
          <p className="text-sm text-[var(--text-muted)] mt-1">{subtitle}</p>
        )}
      </div>
      <div className="flex items-center gap-3">
        {meta && (
          <span className="text-xs text-[var(--text-faint)] tabular-nums">
            {meta}
          </span>
        )}
        {action}
      </div>
    </div>
  );
}
