"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { Plus, X } from "lucide-react";
import { captureItem } from "@/lib/store/items";

const RELATIONSHIPS = [
  "Family",
  "Partner",
  "Friend",
  "Co-founder",
  "Colleague",
  "Mentor",
  "Other",
] as const;
type Relationship = (typeof RELATIONSHIPS)[number];

const COLORS: { value: string; tint: string }[] = [
  { value: "var(--terra)", tint: "var(--terra-tint)" },
  { value: "var(--sage)", tint: "var(--sage-tint)" },
  { value: "var(--gold)", tint: "var(--gold-tint)" },
  { value: "var(--plum)", tint: "var(--plum-tint)" },
  { value: "var(--sky)", tint: "var(--sky-tint)" },
];

function initials(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return "·";
  const parts = trimmed.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function NewPersonButton() {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="life-btn life-btn-sm life-btn-primary"
      >
        <Plus size={13} strokeWidth={2} />
        New person
      </button>
    );
  }

  return <NewPersonModal onClose={() => setOpen(false)} />;
}

function NewPersonModal({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState("");
  const [relationship, setRelationship] = useState<Relationship>("Friend");
  const [role, setRole] = useState("");
  const [livesIn, setLivesIn] = useState("");
  const [color, setColor] = useState<string>(COLORS[0].value);
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const colorTint = useMemo(
    () => COLORS.find((c) => c.value === color)?.tint ?? "var(--paper-2)",
    [color],
  );

  async function save() {
    if (!name.trim()) {
      toast.error("Name required");
      return;
    }
    startTransition(async () => {
      try {
        await captureItem({
          kind: "person",
          title: name.trim(),
          body: notes.trim() || null,
          status: "active",
          metadata: {
            relationship,
            role: role.trim() || undefined,
            location: livesIn.trim() || undefined,
            color,
            email: email.trim() || undefined,
            phone: phone.trim() || undefined,
          },
        });
        toast.success("Added");
        onClose();
      } catch {
        toast.error("Failed");
      }
    });
  }

  const canSave = name.trim().length > 0;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm overflow-y-auto"
      onClick={onClose}
    >
      <div className="min-h-full flex items-start justify-center px-4 py-8 sm:py-12">
        <div
          className="w-full max-w-lg rounded-[16px] border border-[var(--line-2)] bg-[var(--paper)] life-rise overflow-hidden"
          style={{ boxShadow: "var(--shadow-3)" }}
          onClick={(e) => e.stopPropagation()}
        >
        {/* Header */}
        <div className="p-6 flex items-start gap-4 border-b border-[var(--line)]">
          <div
            className="grid place-items-center w-[68px] h-[68px] rounded-full text-[20px] font-semibold tracking-[-0.01em] shrink-0 transition-colors"
            style={{
              background: colorTint,
              color,
              border: `1.6px solid ${color}`,
            }}
          >
            {initials(name)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[10.5px] uppercase tracking-[0.14em] font-semibold text-[var(--muted)]">
              New person
            </div>
            <div className="mt-1 text-[24px] font-semibold tracking-[-0.02em] text-[var(--ink)] leading-tight">
              Someone worth remembering.
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="grid place-items-center w-8 h-8 rounded-[8px] border border-[var(--line)] bg-[var(--paper)] text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--paper-2)] transition shrink-0"
          >
            <X size={14} strokeWidth={1.6} />
          </button>
        </div>

        {/* Form */}
        <div className="p-6 space-y-5">
          <Field label="Name">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Jordan Park"
              autoFocus
              className="w-full rounded-[10px] bg-[var(--paper-2)] border border-[var(--line)] px-3 py-2 text-[14px] text-[var(--ink)] placeholder:text-[var(--muted-2)] focus:outline-none focus:border-[var(--terra)] transition"
            />
          </Field>

          <Field label="Relationship">
            <div className="flex flex-wrap gap-2">
              {RELATIONSHIPS.map((r) => {
                const active = relationship === r;
                return (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRelationship(r)}
                    className="px-3 py-1.5 rounded-full text-[12.5px] font-medium transition border"
                    style={
                      active
                        ? {
                            background: "var(--terra-tint)",
                            color: "var(--terra)",
                            borderColor: "var(--terra)",
                          }
                        : {
                            background: "var(--paper)",
                            color: "var(--muted)",
                            borderColor: "var(--line)",
                          }
                    }
                  >
                    {r}
                  </button>
                );
              })}
            </div>
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Role">
              <input
                value={role}
                onChange={(e) => setRole(e.target.value)}
                placeholder="Designer"
                className="w-full rounded-[10px] bg-[var(--paper-2)] border border-[var(--line)] px-3 py-2 text-[14px] text-[var(--ink)] placeholder:text-[var(--muted-2)] focus:outline-none focus:border-[var(--terra)] transition"
              />
            </Field>
            <Field label="Lives in">
              <input
                value={livesIn}
                onChange={(e) => setLivesIn(e.target.value)}
                placeholder="Lisbon"
                className="w-full rounded-[10px] bg-[var(--paper-2)] border border-[var(--line)] px-3 py-2 text-[14px] text-[var(--ink)] placeholder:text-[var(--muted-2)] focus:outline-none focus:border-[var(--terra)] transition"
              />
            </Field>
          </div>

          <Field label="Color">
            <div className="flex items-center gap-3">
              {COLORS.map((c) => {
                const active = color === c.value;
                return (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => setColor(c.value)}
                    aria-label={`Color ${c.value}`}
                    className="relative w-7 h-7 rounded-full transition"
                    style={{
                      background: c.value,
                      boxShadow: active
                        ? `0 0 0 2.5px var(--paper), 0 0 0 4px ${c.value}`
                        : undefined,
                    }}
                  />
                );
              })}
            </div>
          </Field>

          <Field label="Contact">
            <div className="space-y-2">
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                type="email"
                placeholder="Email address"
                className="w-full rounded-[10px] bg-[var(--paper-2)] border border-[var(--line)] px-3 py-2 text-[14px] text-[var(--ink)] placeholder:text-[var(--muted-2)] focus:outline-none focus:border-[var(--terra)] transition"
              />
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                type="tel"
                placeholder="Phone number"
                className="w-full rounded-[10px] bg-[var(--paper-2)] border border-[var(--line)] px-3 py-2 text-[14px] text-[var(--ink)] placeholder:text-[var(--muted-2)] focus:outline-none focus:border-[var(--terra)] transition"
              />
            </div>
          </Field>

          <Field label="Notes">
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="How you met, what they care about, the things that come up every time you talk…"
              className="w-full rounded-[10px] bg-[var(--paper-2)] border border-[var(--line)] px-3 py-2 text-[14px] text-[var(--ink)] placeholder:text-[var(--muted-2)] focus:outline-none focus:border-[var(--terra)] resize-y transition leading-relaxed"
            />
            <p className="mt-1.5 text-[11.5px] text-[var(--muted)]">
              Optional. Anything you don&apos;t want to forget about them.
            </p>
          </Field>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[var(--line)] flex items-center justify-between gap-3 bg-[var(--paper-2)]">
          <span className="text-[12.5px] text-[var(--muted)]">
            {canSave ? "Ready to save." : "Give them a name to save."}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="life-btn life-btn-sm life-btn-ghost"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={save}
              disabled={pending || !canSave}
              className="life-btn life-btn-sm life-btn-primary"
            >
              Save
            </button>
          </div>
        </div>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <div className="text-[10.5px] uppercase tracking-[0.14em] font-semibold text-[var(--muted)] mb-2">
        {label}
      </div>
      {children}
    </label>
  );
}
