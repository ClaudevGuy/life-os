import { Inbox } from "lucide-react";
import { InboxList } from "./inbox-list";

export const metadata = { title: "Inbox · Life OS" };

export default function InboxPage() {
  return (
    <div className="p-8 max-w-3xl mx-auto pg-enter">
      <header className="mb-6">
        <h1 className="life-h1 inline-flex items-center gap-2">
          <Inbox size={20} className="text-[var(--terra)]" strokeWidth={1.6} />
          Inbox
        </h1>
        <p className="text-[14.5px] text-[var(--muted)] mt-1 max-w-xl">
          Triage what you&apos;ve captured. File it to keep, archive to dismiss
          — hover for actions, or drag a row to swipe.
        </p>
      </header>

      <InboxList />
    </div>
  );
}
