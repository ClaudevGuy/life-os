"use client";

import { useItem } from "@/lib/store/items";
import { notFound } from "next/navigation";
import { ExternalLink, ArrowLeft, Pin, Calendar, Hash, Clock, Sparkles } from "lucide-react";
import Link from "next/link";
import { Backlinks } from "@/components/backlinks";
import { ItemActions } from "@/components/item-actions";
import { InlineTitle, InlineBody } from "@/components/inline-edit";
import {
  DecisionOutcomeEditor,
  GoalProgressEditor,
} from "@/components/kind-editors";
import { RecentTracker } from "@/components/recently-viewed";
import { ProjectRollUp } from "@/components/project-roll-up";
import { PhotoGallery } from "@/components/photo-gallery";
import { FileAttachment } from "@/components/file-attachment";

export function ItemDetailClient({ id }: { id: string }) {
  const item = useItem(id);

  if (item === undefined) return null; // loading
  if (item === null) {
    notFound();
  }

  const meta = (item.metadata ?? {}) as Record<string, unknown>;
  const isReminder = item.kind === "task" && meta.reminder === true;
  const displayKind = isReminder ? "reminder" : item.kind;
  const backHref = isReminder ? "/calendar" : backFor(item.kind);
  const backLabel = isReminder ? "Calendar" : backForLabel(item.kind);
  const tint = `var(--kind-${item.kind})`;

  return (
    <div className="px-8 py-8 max-w-4xl mx-auto">
      {/* Top breadcrumb */}
      <div className="flex items-center justify-between mb-5">
        <Link
          href={backHref}
          className="inline-flex items-center gap-1.5 text-[12px] text-[var(--text-faint)] hover:text-[var(--text)] transition"
        >
          <ArrowLeft size={13} />
          <span>Back to {backLabel}</span>
        </Link>
        <ItemActions
          id={item.id}
          isPinned={item.isPinned}
          status={item.status}
          backHref={backHref}
        />
      </div>

      {/* Hero card */}
      <header className="life-card relative overflow-hidden life-rise">
        <div
          aria-hidden
          className="absolute inset-x-0 top-0 h-1 pointer-events-none"
          style={{
            background: `linear-gradient(90deg, transparent 0%, ${tint} 30%, ${tint} 70%, transparent 100%)`,
          }}
        />
        <div
          aria-hidden
          className="absolute inset-0 opacity-[0.06] pointer-events-none"
          style={{
            background: `radial-gradient(ellipse 60% 50% at 50% -10%, ${tint}, transparent 60%)`,
          }}
        />
        <div className="relative px-8 pt-9 pb-7">
          {/* meta chips row */}
          <div className="flex items-center gap-2 flex-wrap mb-5">
            <KindChip kind={displayKind} tint={tint} />
            <StatusChip status={item.status} />
            {item.topic && <TopicChip topic={item.topic} />}
            {item.isPinned && (
              <span className="inline-flex items-center gap-1 rounded-full bg-[var(--accent-soft)] text-[var(--accent)] px-2 py-0.5 text-[10px] uppercase tracking-[0.12em] font-medium">
                <Pin size={9} className="fill-[var(--accent)]" /> Pinned
              </span>
            )}
          </div>

          <InlineTitle id={item.id} value={item.title} />

          {item.summary && (
            <p className="mt-4 text-[15.5px] text-[var(--text-muted)] leading-relaxed max-w-2xl">
              {item.summary}
            </p>
          )}

          {/* Hero footer: date, source, stats */}
          <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-[12px] text-[var(--text-faint)]">
            <span className="inline-flex items-center gap-1.5">
              <Calendar size={12} />
              {new Date(item.capturedAt).toLocaleDateString(undefined, {
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            </span>
            {item.estMinutes != null && (
              <span className="inline-flex items-center gap-1.5">
                <Clock size={12} />
                {item.estMinutes} min read
              </span>
            )}
            {item.difficulty && (
              <span className="inline-flex items-center gap-1.5">
                <Sparkles size={12} />
                {item.difficulty}
              </span>
            )}
            {item.sourceUrl && (
              <a
                href={item.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 hover:text-[var(--accent)] transition"
              >
                <ExternalLink size={12} />
                {safeHost(item.sourceUrl)}
              </a>
            )}
          </div>
        </div>
      </header>

      {/* Key points */}
      {item.keyPoints && item.keyPoints.length > 0 && (
        <section
          className="life-card mt-5 p-6 life-rise"
          style={{ animationDelay: "80ms" }}
        >
          <h3 className="text-[10px] uppercase tracking-[0.14em] text-[var(--text-faint)] mb-3 inline-flex items-center gap-2">
            <Sparkles size={11} className="text-[var(--accent)]" />
            Key points
          </h3>
          <ul className="space-y-2.5">
            {item.keyPoints.map((p, i) => (
              <li
                key={i}
                className="text-[14px] text-[var(--text-muted)] pl-5 relative leading-relaxed"
              >
                <span
                  className="absolute left-0 top-2 w-1.5 h-1.5 rounded-full"
                  style={{ background: tint }}
                />
                {p}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Body */}
      <section className="life-card mt-5 life-rise" style={{ animationDelay: "120ms" }}>
        <div className="px-6 py-3 border-b border-[var(--border-soft)] text-[10px] uppercase tracking-[0.14em] text-[var(--text-faint)]">
          Body
        </div>
        <div className="px-6 py-5">
          <InlineBody id={item.id} value={item.body} />
        </div>
      </section>

      {item.kind === "file" && (
        <div className="mt-5 life-rise" style={{ animationDelay: "160ms" }}>
          <FileAttachment itemId={item.id} metadata={meta} />
        </div>
      )}

      <KindSpecific item={item} meta={meta} tint={tint} />

      <section className="life-card mt-5 p-6 life-rise" style={{ animationDelay: "200ms" }}>
        <PhotoGallery
          itemId={item.id}
          metadata={meta}
          emptyHint={emptyHintForKind(item.kind)}
        />
      </section>

      {item.kind === "project" && (
        <div className="mt-5 life-rise" style={{ animationDelay: "240ms" }}>
          <ProjectRollUp projectId={item.id} />
        </div>
      )}

      <div className="mt-5 life-rise" style={{ animationDelay: "280ms" }}>
        <Backlinks
          item={{ id: item.id, title: item.title, kind: item.kind }}
        />
      </div>
      <RecentTracker id={item.id} title={item.title} kind={item.kind} />
    </div>
  );
}

function safeHost(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function KindChip({ kind, tint }: { kind: string; tint: string }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] uppercase tracking-[0.14em] font-semibold border"
      style={{
        background: `color-mix(in oklch, ${tint} 14%, transparent)`,
        borderColor: `color-mix(in oklch, ${tint} 35%, transparent)`,
        color: tint,
      }}
    >
      <span
        className="w-1.5 h-1.5 rounded-full"
        style={{ background: tint }}
      />
      {kind}
    </span>
  );
}

function StatusChip({ status }: { status: string }) {
  return (
    <span className="inline-flex items-center rounded-full border border-[var(--border-soft)] bg-[var(--bg-card)] px-2.5 py-1 text-[10px] uppercase tracking-[0.14em] font-medium text-[var(--text-muted)]">
      {status}
    </span>
  );
}

function TopicChip({ topic }: { topic: string }) {
  return (
    <Link
      href="/tags"
      className="inline-flex items-center gap-1 rounded-full border border-[var(--border-soft)] bg-[var(--bg-card)] px-2.5 py-1 text-[10px] uppercase tracking-[0.14em] font-medium text-[var(--text-muted)] hover:text-[var(--accent)] hover:border-[var(--accent)] transition"
    >
      <Hash size={9} />
      {topic}
    </Link>
  );
}

function backFor(kind: string) {
  return (
    {
      note: "/notes",
      task: "/tasks",
      decision: "/decisions",
      person: "/people",
      journal: "/today",
      habit: "/habits",
      goal: "/goals",
      highlight: "/highlights",
      voice: "/inbox",
      file: "/files",
    } as Record<string, string>
  )[kind] ?? "/inbox";
}

function emptyHintForKind(kind: string): string {
  switch (kind) {
    case "journal":
      return "Drop a photo of the day, paste (⌘V), or click";
    case "person":
      return "Drop an avatar or click to upload";
    case "highlight":
      return "Photo of the page, book cover, or context";
    default:
      return "Drop an image, click, or paste (⌘V)";
  }
}

function backForLabel(kind: string) {
  return (
    {
      note: "Notes",
      task: "Tasks",
      decision: "Decisions",
      person: "People",
      journal: "Today",
      habit: "Habits",
      goal: "Goals",
      highlight: "Highlights",
      voice: "Inbox",
      file: "Files",
    } as Record<string, string>
  )[kind] ?? "Inbox";
}

function KindSpecific({
  item,
  meta,
  tint,
}: {
  item: { id: string; kind: string };
  meta: Record<string, unknown>;
  tint: string;
}) {
  if (item.kind === "decision") {
    return (
      <div className="mt-5 life-rise" style={{ animationDelay: "180ms" }}>
        <DecisionOutcomeEditor id={item.id} metadata={meta} />
      </div>
    );
  }
  if (item.kind === "goal") {
    return (
      <div className="mt-5 life-rise" style={{ animationDelay: "180ms" }}>
        <GoalProgressEditor id={item.id} metadata={meta} />
      </div>
    );
  }
  if (item.kind === "habit") {
    const checkins = (meta.checkins as string[]) ?? [];
    const cadence = (meta.cadence as string) ?? "daily";
    return (
      <KindCard
        title="Streak history"
        tint={tint}
        delay={180}
        fields={[
          { label: "Total check-ins", value: String(checkins.length) },
          { label: "Cadence", value: cadence },
        ]}
      />
    );
  }
  if (item.kind === "journal") {
    return (
      <KindCard
        title="State"
        tint={tint}
        delay={180}
        fields={[
          { label: "Energy", value: `${String(meta.energy ?? "—")} / 5` },
          { label: "Mood", value: (meta.mood as string) ?? "—" },
        ]}
      />
    );
  }
  if (item.kind === "person") {
    return (
      <KindCard
        title="Person"
        tint={tint}
        delay={180}
        fields={[
          { label: "Handle", value: (meta.handle as string) ?? "—" },
          {
            label: "Last spoke",
            value: meta.lastContactedAt
              ? new Date(meta.lastContactedAt as string).toLocaleDateString()
              : "—",
          },
        ]}
      />
    );
  }
  return null;
}

function KindCard({
  title,
  tint,
  delay,
  fields,
}: {
  title: string;
  tint: string;
  delay: number;
  fields: Array<{ label: string; value: string }>;
}) {
  return (
    <section
      className="life-card mt-5 overflow-hidden life-rise"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div
        aria-hidden
        className="h-px"
        style={{ background: `linear-gradient(90deg, transparent, ${tint}, transparent)` }}
      />
      <div className="px-6 pt-5 pb-6">
        <h3 className="text-[10px] uppercase tracking-[0.14em] text-[var(--text-faint)] mb-4">
          {title}
        </h3>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-4">
          {fields.map((f) => (
            <div key={f.label}>
              <dt className="text-[10px] uppercase tracking-[0.14em] text-[var(--text-faint)]">
                {f.label}
              </dt>
              <dd className="mt-1.5 text-[15px] text-[var(--text)] font-medium">
                {f.value}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
