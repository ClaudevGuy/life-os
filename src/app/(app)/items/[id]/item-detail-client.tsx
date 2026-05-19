"use client";

import { useItem } from "@/lib/store/items";
import { notFound } from "next/navigation";
import { ExternalLink, ArrowLeft, Pin, Calendar } from "lucide-react";
import Link from "next/link";
import { Backlinks } from "@/components/backlinks";
import { ItemActions } from "@/components/item-actions";
import { InlineTitle, InlineBody } from "@/components/inline-edit";
import {
  DecisionOutcomeEditor,
  GoalProgressEditor,
  BookmarkStateEditor,
} from "@/components/kind-editors";
import { RecentTracker } from "@/components/recently-viewed";
import { ProjectRollUp } from "@/components/project-roll-up";
import { PhotoGallery } from "@/components/photo-gallery";

export function ItemDetailClient({ id }: { id: string }) {
  const item = useItem(id);

  if (item === undefined) return null; // loading
  if (item === null) {
    notFound();
  }

  const meta = (item.metadata ?? {}) as Record<string, unknown>;

  return (
    <div className="px-8 py-10 max-w-3xl">
      <div className="flex items-center justify-between mb-8">
        <Link
          href={backFor(item.kind)}
          className="inline-flex items-center gap-1.5 text-xs text-[var(--text-faint)] hover:text-[var(--text)] transition"
        >
          <ArrowLeft size={12} /> back to {backForLabel(item.kind)}
        </Link>
        <ItemActions
          id={item.id}
          isPinned={item.isPinned}
          status={item.status}
          backHref={backFor(item.kind)}
        />
      </div>

      <div className="flex items-center gap-2 mb-3">
        <span
          className="w-1.5 h-1.5 rounded-full"
          style={{ background: `var(--kind-${item.kind})` }}
        />
        <span className="text-[10px] uppercase tracking-[0.14em] text-[var(--text-faint)]">
          {item.kind}
        </span>
        {item.topic && (
          <Link
            href={`/tags`}
            className="text-[10px] uppercase tracking-[0.14em] text-[var(--text-faint)] hover:text-[var(--accent)]"
          >
            · #{item.topic}
          </Link>
        )}
        <span className="text-[10px] uppercase tracking-[0.14em] text-[var(--text-faint)]">
          · {item.status}
        </span>
        {item.isPinned && (
          <span className="ml-1 inline-flex items-center gap-1 text-[10px] uppercase tracking-[0.14em] text-[var(--accent)]">
            <Pin size={10} className="fill-[var(--accent)]" /> pinned
          </span>
        )}
      </div>

      <InlineTitle id={item.id} value={item.title} />

      {item.sourceUrl && (
        <a
          href={item.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 inline-flex items-center gap-1.5 text-xs text-[var(--text-faint)] hover:text-[var(--accent)] transition"
        >
          <ExternalLink size={11} />
          {new URL(item.sourceUrl).hostname.replace(/^www\./, "")}
        </a>
      )}

      <div className="mt-6 flex flex-wrap items-center gap-4 text-[11px] text-[var(--text-faint)]">
        <span className="inline-flex items-center gap-1.5">
          <Calendar size={11} />
          captured{" "}
          {new Date(item.capturedAt).toLocaleDateString(undefined, {
            month: "short",
            day: "numeric",
            year: "numeric",
          })}
        </span>
        {item.estMinutes != null && (
          <span>· {item.estMinutes} min read</span>
        )}
        {item.difficulty && <span>· {item.difficulty}</span>}
      </div>

      {item.summary && (
        <p className="mt-8 text-[17px] text-[var(--text)] leading-relaxed font-medium">
          {item.summary}
        </p>
      )}

      {item.keyPoints && item.keyPoints.length > 0 && (
        <ul className="mt-6 space-y-2">
          {item.keyPoints.map((p, i) => (
            <li
              key={i}
              className="text-sm text-[var(--text-muted)] pl-5 relative leading-relaxed"
            >
              <span className="absolute left-0 top-2 w-1.5 h-1.5 rounded-full bg-[var(--accent)]" />
              {p}
            </li>
          ))}
        </ul>
      )}

      <InlineBody id={item.id} value={item.body} />

      <KindSpecific item={item} meta={meta} />

      <PhotoGallery
        itemId={item.id}
        metadata={meta}
        emptyHint={emptyHintForKind(item.kind)}
      />

      {item.kind === "project" && <ProjectRollUp projectId={item.id} />}

      <Backlinks
        item={{ id: item.id, title: item.title, kind: item.kind }}
      />
      <RecentTracker id={item.id} title={item.title} kind={item.kind} />
    </div>
  );
}

function backFor(kind: string) {
  return (
    {
      bookmark: "/inbox",
      note: "/notes",
      task: "/tasks",
      decision: "/decisions",
      person: "/people",
      journal: "/today",
      habit: "/habits",
      goal: "/goals",
      highlight: "/highlights",
      idea: "/inbox",
      voice: "/inbox",
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
    case "bookmark":
      return "Save a preview image";
    default:
      return "Drop an image, click, or paste (⌘V)";
  }
}

function backForLabel(kind: string) {
  return (
    {
      bookmark: "Inbox",
      note: "Notes",
      task: "Tasks",
      decision: "Decisions",
      person: "People",
      journal: "Today",
      habit: "Habits",
      goal: "Goals",
      highlight: "Highlights",
      idea: "Inbox",
      voice: "Inbox",
    } as Record<string, string>
  )[kind] ?? "Inbox";
}

function KindSpecific({
  item,
  meta,
}: {
  item: { id: string; kind: string };
  meta: Record<string, unknown>;
}) {
  if (item.kind === "decision") {
    return <DecisionOutcomeEditor id={item.id} metadata={meta} />;
  }
  if (item.kind === "goal") {
    return <GoalProgressEditor id={item.id} metadata={meta} />;
  }
  if (item.kind === "bookmark") {
    return <BookmarkStateEditor id={item.id} metadata={meta} />;
  }
  if (item.kind === "habit") {
    const checkins = (meta.checkins as string[]) ?? [];
    return (
      <div className="mt-10 life-card p-5">
        <h3 className="text-[10px] uppercase tracking-[0.14em] text-[var(--text-faint)] mb-3">
          Streak history
        </h3>
        <div className="text-sm text-[var(--text-muted)]">
          {checkins.length} total check-ins · cadence {(meta.cadence as string) ?? "daily"}
        </div>
      </div>
    );
  }
  if (item.kind === "journal") {
    return (
      <div className="mt-10 life-card p-5">
        <h3 className="text-[10px] uppercase tracking-[0.14em] text-[var(--text-faint)] mb-3">
          State
        </h3>
        <dl className="grid grid-cols-2 gap-3 text-sm">
          <Field label="Energy" value={String(meta.energy ?? "—") + " / 5"} />
          <Field label="Mood" value={(meta.mood as string) ?? "—"} />
        </dl>
      </div>
    );
  }
  if (item.kind === "person") {
    return (
      <div className="mt-10 life-card p-5">
        <h3 className="text-[10px] uppercase tracking-[0.14em] text-[var(--text-faint)] mb-3">
          Person
        </h3>
        <dl className="grid grid-cols-2 gap-3 text-sm">
          <Field label="Handle" value={(meta.handle as string) ?? "—"} />
          <Field
            label="Last spoke"
            value={
              meta.lastContactedAt
                ? new Date(meta.lastContactedAt as string).toLocaleDateString()
                : "—"
            }
          />
        </dl>
      </div>
    );
  }
  return null;
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[10px] uppercase tracking-[0.14em] text-[var(--text-faint)]">
        {label}
      </dt>
      <dd className="mt-1 text-[var(--text)]">{value}</dd>
    </div>
  );
}
