"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/store/db";
import type { StoredItem } from "@/lib/store/items";
import { FolderKanban, Folder } from "lucide-react";
import Link from "next/link";
import { NewProject } from "./new-project";

export default function ProjectsPage() {
  const rows =
    useLiveQuery(async () => {
      const all = await db.items.toArray();
      return all.filter((i) => i.kind === "project" || i.kind === "area");
    }) ?? [];

  const projects = rows.filter((r) => r.kind === "project");
  const areas = rows.filter((r) => r.kind === "area");

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex items-baseline justify-between">
        <div>
          <h1 className="life-h1 inline-flex items-center gap-2">
            <FolderKanban size={18} className="text-[var(--accent)]" />
            Projects & Areas
          </h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            PARA. Projects have endings. Areas are ongoing.
          </p>
        </div>
        <NewProject />
      </div>

      <section className="mt-8">
        <h2 className="text-[10px] uppercase tracking-[0.14em] text-[var(--text-faint)] mb-3">
          Projects · {projects.length}
        </h2>
        {projects.length === 0 ? (
          <div className="life-card p-6 text-sm text-[var(--text-faint)] text-center">
            No active projects. Spin one up with the button above.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 life-stagger">
            {projects.map((p) => (
              <ProjectCard key={p.id} project={p} />
            ))}
          </div>
        )}
      </section>

      <section className="mt-10">
        <h2 className="text-[10px] uppercase tracking-[0.14em] text-[var(--text-faint)] mb-3">
          Areas · {areas.length}
        </h2>
        {areas.length === 0 ? (
          <div className="life-card p-6 text-sm text-[var(--text-faint)] text-center">
            No areas yet. Areas are ongoing parts of life (Health, Work, Relationships, Finances…).
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 life-stagger">
            {areas.map((a) => (
              <AreaCard key={a.id} area={a} />
            ))}
          </div>
        )}
      </section>
    </div>
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
      className="life-card life-card-hover p-4 block"
    >
      <div className="flex items-start justify-between gap-2">
        <Folder size={14} className="text-[var(--kind-project)] mt-0.5 shrink-0" />
        <span className="text-xs text-[var(--text-faint)] tabular-nums">
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
      <div className="mt-3 h-1 rounded-full bg-[var(--border-soft)] overflow-hidden">
        <div
          className="h-full bg-[var(--accent)] rounded-full"
          style={{ width: `${progress}%` }}
        />
      </div>
    </Link>
  );
}

function AreaCard({ area }: { area: StoredItem }) {
  return (
    <Link href={`/items/${area.id}`} className="life-card life-card-hover p-4 block">
      <div className="flex items-center gap-2">
        <Folder size={14} className="text-[var(--kind-area)]" />
        <h3 className="text-sm font-medium text-[var(--text)] truncate">
          {area.title}
        </h3>
      </div>
      {area.summary && (
        <p className="mt-1.5 text-xs text-[var(--text-muted)] line-clamp-2 leading-relaxed">
          {area.summary}
        </p>
      )}
    </Link>
  );
}
