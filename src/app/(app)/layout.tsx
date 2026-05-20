import Link from "next/link";
import { Settings } from "lucide-react";
import { CommandPalette } from "@/components/command-palette";
import { QuickCapture } from "@/components/quick-capture";
import { WelcomeModal } from "@/components/welcome-modal";
import { KeyboardShortcuts } from "@/components/keyboard-shortcuts";
import { TopBar } from "@/components/top-bar";
import { SidebarNav } from "@/components/sidebar-nav";
import { PersistBootstrap } from "@/components/persist-bootstrap";
import { SyncBootstrap } from "@/components/sync-bootstrap";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="h-screen flex relative z-[1]">
      <aside
        data-side="rail"
        className="w-60 shrink-0 flex flex-col relative transition-all"
        style={{
          background: "var(--bg-rail)",
          borderRight: "1px solid var(--rail-border, var(--border-strong))",
          boxShadow: "1px 0 0 0 rgba(0,0,0,0.15)",
        }}
      >
        <div className="px-5 py-5">
          <Link
            href="/today"
            className="inline-flex items-center gap-2 font-semibold tracking-tight"
          >
            <span className="grid place-items-center w-7 h-7 rounded-md bg-[var(--accent-soft)] text-[var(--accent)] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
              ◇
            </span>
            <span className="life-shine text-[16px] font-bold" data-rail-text>
              Life OS
            </span>
          </Link>
        </div>

        <nav className="flex-1 px-2 pb-3 overflow-y-auto">
          <SidebarNav />
        </nav>

        <div
          className="px-2 py-3 space-y-2"
          style={{ borderTop: "1px solid var(--rail-border, var(--border-strong))" }}
        >
          <Link
            href="/settings"
            title="Settings"
            className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-[13px] font-medium text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--bg-card-hover)] transition-colors"
          >
            <Settings size={14} className="text-[var(--text-faint)] shrink-0" strokeWidth={2} />
            <span data-rail-text>Settings</span>
          </Link>
          <div
            className="px-2.5 pt-1 text-[10px] text-[var(--text-faint)] uppercase tracking-wider"
            data-rail-text
          >
            local · v1.0
          </div>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto min-w-0">
        <TopBar />
        {children}
      </main>

      <QuickCapture />
      <CommandPalette />
      <WelcomeModal />
      <KeyboardShortcuts />
      <PersistBootstrap />
      <SyncBootstrap />
    </div>
  );
}
