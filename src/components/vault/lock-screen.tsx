"use client";

import { forwardRef, useEffect, useRef, useState } from "react";
import { LockKeyhole, ShieldCheck, Eye, EyeOff, KeyRound } from "lucide-react";
import { passcodeStrength } from "@/lib/vault/types";

export function LockScreen({
  mode,
  onSubmit,
  title,
  subtitle,
  onForgot,
  autoFocus = true,
}: {
  mode: "setup" | "unlock";
  onSubmit: (pass: string) => Promise<boolean>;
  title?: string;
  subtitle?: string;
  onForgot?: () => void;
  autoFocus?: boolean;
}) {
  const [pass, setPass] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shake, setShake] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus();
  }, [autoFocus]);

  const strength = passcodeStrength(pass);
  const isSetup = mode === "setup";
  const canSubmit = isSetup
    ? pass.length >= 6 && pass === confirm
    : pass.length > 0;

  async function submit() {
    if (!canSubmit || busy) return;
    setBusy(true);
    setError(null);
    try {
      const ok = await onSubmit(pass);
      if (!ok) {
        setError(isSetup ? "Couldn't set passcode." : "Incorrect passcode.");
        setShake(true);
        setTimeout(() => setShake(false), 420);
        setPass("");
        setConfirm("");
        inputRef.current?.focus();
      }
    } catch {
      setError("Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className={`w-full max-w-sm mx-auto ${shake ? "vault-shake" : ""}`}
      onKeyDown={(e) => {
        if (e.key === "Enter") submit();
      }}
    >
      <div
        className="rounded-[20px] border border-[var(--line-2)] bg-[var(--paper)] p-7 text-center relative overflow-hidden"
        style={{ boxShadow: "var(--shadow-3)" }}
      >
        <span
          aria-hidden
          className="absolute -top-16 left-1/2 -translate-x-1/2 w-56 h-56 rounded-full pointer-events-none"
          style={{
            background:
              "radial-gradient(circle, color-mix(in oklch, var(--terra) 16%, transparent), transparent 70%)",
          }}
        />
        <div className="relative">
          <div
            className="mx-auto grid place-items-center w-14 h-14 rounded-2xl mb-4"
            style={{
              background: "color-mix(in oklch, var(--terra) 14%, transparent)",
              color: "var(--terra)",
              border: "1px solid color-mix(in oklch, var(--terra) 28%, transparent)",
            }}
          >
            <LockKeyhole size={24} strokeWidth={1.7} />
          </div>

          <h2 className="text-[19px] font-semibold tracking-[-0.015em] text-[var(--ink)]">
            {title ?? (isSetup ? "Create a passcode" : "Vault locked")}
          </h2>
          <p className="mt-1.5 text-[13px] text-[var(--muted)] leading-relaxed max-w-[18rem] mx-auto">
            {subtitle ??
              (isSetup
                ? "This encrypts everything in your vault on this device. There's no recovery — keep it safe."
                : "Enter your passcode to decrypt your vault.")}
          </p>

          <div className="mt-5 space-y-2.5 text-left">
            <PassInput
              ref={inputRef}
              value={pass}
              onChange={setPass}
              show={show}
              setShow={setShow}
              placeholder={isSetup ? "New passcode" : "Passcode"}
            />
            {isSetup && (
              <input
                type={show ? "text" : "password"}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="Confirm passcode"
                className="w-full rounded-[11px] bg-[var(--paper-2)] border border-[var(--line)] px-3.5 py-2.5 text-[14px] text-[var(--ink)] placeholder:text-[var(--muted-2)] focus:outline-none focus:border-[var(--terra)] transition"
              />
            )}

            {isSetup && pass.length > 0 && (
              <div className="flex items-center gap-2 pt-0.5">
                <div className="flex-1 h-1.5 rounded-full bg-[var(--bg-2)] overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${(strength.score / 4) * 100}%`,
                      background:
                        strength.score >= 3
                          ? "var(--sage)"
                          : strength.score >= 2
                            ? "var(--gold)"
                            : "var(--bad)",
                    }}
                  />
                </div>
                <span className="text-[11px] text-[var(--muted)] w-16 text-right">
                  {strength.label}
                </span>
              </div>
            )}
            {isSetup && confirm.length > 0 && confirm !== pass && (
              <p className="text-[11.5px] text-[var(--bad)]">
                Passcodes don&apos;t match.
              </p>
            )}
          </div>

          {error && (
            <p className="mt-3 text-[12.5px] text-[var(--bad)] font-medium">
              {error}
            </p>
          )}

          <button
            type="button"
            onClick={submit}
            disabled={!canSubmit || busy}
            className="mt-5 w-full inline-flex items-center justify-center gap-2 h-11 rounded-[12px] bg-[var(--terra)] text-white text-[14px] font-semibold hover:brightness-105 active:translate-y-px transition disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isSetup ? (
              <>
                <ShieldCheck size={16} /> Create passcode
              </>
            ) : (
              <>
                <KeyRound size={16} /> Unlock
              </>
            )}
          </button>

          <div className="mt-4 flex items-center justify-center gap-1.5 text-[11px] text-[var(--muted-2)]">
            <ShieldCheck size={12} />
            Encrypted on this device · never synced
          </div>

          {onForgot && (
            <button
              type="button"
              onClick={onForgot}
              className="mt-3 text-[11.5px] text-[var(--muted)] hover:text-[var(--bad)] transition"
            >
              Forgot passcode? Reset the vault
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

const PassInput = forwardRef<
  HTMLInputElement,
  {
    value: string;
    onChange: (v: string) => void;
    show: boolean;
    setShow: (b: boolean) => void;
    placeholder: string;
  }
>(function PassInput({ value, onChange, show, setShow, placeholder }, ref) {
  return (
    <div className="relative">
      <input
        ref={ref}
        type={show ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete="off"
        className="w-full rounded-[11px] bg-[var(--paper-2)] border border-[var(--line)] pl-3.5 pr-10 py-2.5 text-[14px] text-[var(--ink)] placeholder:text-[var(--muted-2)] focus:outline-none focus:border-[var(--terra)] transition"
      />
      <button
        type="button"
        onClick={() => setShow(!show)}
        tabIndex={-1}
        aria-label={show ? "Hide" : "Show"}
        className="absolute right-2.5 top-1/2 -translate-y-1/2 grid place-items-center w-7 h-7 rounded-md text-[var(--muted-2)] hover:text-[var(--ink)] transition"
      >
        {show ? <EyeOff size={15} /> : <Eye size={15} />}
      </button>
    </div>
  );
});
