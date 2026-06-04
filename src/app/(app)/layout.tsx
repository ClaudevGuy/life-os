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
import { LogoMark } from "@/components/logo-mark";
import { MusicProvider } from "@/components/music-player";
import { VaultProvider } from "@/components/vault/vault-provider";
import { AppLockGate } from "@/components/vault/app-lock-gate";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <VaultProvider>
    <div className="h-screen flex relative z-[1]">
      <aside
        data-side="rail"
        className="w-[248px] shrink-0 flex flex-col relative transition-all"
        style={{
          background: "var(--paper)",
          borderRight: "1px solid var(--line)",
        }}
      >
        <div className="px-[18px] pt-[18px] pb-[14px]">
          <Link
            href="/today"
            className="group inline-flex items-center gap-2.5"
            aria-label="Life OS — go to Today"
          >
            <LogoMark size={30} />
            <span className="flex flex-col leading-none" data-rail-text>
              <span className="text-[17px] font-semibold tracking-[-0.015em] text-[var(--ink)]">
                Life<span className="text-[var(--terra)]">·</span>OS
              </span>
              <span className="mt-1 text-[9px] uppercase tracking-[0.18em] text-[var(--muted)] group-hover:text-[var(--terra)] transition">
                Second brain
              </span>
            </span>
          </Link>
        </div>

        <nav className="flex-1 px-3 pb-3 overflow-y-auto">
          <SidebarNav />
        </nav>

        <div
          className="px-3 py-3 space-y-2"
          style={{ borderTop: "1px solid var(--line)" }}
        >
          <Link
            href="/settings"
            title="Settings"
            className="flex items-center gap-2.5 px-2.5 py-2 rounded-[9px] text-[13.5px] font-normal text-[var(--ink-2)] hover:bg-[var(--bg-2)] transition-colors"
          >
            <Settings size={16} className="text-[var(--muted)] shrink-0" strokeWidth={1.6} />
            <span data-rail-text>Settings</span>
          </Link>
          <div
            className="px-2.5 pt-1 text-[10px] text-[var(--muted-2)] uppercase tracking-[0.14em]"
            data-rail-text
          >
            local · v1.0
          </div>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto min-w-0">
        <TopBar />
        <MusicProvider>{children}</MusicProvider>
      </main>

      <QuickCapture />
      <CommandPalette />
      <WelcomeModal />
      <KeyboardShortcuts />
      <PersistBootstrap />
      <SyncBootstrap />
      <AppLockGate />
    </div>
    </VaultProvider>
  );
}
