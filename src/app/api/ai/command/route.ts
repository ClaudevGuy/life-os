/**
 * The voice assistant's brain. The browser sends a spoken transcript plus a
 * compact snapshot of the user's data; we stream back a short spoken reply AND
 * any actions to run (navigate, complete a task, start a timer, create things…).
 * Like /api/ai/ask, tools have no server `execute` — the data lives in the
 * browser, so the client performs each action and confirms.
 *
 * Stream protocol (NDJSON, one JSON object per line):
 *   { type: "text",   text: "…" }     // spoken-reply deltas
 *   { type: "action", name, input }   // a tool the client should run
 *   { type: "error",  message }
 */
import { streamText, tool } from "ai";
import { z } from "zod";
import { buildModel } from "@/lib/ai-provider";

const TEXT_MODEL = process.env.LIFEOS_TEXT_MODEL ?? "anthropic/claude-haiku-4-5";

const NAV_KEYS = [
  "today",
  "inbox",
  "notes",
  "bookmarks",
  "files",
  "calendar",
  "tasks",
  "habits",
  "health",
  "goals",
  "projects",
  "people",
  "finance",
  "subscriptions",
  "ask",
  "graph",
  "music",
  "vault",
  "settings",
] as const;

const bodySchema = z.object({
  transcript: z.string().min(1).max(2_000),
  context: z.string().max(12_000).optional(),
  history: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        text: z.string().max(2_000),
      }),
    )
    .max(8)
    .optional(),
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
  const { transcript, context, history } = parsed.data;

  const now = new Date();
  const todayISO = now.toISOString().slice(0, 10);
  const weekday = now.toLocaleDateString("en-US", { weekday: "long" });

  const system = `You are Aria, the hands-free voice assistant inside Life OS — a personal second-brain app. Today is ${todayISO} (${weekday}) in the user's local time.

You hear a spoken request and you either ACT or ANSWER:
- To go somewhere, create something, complete a task, start a focus timer, search, or change the theme — CALL THE MATCHING TOOL. Prefer acting over describing. You may call more than one tool when the request needs it.
- To answer a question, use ONLY the SNAPSHOT below. If the answer isn't there, say you don't have that handy and suggest where to look.

Your text reply is READ ALOUD, so make it ONE short, natural, friendly sentence. No markdown, no bullet points, no emoji. Confirm what you did ("Opening Tasks." / "Marked it done." / "You have 3 tasks due today."). Convert relative dates ("tomorrow", "next Friday", "in 2 days") to an absolute YYYY-MM-DD using today's date.

SNAPSHOT OF THE USER'S DATA:
${context || "(no snapshot provided)"}`;

  const tools = {
    navigate: tool({
      description:
        "Open one of the app's pages. Use when the user says go to / open / show / take me to a section.",
      inputSchema: z.object({
        to: z.enum(NAV_KEYS).describe("Which page to open"),
      }),
    }),
    openItem: tool({
      description:
        "Open a specific saved item the user refers to (a note, task, person, project, bookmark…). Match by their description.",
      inputSchema: z.object({
        query: z.string().describe("Words identifying the item, e.g. its title"),
      }),
    }),
    completeTask: tool({
      description:
        "Mark a to-do task as done / complete / finished. Match the task by what the user says.",
      inputSchema: z.object({
        query: z.string().describe("Words identifying the task"),
      }),
    }),
    startFocus: tool({
      description: "Start a focus (pomodoro) timer.",
      inputSchema: z.object({
        minutes: z
          .number()
          .optional()
          .describe("Length in minutes — 15, 25, 50 or 90. Defaults to 25."),
      }),
    }),
    setTheme: tool({
      description: "Switch the app between light and dark appearance.",
      inputSchema: z.object({
        mode: z.enum(["light", "dark"]),
      }),
    }),
    search: tool({
      description:
        "Open the search palette with a query when the user wants to find or look something up but not a specific known item.",
      inputSchema: z.object({ query: z.string() }),
    }),
    addReminder: tool({
      description:
        "Create a time-based reminder on a specific day. Shows on the calendar and Today.",
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
    addNote: tool({
      description: "Save a free-form note.",
      inputSchema: z.object({
        title: z.string(),
        body: z.string().optional(),
      }),
    }),
    addPerson: tool({
      description: "Add a person to the People list (a lightweight CRM).",
      inputSchema: z.object({
        name: z.string(),
        phone: z.string().optional(),
        email: z.string().optional(),
        relationship: z.string().optional(),
        note: z.string().optional(),
      }),
    }),
    addBookmark: tool({
      description: "Save a bookmark / link for later.",
      inputSchema: z.object({
        url: z.string(),
        title: z.string().optional(),
      }),
    }),
    addAccount: tool({
      description:
        "Add a financial account to Finance — something the user owns (asset) or owes (liability), with a balance.",
      inputSchema: z.object({
        name: z.string(),
        accountType: z.enum(["asset", "liability"]),
        category: z
          .string()
          .describe(
            "One of: Cash, Checking, Savings, Investments, Retirement, Crypto, Real estate, Vehicle, Other asset, Credit card, Loan, Mortgage, Other debt",
          ),
        balance: z.number(),
        currency: z.string().optional(),
        institution: z.string().optional(),
      }),
    }),
    addHolding: tool({
      description:
        "Add a crypto or stock holding to Finance; it's valued live. Use when the user says they hold / own / bought a quantity of a coin or stock.",
      inputSchema: z.object({
        assetClass: z.enum(["crypto", "stock"]),
        symbol: z.string(),
        name: z.string().optional(),
        quantity: z.number(),
        costBasis: z.number().optional(),
      }),
    }),
  };

  const messages = [
    ...(history ?? []).map((h) => ({ role: h.role, content: h.text })),
    { role: "user" as const, content: transcript },
  ];

  try {
    const model = buildModel(TEXT_MODEL, req);
    const result = streamText({
      model,
      system,
      messages,
      tools,
      toolChoice: "auto",
    });

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const send = (obj: unknown) =>
          controller.enqueue(encoder.encode(JSON.stringify(obj) + "\n"));
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
      { error: "ai_unavailable", detail: errMsg(err) },
      { status: 503 },
    );
  }
}
