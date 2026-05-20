"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/store/db";
import type { StoredItem } from "@/lib/store/items";
import { FolderKanban, Folder, Compass } from "lucide-react";
import Link from "next/link";
import { NewProject } from "./new-project";
import { EmptyState, PageHeader } from "@/components/empty-state";

export default function ProjectsPage() {
  const rows =
    useLiveQuery(async () => {
      const all = await db.items.toArray();
      return all.filter((i) => i.kind === "project" || i.kind === "area");
    }) ?? [];

  const projects = rows.filter((r) => r.kind === "project");
  const areas = rows.filter((r) => r.kind === "area");
  const isEmpty = projects.length === 0 && areas.length === 0;

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <PageHeader
        icon={FolderKanban}
        title="Projects & Areas"
        subtitle="PARA. Projects have endings. Areas are ongoing."
        tint="var(--kind-project)"
        action={<NewProject />}
      />

      {isEmpty ? (
        <EmptyState
          icon={FolderKanban}
          tint="var(--kind-project)"
          title="Organize life into projects and areas."
          body="A project has a finish line (Ship the redesign, Move apartments). An area is ongoing (Health, Finances, Relationships). Both anchor everything else."
          actions={[{ label: "New project", onClickKey: "c" }]}
        />
      ) : (
        <>
          <section className="mt-8">
            <SectionHeader
              icon={Folder}
              label="Projects"
              count={projects.length}
              tint="var(--kind-project)"
            />
            {projects.length === 0 ? (
              <div className="mt-3 life-card p-6 text-center">
                <div className="text-sm text-[var(--text-muted)]">
                  No active projects. Spin one up with{" "}
                  <kbd className="font-mono text-[10px] bg-[var(--bg-rail)] border border-[var(--border-soft)] rounded px-1.5 py-0.5">
                    c
                  </kbd>
                  .
                </div>
              </div>
            ) : (
              <div className="mt-3 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 life-stagger">
                {projects.map((p) => (
                  <ProjectCard key={p.id} project={p} />
                ))}
              </div>
            )}
          </section>

          <section className="mt-10">
            <SectionHeader
              icon={Compass}
              label="Areas"
              count={areas.length}
              tint="var(--kind-area)"
            />
            {areas.length === 0 ? (
              <div className="mt-3 life-card p-6 text-center text-sm text-[var(--text-muted)]">
                Areas are ongoing parts of life — Health, Work, Relationships, Finances.
              </div>
            ) : (
              <div className="mt-3 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 life-stagger">
                {areas.map((a) => (
                  <AreaCard key={a.id} area={a} />
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}

function SectionHeader({
  icon: Icon,
  label,
  count,
  tint,
}: {
  icon: React.ComponentType<{
    size?: number;
    className?: string;
    style?: React.CSSProperties;
  }>;
  label: string;
  count: number;
  tint: string;
}) {
  return (
    <h2 className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.14em] text-[var(--text-muted)] font-medium">
      <span
        className="w-2 h-2 rounded-full"
        style={{ background: tint, boxShadow: `0 0 6px ${tint}66` }}
      />
      <Icon size={11} style={{ color: tint }} />
      {label}
      <span className="text-[var(--text-faint)] font-mono">·</span>
      <span className="tabular-nums text-[var(--text-muted)]">{count}</span>
    </h2>
  );
}

function ProjectCard({ project }: { project: StoredItem }) {
  const meta = (project.metadata ?? {}) as {
    targetDate?: string;
    progress?: number;
    itemCount?: number;
  };
  const progress = Math.max(0, Math.min(100, meta.progress ?? 0));
  return (
    <Link
      href={`/items/${project.id}`}
      className="life-card life-card-hover p-4 block relative overflow-hidden"
    >
      <span
        aria-hidden
        className="absolute left-0 top-3 bottom-3 w-[2px] rounded-r opacity-60"
        style={{ background: "var(--kind-project)" }}
      />
      <div className="pl-2">
        <div className="flex items-start justify-between gap-2">
          <Folder
            size={14}
            className="mt-0.5 shrink-0"
            style={{ color: "var(--kind-project)" }}
          />
          <span className="text-xs text-[var(--text-faint)] tabular-nums font-mono">
            {progress}%
          </span>
        </div>
        <h3 className="mt-2 text-sm font-medium text-[var(--text)] truncate">
          {project.title}
        </h3>
        {project.summary && (
          <p className="mt-1 text-xs text-[var(--text-muted)] line-clamp-2 leading-relaxed">
            {project.summary}
          </p>
        )}
        <div className="mt-3 h-1.5 rounded-full bg-[var(--border-soft)] overflow-hidden">
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: `${progress}%`,
              background: "var(--accent)",
              boxShadow:
                progress > 0
                  ? "0 0 8px color-mix(in oklch, var(--accent) 50%, transparent)"
                  : undefined,
            }}
          />
        </div>
      </div>
    </Link>
  );
}

function AreaCard({ area }: { area: StoredItem }) {
  return (
    <Link
      href={`/items/${area.id}`}
      className="life-card life-card-hover p-4 block relative overflow-hidden"
    >
      <span
        aria-hidden
        className="absolute left-0 top-3 bottom-3 w-[2px] rounded-r opacity-60"
        style={{ background: "var(--kind-area)" }}
      />
      <div className="pl-2">
        <div className="flex items-center gap-2">
          <Compass size={14} style={{ color: "var(--kind-area)" }} />
          <h3 className="text-sm font-medium text-[var(--text)] truncate">
            {area.title}
          </h3>
        </div>
        {area.summary && (
          <p className="mt-1.5 text-xs text-[var(--text-muted)] line-clamp-2 leading-relaxed">
            {area.summary}
          </p>
        )}
      </div>
    </Link>
  );
}
