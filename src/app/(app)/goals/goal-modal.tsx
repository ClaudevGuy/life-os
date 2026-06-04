"use client";

import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { Plus, Target, X, Trash2, GripVertical } from "lucide-react";
import {
  captureItem,
  updateItem,
  deleteItem,
  type StoredItem,
} from "@/lib/store/items";
import { Portal } from "@/components/portal";
import {
  CATEGORIES,
  TIMEFRAMES,
  TIMEFRAME_BADGE,
  categoryColor,
  readGoal,
  newMilestoneId,
  type Metric,
  type Milestone,
  type Timeframe,
} from "@/lib/goals";

export function NewGoalButton() {
  const [open, setOpen] = useState(false);
  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="life-btn life-btn-sm life-btn-primary"
      >
        <Plus size={13} strokeWidth={2} />
        New goal
      </button>
    );
  }
  return <GoalModal existing={null} onClose={() => setOpen(false)} />;
}

export function GoalModal({
  existing,
  onClose,
}: {
  existing: StoredItem | null;
  onClose: () => void;
}) {
  const initial = existing ? readGoal(existing) : null;
  const [name, setName] = useState(existing?.title ?? "");
  const [identity, setIdentity] = useState(initial?.identity ?? "");
  const [category, setCategory] = useState(initial?.category ?? "Growth");
  const [timeframe, setTimeframe] = useState<Timeframe>(
    initial?.timeframe ?? "year",
  );
  const [metric, setMetric] = useState<Metric>(initial?.metric ?? "manual");
  const [progress, setProgress] = useState(initial?.progress ?? 0);
  const [current, setCurrent] = useState(
    initial?.current != null ? String(initial.current) : "",
  );
  const [target, setTarget] = useState(
    initial?.target != null ? String(initial.target) : "",
  );
  const [unit, setUnit] = useState(initial?.unit ?? "");
  const [milestones, setMilestones] = useState<Milestone[]>(
    initial?.milestones?.length
      ? initial.milestones
      : [{ id: newMilestoneId(), text: "", done: false }],
  );
  const [targetDate, setTargetDate] = useState(
    initial?.targetDate?.slice(0, 10) ?? "",
  );
  const [notes, setNotes] = useState(existing?.body ?? "");
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const accent = categoryColor(category);

  function setMilestone(id: string, text: string) {
    setMilestones((ms) => ms.map((m) => (m.id === id ? { ...m, text } : m)));
  }
  function addMilestone() {
    setMilestones((ms) => [...ms, { id: newMilestoneId(), text: "", done: false }]);
  }
  function removeMilestone(id: string) {
    setMilestones((ms) => ms.filter((m) => m.id !== id));
  }

  function save() {
    if (!name.trim()) {
      toast.error("Give your goal a name");
      return;
    }
    const meta: Record<string, unknown> = {
      timeframe,
      category,
      metric,
      identity: identity.trim() || undefined,
      targetDate: targetDate ? new Date(`${targetDate}T12:00:00`).toISOString() : undefined,
      achievedAt: initial?.achievedAt ?? null,
    };
    if (metric === "manual") {
      meta.progress = Math.max(0, Math.min(100, Math.round(progress)));
    } else if (metric === "number") {
      const t = Number(target);
      const c = Number(current || 0);
      if (!Number.isFinite(t) || t <= 0) {
        toast.error("Set a target number greater than 0");
        return;
      }
      meta.current = Number.isFinite(c) ? c : 0;
      meta.target = t;
      meta.unit = unit.trim() || undefined;
    } else {
      const cleaned = milestones
        .map((m) => ({ ...m, text: m.text.trim() }))
        .filter((m) => m.text);
      if (cleaned.length === 0) {
        toast.error("Add at least one milestone");
        return;
      }
      meta.milestones = cleaned;
    }

    startTransition(async () => {
      try {
        if (existing) {
          await updateItem(existing.id, {
            title: name.trim(),
            body: notes.trim() || null,
            metadata: meta,
          });
          toast.success("Goal updated");
        } else {
          await captureItem({
            kind: "goal",
            title: name.trim(),
            body: notes.trim() || null,
            status: "active",
            metadata: meta,
          });
          toast.success("Goal set");
        }
      } catch {
        toast.error("Couldn't save");
        return;
      }
      onClose();
    });
  }

  function remove() {
    if (!existing) return;
    if (!confirm(`Delete "${existing.title}"? This can't be undone.`)) return;
    startTransition(async () => {
      try {
        await deleteItem(existing.id);
        toast.success("Deleted");
        onClose();
      } catch {
        toast.error("Couldn't delete");
      }
    });
  }

  return (
    <Portal>
      <div
        className="fixed inset-0 z-50 flex items-start justify-center pt-[6vh] pb-8 px-4 bg-black/50 backdrop-blur-sm overflow-y-auto"
        onClick={onClose}
      >
        <div
          className="w-full max-w-lg rounded-[16px] border border-[var(--line-2)] bg-[var(--paper)] life-rise overflow-hidden"
          style={{ boxShadow: "var(--shadow-3)" }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="p-5 pb-3 flex items-start gap-3 border-b border-[var(--line)]">
            <div
              className="grid place-items-center w-9 h-9 rounded-[9px] shrink-0"
              style={{
                background: `color-mix(in oklch, ${accent} 16%, transparent)`,
                color: accent,
              }}
            >
              <Target size={15} strokeWidth={1.7} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[10.5px] uppercase tracking-[0.14em] font-semibold text-[var(--muted)]">
                {existing ? "Edit goal" : "New goal"}
              </div>
              <div className="mt-0.5 text-[17px] font-semibold tracking-[-0.015em] text-[var(--ink)] truncate">
                {name.trim() || "Untitled"}
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

          <div className="p-5 space-y-4">
            <Field label="Goal">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Run a half-marathon, Save $10k, Read 24 books…"
                autoFocus
                className={inputCls}
              />
            </Field>

            <Field
              label={
                <>
                  Identity{" "}
                  <span className="opacity-60 normal-case tracking-normal font-normal">
                    — who this makes you
                  </span>
                </>
              }
            >
              <input
                value={identity}
                onChange={(e) => setIdentity(e.target.value)}
                placeholder="I am someone who shows up for my body."
                className={inputCls}
              />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Life area">
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className={`${inputCls} appearance-none`}
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Horizon">
                <select
                  value={timeframe}
                  onChange={(e) => setTimeframe(e.target.value as Timeframe)}
                  className={`${inputCls} appearance-none`}
                >
                  {TIMEFRAMES.map((t) => (
                    <option key={t} value={t}>
                      {TIMEFRAME_BADGE[t]}
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            {/* Metric */}
            <Field label="Track progress by">
              <div className="grid grid-cols-3 gap-1 p-1 rounded-[10px] bg-[var(--paper-2)] border border-[var(--line)]">
                {(
                  [
                    ["manual", "Slider"],
                    ["number", "Number"],
                    ["milestones", "Milestones"],
                  ] as [Metric, string][]
                ).map(([m, label]) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMetric(m)}
                    className={`text-[12.5px] px-2 py-1.5 rounded-[7px] font-medium transition ${
                      metric === m
                        ? "bg-[var(--paper)] text-[var(--ink)]"
                        : "text-[var(--muted)] hover:text-[var(--ink)]"
                    }`}
                    style={metric === m ? { boxShadow: "var(--shadow-1)" } : undefined}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </Field>

            {metric === "manual" && (
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[12px] text-[var(--muted)]">Progress</span>
                  <span
                    className="text-[14px] font-semibold tabular-nums"
                    style={{ color: accent }}
                  >
                    {Math.round(progress)}%
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={progress}
                  onChange={(e) => setProgress(Number(e.target.value))}
                  className="w-full accent-[var(--terra)]"
                  style={{ accentColor: accent }}
                />
              </div>
            )}

            {metric === "number" && (
              <div className="grid grid-cols-3 gap-3">
                <Field label="Current">
                  <input
                    type="number"
                    inputMode="decimal"
                    value={current}
                    onChange={(e) => setCurrent(e.target.value)}
                    placeholder="0"
                    className={`${inputCls} font-mono tabular-nums`}
                  />
                </Field>
                <Field label="Target">
                  <input
                    type="number"
                    inputMode="decimal"
                    value={target}
                    onChange={(e) => setTarget(e.target.value)}
                    placeholder="100"
                    className={`${inputCls} font-mono tabular-nums`}
                  />
                </Field>
                <Field label="Unit">
                  <input
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    placeholder="$, kg, books"
                    className={inputCls}
                  />
                </Field>
              </div>
            )}

            {metric === "milestones" && (
              <Field label="Milestones">
                <div className="space-y-2">
                  {milestones.map((m, i) => (
                    <div key={m.id} className="flex items-center gap-2">
                      <GripVertical
                        size={14}
                        className="text-[var(--muted-2)] shrink-0"
                      />
                      <input
                        value={m.text}
                        onChange={(e) => setMilestone(m.id, e.target.value)}
                        placeholder={`Step ${i + 1}`}
                        className={`${inputCls} flex-1`}
                      />
                      <button
                        type="button"
                        onClick={() => removeMilestone(m.id)}
                        className="grid place-items-center w-8 h-8 rounded-[8px] text-[var(--muted-2)] hover:text-[var(--bad)] transition shrink-0"
                        aria-label="Remove milestone"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={addMilestone}
                    className="inline-flex items-center gap-1.5 text-[12.5px] font-medium text-[var(--terra)] hover:opacity-80 transition"
                  >
                    <Plus size={13} /> Add milestone
                  </button>
                </div>
              </Field>
            )}

            <div className="grid grid-cols-2 gap-3">
              <Field
                label={
                  <>
                    Target date{" "}
                    <span className="opacity-60 normal-case tracking-normal font-normal">
                      (optional)
                    </span>
                  </>
                }
              >
                <input
                  type="date"
                  value={targetDate}
                  onChange={(e) => setTargetDate(e.target.value)}
                  className={`${inputCls} tabular-nums`}
                />
              </Field>
            </div>

            <Field
              label={
                <>
                  Why it matters{" "}
                  <span className="opacity-60 normal-case tracking-normal font-normal">
                    (optional)
                  </span>
                </>
              }
            >
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                placeholder="The reason behind this goal."
                className={`${inputCls} resize-y leading-relaxed`}
              />
            </Field>
          </div>

          <div className="px-5 py-3 border-t border-[var(--line)] bg-[var(--paper-2)] flex items-center justify-between gap-3">
            {existing ? (
              <button
                type="button"
                onClick={remove}
                disabled={pending}
                className="inline-flex items-center gap-1.5 text-[12px] text-[var(--muted)] hover:text-[var(--bad)] transition"
              >
                <Trash2 size={12} strokeWidth={1.6} />
                Delete
              </button>
            ) : (
              <span />
            )}
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
                disabled={pending}
                className="life-btn life-btn-sm life-btn-primary"
              >
                {existing ? "Save" : "Set goal"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </Portal>
  );
}

const inputCls =
  "w-full rounded-[10px] bg-[var(--paper-2)] border border-[var(--line)] px-3 py-2 text-[14px] text-[var(--ink)] placeholder:text-[var(--muted-2)] focus:outline-none focus:border-[var(--terra)] transition";

function Field({
  label,
  children,
}: {
  label: React.ReactNode;
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
