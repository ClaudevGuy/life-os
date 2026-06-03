/**
 * Ask-my-notes. The browser sends the question plus the items it wants the
 * model to consult; we stream back the answer AND any actions the model
 * decides to take (add a reminder, a person, a note…). Tools have no server
 * `execute` — the data lives in the browser, so the client performs the write
 * and shows a confirmation. No data persists server-side.
 *
 * Stream protocol (NDJSON, one JSON object per line):
 *   { type: "sources", sources: [...] }      // emitted first
 *   { type: "text",   text: "…" }            // answer deltas
 *   { type: "action", name, input }          // a tool the client should run
 *   { type: "error",  message }              // anything that went wrong
 */
import { streamText, tool } from "ai";
import { z } from "zod";
import { buildModel } from "@/lib/ai-provider";

const TEXT_MODEL =
  process.env.LIFEOS_TEXT_MODEL ?? "anthropic/claude-haiku-4-5";

const itemSchema = z.object({
  id: z.string(),
  kind: z.string(),
  title: z.string().nullable(),
  summary: z.string().nullable().optional(),
  body: z.string().nullable().optional(),
});

const bodySchema = z.object({
  question: z.string().min(1).max(2_000),
  items: z.array(itemSchema).max(40),
});

function errMsg(e: unknown): string {
  if (e instanceof Error) return e.message;
  if (typeof e === "string") return e;
  try {
    return JSON.stringify(e);
  } catch {
    return "unknown error";
  }
}

export async function POST(req: Request) {
  const raw = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) {
    return Response.json({ error: "invalid_body" }, { status: 400 });
  }
  const { question, items } = parsed.data;

  const sourceLines = items
    .map(
      (c, i) =>
        `[${i + 1}] (${c.kind}) ${c.title ?? "untitled"} — ${c.summary ?? c.body ?? ""}`,
    )
    .join("\n");

  const now = new Date();
  const todayISO = now.toISOString().slice(0, 10);
  const weekday = now.toLocaleDateString("en-US", { weekday: "long" });

  const system = `You are the user's second-brain assistant inside Life OS. Today is ${todayISO} (${weekday}), in the user's local time.

You can do TWO things:
1. ANSWER questions using ONLY the saved items listed below. Cite items by their number in square brackets like [3]. If the items don't contain the answer, say so honestly and briefly — don't invent facts.
2. TAKE ACTIONS when the user asks you to add / create / remind / save / note something. Call the matching tool. Convert relative dates ("tomorrow", "next Friday", "in 2 days") into an absolute YYYY-MM-DD using today's date. Prefer actually calling the tool over describing what you'd do. A brief one-line confirmation afterwards is plenty.

SAVED ITEMS:
${sourceLines || "(none provided)"}`;

  const tools = {
    addReminder: tool({
      description:
        "Create a time-based reminder on a specific day. Shows on the calendar and Today, kept out of the task list.",
      inputSchema: z.object({
        title: z.string().describe("What to be reminded of"),
        date: z.string().describe("The day, as YYYY-MM-DD"),
        time: z
          .string()
          .optional()
          .describe("Time as HH:MM (24h). Defaults to 09:00 if omitted."),
      }),
    }),
    addTask: tool({
      description: "Create a to-do task, optionally with a due date.",
      inputSchema: z.object({
        title: z.string(),
        dueDate: z.string().optional().describe("Due day as YYYY-MM-DD"),
        priority: z.enum(["low", "medium", "high"]).optional(),
      }),
    }),
    addPerson: tool({
      description: "Add a person to the People list (a lightweight CRM).",
      inputSchema: z.object({
        name: z.string(),
        phone: z.string().optional(),
        email: z.string().optional(),
        relationship: z
          .string()
          .optional()
          .describe("e.g. friend, colleague, family"),
        note: z.string().optional(),
      }),
    }),
    addNote: tool({
      description: "Save a free-form note.",
      inputSchema: z.object({
        title: z.string(),
        body: z.string().optional(),
      }),
    }),
    addBookmark: tool({
      description: "Save a bookmark / link for later.",
      inputSchema: z.object({
        url: z.string(),
        title: z.string().optional(),
      }),
    }),
  };

  try {
    const model = buildModel(TEXT_MODEL, req);
    const result = streamText({
      model,
      system,
      prompt: question,
      tools,
      toolChoice: "auto",
    });

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const send = (obj: unknown) =>
          controller.enqueue(encoder.encode(JSON.stringify(obj) + "\n"));

        send({
          type: "sources",
          sources: items.map((i) => ({
            id: i.id,
            kind: i.kind,
            title: i.title,
            summary: i.summary ?? null,
          })),
        });

        try {
          for await (const part of result.fullStream) {
            const t = part.type as string;
            if (t === "text-delta") {
              send({ type: "text", text: (part as { text: string }).text });
            } else if (t === "tool-call") {
              const p = part as { toolName: string; input: unknown };
              send({ type: "action", name: p.toolName, input: p.input });
            } else if (t === "error") {
              send({
                type: "error",
                message: errMsg((part as { error?: unknown }).error),
              });
            }
          }
        } catch (e) {
          send({ type: "error", message: errMsg(e) });
        }
        controller.close();
      },
    });

    return new Response(stream, {
      headers: { "content-type": "text/plain; charset=utf-8" },
    });
  } catch (err) {
    return Response.json(
      {
        error: "ai_unavailable",
        detail: errMsg(err),
        sources: items.map((i) => ({
          id: i.id,
          kind: i.kind,
          title: i.title,
          summary: i.summary ?? null,
        })),
      },
      { status: 503 },
    );
  }
}
