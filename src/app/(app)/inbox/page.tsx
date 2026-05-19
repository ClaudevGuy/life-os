import { Inbox } from "lucide-react";
import { InboxList } from "./inbox-list";

export const metadata = { title: "Inbox · Life OS" };

export default function InboxPage() {
  return (
    <div className="p-8 max-w-3xl">
      <div className="flex items-baseline justify-between">
        <div>
          <h1 className="life-h1 inline-flex items-center gap-2">
            <Inbox size={18} className="text-[var(--accent)]" />
            Inbox
          </h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            Triage what you've captured.
          </p>
        </div>
      </div>

      <InboxList />
    </div>
  );
}
