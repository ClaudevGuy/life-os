import { listInbox } from "@/lib/items";
import { getViewerId, safeQuery, demoUniverse } from "@/lib/viewer";
import { Inbox } from "lucide-react";
import { InboxList } from "./inbox-list";

export const metadata = { title: "Inbox · Life OS" };
export const dynamic = "force-dynamic";

export default async function InboxPage() {
  const userId = await getViewerId();
  let rows = await safeQuery(() => listInbox(userId), []);
  const isDemo = rows.length === 0;
  if (isDemo)
    rows = demoUniverse(userId).filter(
      (i) => i.status === "inbox" || ["bookmark", "highlight", "idea"].includes(i.kind),
    );

  return (
    <div className="p-8 max-w-3xl">
      <div className="flex items-baseline justify-between">
        <div>
          <h1 className="life-h1 inline-flex items-center gap-2">
            <Inbox size={18} className="text-[var(--accent)]" />
            Inbox
          </h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            {rows.length} item{rows.length === 1 ? "" : "s"} to triage
            {isDemo && (
              <span className="ml-2 life-pill text-[var(--accent)]">demo</span>
            )}
          </p>
        </div>
      </div>

      <InboxList rows={rows} />
    </div>
  );
}
