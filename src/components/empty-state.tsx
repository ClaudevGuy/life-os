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
  icon: React.ComponentType<{ size?: number; className?: string }>;
  tint?: string;
  title: string;
  body?: string;
  actions?: Action[];
}) {
  const t = tint ?? "var(--accent)";
  return (
    <div className="mt-10 life-card p-8 sm:p-10">
      <div className="max-w-md mx-auto text-center">
        <div
          className="mx-auto mb-5 grid place-items-center w-12 h-12 rounded-2xl"
          style={{
            background: `color-mix(in oklch, ${t} 14%, transparent)`,
            color: t,
          }}
        >
          <Icon size={22} />
        </div>
        <h3 className="text-base font-medium text-[var(--text)]">{title}</h3>
        {body && (
          <p className="mt-2 text-sm text-[var(--text-muted)] leading-relaxed">
            {body}
          </p>
        )}
        {actions && actions.length > 0 && (
          <div className="mt-5 flex items-center justify-center gap-2 flex-wrap">
            {actions.map((a) =>
              a.href ? (
                <Link
                  key={a.label}
                  href={a.href}
                  className="inline-flex items-center gap-1.5 rounded-md bg-[var(--accent)] text-zinc-950 px-3 py-1.5 text-xs font-medium hover:brightness-110 transition"
                >
                  {a.label}
                </Link>
              ) : (
                <span
                  key={a.label}
                  className="inline-flex items-center gap-1.5 rounded-md border border-[var(--border-soft)] text-[var(--text-muted)] px-3 py-1.5 text-xs"
                >
                  {a.onClickKey && (
                    <kbd className="font-mono text-[10px] bg-[var(--bg-rail)] border border-[var(--border-soft)] rounded px-1.5">
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
