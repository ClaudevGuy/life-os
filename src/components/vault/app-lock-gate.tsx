"use client";

import { useVault } from "./vault-provider";
import { LockScreen } from "./lock-screen";
import { LogoMark } from "@/components/logo-mark";

/**
 * When the app lock is on, covers the whole app until the passcode is entered.
 * Renders a neutral branded splash until we've read the lock state, so private
 * content never flashes for locked users.
 */
export function AppLockGate() {
  const v = useVault();

  if (!v.ready) {
    return (
      <div className="fixed inset-0 z-[200] bg-[var(--paper)] grid place-items-center">
        <LogoMark size={40} />
      </div>
    );
  }

  if (!v.appLocked) return null;

  return (
    <div className="fixed inset-0 z-[200] bg-[var(--paper)] grid place-items-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center gap-2.5">
          <LogoMark size={38} />
          <span className="text-[15px] font-semibold tracking-[-0.015em] text-[var(--ink)]">
            Life<span className="text-[var(--terra)]">·</span>OS
          </span>
        </div>
        <LockScreen
          mode="unlock"
          onSubmit={v.unlock}
          title="Welcome back"
          subtitle="Enter your passcode to unlock Life OS."
        />
      </div>
    </div>
  );
}
