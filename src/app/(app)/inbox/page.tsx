import { InboxList } from "./inbox-list";

export const metadata = { title: "Inbox · Life OS" };

export default function InboxPage() {
  return (
    <div className="px-6 sm:px-8 py-8 max-w-3xl mx-auto pg-enter">
      <InboxList />
    </div>
  );
}
