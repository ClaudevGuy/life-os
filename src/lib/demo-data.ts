import type { Item } from "@/db/schema";

const now = Date.now();
const hours = (n: number) => new Date(now - n * 60 * 60 * 1000);
const days = (n: number) => new Date(now - n * 24 * 60 * 60 * 1000);

function make(partial: Partial<Item> & { id: string; kind: Item["kind"] }): Item {
  return {
    id: partial.id,
    userId: "demo-user",
    kind: partial.kind,
    title: partial.title ?? null,
    body: partial.body ?? null,
    sourceUrl: partial.sourceUrl ?? null,
    capturedVia: partial.capturedVia ?? "web",
    capturedAt: partial.capturedAt ?? new Date(),
    status: partial.status ?? "inbox",
    isPinned: partial.isPinned ?? false,
    metadata: partial.metadata ?? {},
    rawText: partial.rawText ?? null,
    summary: partial.summary ?? null,
    keyPoints: partial.keyPoints ?? null,
    topic: partial.topic ?? null,
    estMinutes: partial.estMinutes ?? null,
    difficulty: partial.difficulty ?? null,
    embedding: partial.embedding ?? null,
    createdAt: partial.createdAt ?? new Date(),
    updatedAt: partial.updatedAt ?? new Date(),
  } as Item;
}

