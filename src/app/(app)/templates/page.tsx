import { LayoutTemplate, FileText } from "lucide-react";
import { TemplateCard } from "./template-card";

export const metadata = { title: "Templates · Life OS" };

const TEMPLATES = [
  {
    id: "meeting-notes",
    kind: "note" as const,
    title: "Meeting notes",
    description: "Structured notes for a 1:1 or team sync.",
    body: `## Who
-

## Agenda
1.
2.
3.

## Notes


## Action items
- [ ]
- [ ]

## Next time
`,
  },
  {
    id: "weekly-review",
    kind: "note" as const,
    title: "Weekly review",
    description: "Friday reflection on what shipped, what stalled, what's next.",
    body: `## What shipped this week


## What stalled, and why


## What I learned


## Top priority for next week
1.
2.
3.
`,
  },
  {
    id: "decision-record",
    kind: "decision" as const,
    title: "Decision record",
    description: "Capture a decision with reasoning, alternatives, and review date.",
    body: `## Question


## Context


## Options considered
1.
2.
3.

## Decision


## Why this over the others


## How will I know if it was right
`,
  },
  {
    id: "project-brief",
    kind: "note" as const,
    title: "Project brief",
    description: "A one-pager for any project you're spinning up.",
    body: `## Outcome


## Constraints


## Success metric


## First milestone


## Open questions
-
-
`,
  },
  {
    id: "reading-log",
    kind: "highlight" as const,
    title: "Reading log",
    description: "Quote-first, with what you took away.",
    body: `> Quote here

**From:** Title · Author

**Why it matters:**

**Links to:**
- [[ ]]
`,
  },
  {
    id: "daily-plan",
    kind: "note" as const,
    title: "Daily plan",
    description: "Three priorities, a top-of-mind list, and an evening prompt.",
    body: `## Big three
1.
2.
3.

## Top of mind


## Evening prompt
- What went well today?
- What would I redo?
`,
  },
];

export default function TemplatesPage() {
  return (
    <div className="p-8 max-w-4xl">
      <div className="flex items-baseline justify-between">
        <div>
          <h1 className="life-h1 inline-flex items-center gap-2">
            <LayoutTemplate size={18} className="text-[var(--accent)]" />
            Templates
          </h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            One-click starters for the notes you keep retyping.
          </p>
        </div>
        <span className="text-xs text-[var(--text-faint)]">
          {TEMPLATES.length} templates
        </span>
      </div>

      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-3 life-stagger">
        {TEMPLATES.map((t) => (
          <TemplateCard key={t.id} template={t} />
        ))}
      </div>

      <div className="mt-10 flex items-center gap-2 text-xs text-[var(--text-faint)]">
        <FileText size={12} />
        Templates currently insert into a new capture. Saved templates are phase 2.
      </div>
    </div>
  );
}
