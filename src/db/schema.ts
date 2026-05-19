import {
  pgTable,
  text,
  timestamp,
  boolean,
  integer,
  jsonb,
  pgEnum,
  primaryKey,
  index,
  real,
  vector,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ---------- Auth.js v5 tables (matches @auth/drizzle-adapter shape) ----------

export const users = pgTable("user", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text("name"),
  email: text("email").unique(),
  emailVerified: timestamp("emailVerified", { mode: "date" }),
  image: text("image"),
  createdAt: timestamp("createdAt", { mode: "date" }).defaultNow().notNull(),
});

export const accounts = pgTable(
  "account",
  {
    userId: text("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("providerAccountId").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (t) => [primaryKey({ columns: [t.provider, t.providerAccountId] })],
);

export const sessions = pgTable("session", {
  sessionToken: text("sessionToken").primaryKey(),
  userId: text("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { mode: "date" }).notNull(),
});

export const verificationTokens = pgTable(
  "verificationToken",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { mode: "date" }).notNull(),
  },
  (t) => [primaryKey({ columns: [t.identifier, t.token] })],
);

// ---------- API keys (bearer tokens for Claude Code / Shortcuts / external) --

export const apiKeys = pgTable(
  "api_key",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    hashedKey: text("hashed_key").notNull().unique(),
    prefix: text("prefix").notNull(), // first 8 chars shown in UI for ID
    lastUsedAt: timestamp("last_used_at", { mode: "date" }),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
    revokedAt: timestamp("revoked_at", { mode: "date" }),
  },
  (t) => [index("api_key_user_idx").on(t.userId)],
);

// ---------- Items: the polymorphic spine ----------

export const itemKindEnum = pgEnum("item_kind", [
  "bookmark",
  "note",
  "decision",
  "person",
  "journal",
  "voice",
  "task",
  "idea",
  "goal",
  "habit",
  "highlight",
  "project",
  "area",
]);

export const itemStatusEnum = pgEnum("item_status", [
  "inbox",
  "active",
  "archived",
  "reference",
]);

export const capturedViaEnum = pgEnum("captured_via", [
  "web",
  "api",
  "mcp",
  "extension",
  "email",
  "voice",
  "shortcut",
]);

export const items = pgTable(
  "item",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    kind: itemKindEnum("kind").notNull(),

    title: text("title"),
    body: text("body"),
    sourceUrl: text("source_url"),

    capturedVia: capturedViaEnum("captured_via").notNull().default("web"),
    capturedAt: timestamp("captured_at", { mode: "date" }).defaultNow().notNull(),
    status: itemStatusEnum("status").notNull().default("inbox"),
    isPinned: boolean("is_pinned").notNull().default(false),

    // kind-specific bag: energy, mood, decisionOutcome, reviewAt,
    // personHandle, audioUrl, etc.
    metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}),

    // enrichment outputs
    rawText: text("raw_text"),
    summary: text("summary"),
    keyPoints: jsonb("key_points").$type<string[]>(),
    topic: text("topic"),
    estMinutes: integer("est_minutes"),
    difficulty: text("difficulty"),

    embedding: vector("embedding", { dimensions: 1536 }),

    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
  },
  (t) => [
    index("item_user_idx").on(t.userId),
    index("item_kind_idx").on(t.kind),
    index("item_status_idx").on(t.status),
    index("item_captured_at_idx").on(t.capturedAt),
    uniqueIndex("item_user_source_url_unique").on(t.userId, t.sourceUrl),
  ],
);

// ---------- Tags ----------

export const tags = pgTable(
  "tag",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    color: text("color"),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  },
  (t) => [uniqueIndex("tag_user_name_unique").on(t.userId, t.name)],
);

export const itemTags = pgTable(
  "item_tag",
  {
    itemId: text("item_id")
      .notNull()
      .references(() => items.id, { onDelete: "cascade" }),
    tagId: text("tag_id")
      .notNull()
      .references(() => tags.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.itemId, t.tagId] })],
);

// ---------- Connections (generalized Marrow pattern) ----------

export const connectionKindEnum = pgEnum("connection_kind", [
  "echo",
  "contradict",
  "references",
  "about_person",
  "follows_up",
]);

export const connections = pgTable(
  "connection",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    aId: text("a_id")
      .notNull()
      .references(() => items.id, { onDelete: "cascade" }),
    bId: text("b_id")
      .notNull()
      .references(() => items.id, { onDelete: "cascade" }),
    kind: connectionKindEnum("kind").notNull(),
    reason: text("reason"),
    similarity: real("similarity"),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  },
  (t) => [
    index("conn_a_idx").on(t.aId),
    index("conn_b_idx").on(t.bId),
    uniqueIndex("conn_pair_kind_unique").on(t.aId, t.bId, t.kind),
  ],
);

// ---------- Phase-2 stubs (created now to avoid future migrations) ----------

export const journalDigests = pgTable(
  "journal_digest",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    date: text("date").notNull(), // YYYY-MM-DD
    briefMarkdown: text("brief_markdown").notNull(),
    generatedAt: timestamp("generated_at", { mode: "date" }).defaultNow().notNull(),
  },
  (t) => [uniqueIndex("digest_user_date_unique").on(t.userId, t.date)],
);

export const agents = pgTable("agent", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  prompt: text("prompt").notNull(),
  schedule: text("schedule"), // cron expression
  enabled: boolean("enabled").notNull().default(false),
  lastRunAt: timestamp("last_run_at", { mode: "date" }),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
});

export const agentRuns = pgTable("agent_run", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  agentId: text("agent_id")
    .notNull()
    .references(() => agents.id, { onDelete: "cascade" }),
  startedAt: timestamp("started_at", { mode: "date" }).defaultNow().notNull(),
  endedAt: timestamp("ended_at", { mode: "date" }),
  status: text("status").notNull().default("running"), // running | success | error
  summary: text("summary"),
  tokensIn: integer("tokens_in"),
  tokensOut: integer("tokens_out"),
  costUsd: real("cost_usd"),
  error: text("error"),
});

// ---------- Relations ----------

export const usersRelations = relations(users, ({ many }) => ({
  items: many(items),
  apiKeys: many(apiKeys),
  tags: many(tags),
}));

export const itemsRelations = relations(items, ({ one, many }) => ({
  user: one(users, { fields: [items.userId], references: [users.id] }),
  tags: many(itemTags),
  connectionsFrom: many(connections, { relationName: "from" }),
  connectionsTo: many(connections, { relationName: "to" }),
}));

export const itemTagsRelations = relations(itemTags, ({ one }) => ({
  item: one(items, { fields: [itemTags.itemId], references: [items.id] }),
  tag: one(tags, { fields: [itemTags.tagId], references: [tags.id] }),
}));

export const connectionsRelations = relations(connections, ({ one }) => ({
  a: one(items, {
    fields: [connections.aId],
    references: [items.id],
    relationName: "from",
  }),
  b: one(items, {
    fields: [connections.bId],
    references: [items.id],
    relationName: "to",
  }),
}));

// ---------- Types ----------

export type Item = typeof items.$inferSelect;
export type NewItem = typeof items.$inferInsert;
export type ItemKind = (typeof itemKindEnum.enumValues)[number];
export type ItemStatus = (typeof itemStatusEnum.enumValues)[number];
export type ConnectionKind = (typeof connectionKindEnum.enumValues)[number];
export type Tag = typeof tags.$inferSelect;
export type Connection = typeof connections.$inferSelect;
export type User = typeof users.$inferSelect;
export type ApiKey = typeof apiKeys.$inferSelect;
