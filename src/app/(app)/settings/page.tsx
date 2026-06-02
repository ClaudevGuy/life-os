import { Settings as SettingsIcon } from "lucide-react";
import { SettingsClient } from "./settings-client";
import { DataSection } from "./data-section";
import { TrashSection } from "./trash-section";
import { AiKeySection } from "./ai-key-section";
import { SyncSection } from "./sync-section";

export const metadata = { title: "Settings · Life OS" };

export default function SettingsPage() {
  return (
    <div className="p-8 max-w-2xl">
      <h1 className="life-h1 inline-flex items-center gap-2">
        <SettingsIcon size={18} className="text-[var(--accent)]" />
        Settings
      </h1>
      <p className="text-sm text-[var(--text-muted)] mt-1">
        Preferences and data, all stored in your browser.
      </p>

      <section className="mt-8">
        <h2 className="text-[10px] uppercase tracking-[0.14em] text-[var(--text-faint)] mb-3">
          Preferences
        </h2>
        <SettingsClient />
      </section>

      <section className="mt-10">
        <h2 className="text-[10px] uppercase tracking-[0.14em] text-[var(--text-faint)] mb-3">
          AI
        </h2>
        <AiKeySection />
      </section>

      <section className="mt-10">
        <h2 className="text-[10px] uppercase tracking-[0.14em] text-[var(--text-faint)] mb-3">
          Sync
        </h2>
        <SyncSection />
      </section>

      <section className="mt-10">
        <h2 className="text-[10px] uppercase tracking-[0.14em] text-[var(--text-faint)] mb-3">
          Data
        </h2>
        <DataSection />
      </section>

      <section className="mt-10">
        <h2 className="text-[10px] uppercase tracking-[0.14em] text-[var(--text-faint)] mb-3">
          Trash
        </h2>
        <TrashSection />
      </section>
    </div>
  );
}
