import { Settings as SettingsIcon, Key, Download } from "lucide-react";
import Link from "next/link";
import { SettingsClient } from "./settings-client";

export const metadata = { title: "Settings · Life OS" };

export default function SettingsPage() {
  return (
    <div className="p-8 max-w-2xl">
      <h1 className="life-h1 inline-flex items-center gap-2">
        <SettingsIcon size={18} className="text-[var(--accent)]" />
        Settings
      </h1>
      <p className="text-sm text-[var(--text-muted)] mt-1">
        Preferences, data, integrations.
      </p>

      <section className="mt-8">
        <h2 className="text-[10px] uppercase tracking-[0.14em] text-[var(--text-faint)] mb-3">
          Preferences
        </h2>
        <SettingsClient />
      </section>

      <section className="mt-10">
        <h2 className="text-[10px] uppercase tracking-[0.14em] text-[var(--text-faint)] mb-3">
          Data
        </h2>
        <div className="life-card divide-y divide-[var(--border-soft)] overflow-hidden">
          <a
            href="/api/export"
            download
            className="flex items-center gap-3 px-4 py-3 hover:bg-[var(--bg-card-hover)] transition"
          >
            <Download size={14} className="text-[var(--accent)]" />
            <div className="flex-1">
              <div className="text-sm font-medium">Export everything</div>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">
                Download every item as one JSON file. Take your data with you.
              </p>
            </div>
            <span className="text-[10px] text-[var(--text-faint)] uppercase tracking-wide">
              .json
            </span>
          </a>
          <div className="px-4 py-3 text-xs text-[var(--text-muted)]">
            <div className="font-medium text-[var(--text)] text-sm mb-0.5">
              Storage
            </div>
            Local-mode persistence at <code className="font-mono text-[var(--accent)]">./data/lifeos.json</code>.
            Captures persist across dev-server restarts.
          </div>
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-[10px] uppercase tracking-[0.14em] text-[var(--text-faint)] mb-3">
          Integrations
        </h2>
        <div className="life-card divide-y divide-[var(--border-soft)] overflow-hidden">
          <Link
            href="/settings/keys"
            className="flex items-center gap-3 px-4 py-3 hover:bg-[var(--bg-card-hover)] transition"
          >
            <Key size={14} className="text-[var(--accent)]" />
            <div className="flex-1">
              <div className="text-sm font-medium">API keys</div>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">
                Bearer tokens for Claude Code, iOS Shortcuts, browser extensions.
              </p>
            </div>
            <span className="text-[10px] text-[var(--text-faint)]">→</span>
          </Link>
        </div>
      </section>
    </div>
  );
}