export const DEMO_ITEMS: Item[] = [
  // --- Bookmarks
  make({
    id: "d-bm-1",
    kind: "bookmark",
    title: "Building durable AI workflows with Workflow DevKit",
    summary:
      "Vercel's runtime for long-running AI agents — pauseable, resumable, crash-safe orchestration with a Next.js-native DX.",
    keyPoints: [
      "use workflow + use step directives",
      "DurableAgent wraps the AI SDK",
      "Hooks pause until external events arrive",
    ],
    topic: "agent-runtime",
    sourceUrl: "https://useworkflow.dev",
    capturedAt: hours(2),
    estMinutes: 12,
    difficulty: "medium",
    isPinned: true,
  }),
  make({
    id: "d-bm-2",
    kind: "bookmark",
    title: "The compounding returns of writing things down",
    summary:
      "Argues that a personal knowledge graph beats prompt engineering — your context becomes the moat.",
    topic: "second-brain",
    sourceUrl: "https://every.to/p/the-knowledge-economy",
    capturedAt: hours(7),
    estMinutes: 8,
  }),
  make({
    id: "d-bm-3",
    kind: "bookmark",
    title: "Reeder 5: the calmest reading experience",
    summary: "Three-pane interfaces still beat infinite scroll. A study in restraint.",
    topic: "design",
    sourceUrl: "https://reederapp.com",
    capturedAt: days(1),
    estMinutes: 4,
  }),

  // --- Notes
  make({
    id: "d-nt-1",
    kind: "note",
    status: "active",
    title: "What I'd want from a 'real' life OS",
    body: `Three problems no app nails:
1. **Capture friction** — even one tap is too many.
2. **Resurfacing** — saved ≠ remembered.
3. **Integration** — my AI tools can't see what I've saved.

The fix: one polymorphic store, an open API, AI that re-reads your old saves when relevant.`,
    summary:
      "The three problems every knowledge app falls short on, and the spine of a solution.",
    topic: "product",
    capturedAt: days(2),
    isPinned: true,
    metadata: { projectId: "d-pr-1" },
  }),
  make({
    id: "d-nt-2",
    kind: "note",
    status: "active",
    title: "Conversation with Maya re: agent UX",
    body: `Maya thinks the killer agent UX is "show me what you're about to do, then do it". Confirmation > full autonomy. Worth testing in v2.`,
    topic: "agent-ux",
    capturedAt: days(3),
  }),
  make({
    id: "d-nt-3",
    kind: "note",
    status: "active",
    title: "Daily standup with myself",
    body: `What's stuck? Capture flow on mobile.
What moved? Auth + schema shipped.
What's next? Voice capture, real markdown, agent fleet.`,
    topic: "process",
    capturedAt: hours(20),
  }),

  // --- Tasks
  make({
    id: "d-tk-1",
    kind: "task",
    status: "active",
    title: "Wire up iOS Shortcut for voice capture",
    capturedAt: hours(5),
    metadata: {
      dueDate: days(-1).toISOString(),
      priority: "high",
      completedAt: null,
      projectId: "d-pr-1",
    },
  }),
  make({
    id: "d-tk-1a",
    kind: "task",
    status: "active",
    title: "Build /api/v1/voice endpoint",
    capturedAt: hours(5),
    metadata: { priority: "high", parentId: "d-tk-1", completedAt: null },
  }),
  make({
    id: "d-tk-1b",
    kind: "task",
    status: "active",
    title: "Test on iPhone with Shortcut → bearer token",
    capturedAt: hours(5),
    metadata: { priority: "high", parentId: "d-tk-1", completedAt: null },
  }),
  make({
    id: "d-tk-2",
    kind: "task",
    status: "active",
    title: "Draft week-in-review template",
    capturedAt: hours(30),
    metadata: {
      dueDate: days(-3).toISOString(),
      priority: "medium",
      completedAt: null,
      projectId: "d-pr-1",
    },
  }),
  make({
    id: "d-tk-5",
    kind: "task",
    status: "active",
    title: "Daily standup with myself",
    capturedAt: hours(40),
    metadata: { priority: "medium", recurrence: "weekdays", completedAt: null },
  }),
  make({
    id: "d-tk-6",
    kind: "task",
    status: "active",
    title: "Weekly review (Sunday)",
    capturedAt: days(2),
    metadata: { priority: "high", recurrence: "weekly", completedAt: null },
  }),
  make({
    id: "d-tk-3",
    kind: "task",
    status: "active",
    title: "Re-read 'The shape of design' chapter 4",
    capturedAt: days(2),
    metadata: { dueDate: days(-7).toISOString(), priority: "low", completedAt: null },
  }),
  make({
    id: "d-tk-4",
    kind: "task",
    status: "archived",
    title: "Set up Neon Postgres",
    capturedAt: days(1),
    metadata: { priority: "high", completedAt: hours(18).toISOString() },
  }),

  // --- Decisions
  make({
    id: "d-de-1",
    kind: "decision",
    status: "active",
    title: "Use Postgres + pgvector instead of a dedicated vector DB",
    body: `Premise: I want one place for everything. Pinecone/Weaviate adds infra surface. pgvector inside Neon is 'good enough' until I hit 10M+ items.

Risk: cosine search slower past 100k. Mitigation: HNSW index when needed.`,
    summary: "Single-store simplicity > best-in-class vector DB for solo scale.",
    topic: "architecture",
    capturedAt: days(4),
    metadata: { reviewAt: days(-7).toISOString(), outcome: "pending" },
  }),
  make({
    id: "d-de-2",
    kind: "decision",
    status: "active",
    title: "Linear-style shell now, design pass later",
    body: `Don't bikeshed colors before the data flow works. Polish in v1.1.`,
    topic: "design",
    capturedAt: days(7),
    metadata: { reviewAt: days(-21).toISOString(), outcome: "pending" },
  }),

  // --- People
  make({
    id: "d-pe-1",
    kind: "person",
    status: "active",
    title: "Maya Chen",
    summary:
      "PM-turned-founder, working on agent UX patterns. Last conversation: confirmation-first agents vs full autonomy.",
    metadata: { handle: "@maya", lastContactedAt: days(3).toISOString() },
    capturedAt: days(45),
  }),
  make({
    id: "d-pe-2",
    kind: "person",
    status: "active",
    title: "Avi Bar-On",
    summary:
      "Friend from college, now at a fintech in Tel Aviv. Owes me coffee.",
    metadata: { handle: "avi.barons", lastContactedAt: days(12).toISOString() },
    capturedAt: days(120),
  }),
  make({
    id: "d-pe-3",
    kind: "person",
    status: "active",
    title: "Sasha Kowalski",
    summary:
      "Designer I want to work with. Likes restraint, hates blue gradients.",
    metadata: { handle: "@sashk", lastContactedAt: days(40).toISOString() },
    capturedAt: days(200),
  }),

  // --- Journal
  make({
    id: "d-jr-1",
    kind: "journal",
    status: "active",
    title: "A good day",
    body: `Shipped the auth flow. Went for a walk in the late afternoon. Avi texted out of nowhere. Energy decent, mood steady.`,
    capturedAt: hours(3),
    metadata: { energy: 4, mood: "🙂" },
  }),

  // --- Habits
  make({
    id: "d-ha-1",
    kind: "habit",
    status: "active",
    title: "Morning walk",
    summary: "20 minutes before coffee. Non-negotiable on workdays.",
    topic: "wellness",
    capturedAt: days(60),
    metadata: {
      cadence: "daily",
      checkins: [
        days(0).toISOString().slice(0, 10),
        days(1).toISOString().slice(0, 10),
        days(2).toISOString().slice(0, 10),
        days(4).toISOString().slice(0, 10),
        days(5).toISOString().slice(0, 10),
        days(6).toISOString().slice(0, 10),
      ],
    },
  }),
  make({
    id: "d-ha-2",
    kind: "habit",
    status: "active",
    title: "Read 30 minutes before bed",
    topic: "wellness",
    capturedAt: days(30),
    metadata: {
      cadence: "daily",
      checkins: [
        days(0).toISOString().slice(0, 10),
        days(2).toISOString().slice(0, 10),
        days(3).toISOString().slice(0, 10),
      ],
    },
  }),
  make({
    id: "d-ha-3",
    kind: "habit",
    status: "active",
    title: "Weekly review (Sunday)",
    topic: "process",
    capturedAt: days(90),
    metadata: {
      cadence: "weekly",
      checkins: [days(7).toISOString().slice(0, 10)],
    },
  }),

  // --- Goals
  make({
    id: "d-gl-1",
    kind: "goal",
    status: "active",
    title: "Ship Life OS v1",
    summary:
      "All three slices live (inbox + daily + graph), MCP scoped, design pass complete.",
    topic: "product",
    capturedAt: days(14),
    metadata: {
      targetDate: days(-90).toISOString(),
      progress: 42,
      milestones: [
        "Capture API",
        "Inbox + enrichment",
        "Today + journal",
        "MCP server",
        "Design pass",
      ],
    },
  }),
  make({
    id: "d-gl-2",
    kind: "goal",
    status: "active",
    title: "Read 24 books this year",
    topic: "personal",
    capturedAt: days(120),
    metadata: {
      targetDate: days(-220).toISOString(),
      progress: 38,
      milestones: ["9 of 24"],
    },
  }),
  make({
    id: "d-gl-3",
    kind: "goal",
    status: "active",
    title: "Reach steady 6-min/km pace",
    topic: "health",
    capturedAt: days(45),
    metadata: {
      targetDate: days(-60).toISOString(),
      progress: 65,
      milestones: ["6:40", "6:20"],
    },
  }),

  // --- Projects / Areas
  make({
    id: "d-pr-1",
    kind: "project",
    status: "active",
    title: "Ship Life OS v1",
    summary: "Capture, organize, recall — public beta by August.",
    topic: "product",
    capturedAt: days(14),
    metadata: { progress: 42, targetDate: days(-90).toISOString() },
  }),
  make({
    id: "d-pr-2",
    kind: "project",
    status: "active",
    title: "RecoupFi launch quarter",
    summary: "Push to 100 paid users by end of Q3. Outbound + content.",
    topic: "fintech",
    capturedAt: days(28),
    metadata: { progress: 18, targetDate: days(-120).toISOString() },
  }),
  make({
    id: "d-ar-1",
    kind: "area",
    status: "active",
    title: "Health",
    summary: "Run 3x/week, sleep > 7h, lift Mon/Thu.",
    capturedAt: days(180),
  }),
  make({
    id: "d-ar-2",
    kind: "area",
    status: "active",
    title: "Relationships",
    summary: "Stay close to the inner circle. One real call a week.",
    capturedAt: days(200),
  }),
  make({
    id: "d-ar-3",
    kind: "area",
    status: "active",
    title: "Finances",
    summary: "Track spend monthly. Six-month runway buffer.",
    capturedAt: days(300),
  }),

  // --- Ideas / highlights
  make({
    id: "d-id-1",
    kind: "idea",
    status: "active",
    title: "A 'time machine' view over Life OS",
    summary:
      "Scrubbable date slider; every saved item, decision, and journal entry surfaces by date. Replay any day.",
    topic: "product",
    capturedAt: days(5),
  }),
  make({
    id: "d-hl-1",
    kind: "highlight",
    status: "active",
    title: "From: The Beginning of Infinity",
    body: `"All evils are caused by insufficient knowledge."`,
    topic: "philosophy",
    capturedAt: days(11),
  }),
];

export function demoForKind(kind: Item["kind"]): Item[] {
  return DEMO_ITEMS.filter((i) => i.kind === kind);
}
export const DEMO_RECENT_24H = DEMO_ITEMS.filter(
  (i) => Date.now() - i.capturedAt.getTime() < 24 * 60 * 60 * 1000,
);
