"use client";

import { useEffect, useState } from "react";
import { Bell, BellOff } from "lucide-react";
import { toast } from "sonner";
import {
  notifySupported,
  notifyPermission,
  requestNotifyPermission,
  notifyEnabled,
  setNotifyEnabled,
  testNotification,
} from "@/lib/notify";
import {
  getCats,
  setCat,
  NOTIF_CATS,
  CAT_LABEL,
  type NotifCat,
} from "@/lib/notify-state";

export function NotificationsSection() {
  const [mounted, setMounted] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [perm, setPerm] = useState<NotificationPermission>("default");
  const [sending, setSending] = useState(false);
  const [cats, setCats] = useState<Record<NotifCat, boolean>>({
    task: true,
    subscription: true,
    deadline: true,
    birthday: true,
  });

  useEffect(() => {
    setMounted(true);
    setEnabled(notifyEnabled());
    setPerm(notifyPermission());
    setCats(getCats());
  }, []);

  async function toggle() {
    if (!notifySupported()) {
      toast.error("This browser doesn't support notifications");
      return;
    }
    if (enabled) {
      setNotifyEnabled(false);
      setEnabled(false);
      return;
    }
    let p = notifyPermission();
    if (p !== "granted") p = await requestNotifyPermission();
    setPerm(p);
    if (p === "granted") {
      setNotifyEnabled(true);
      setEnabled(true);
      toast.success("Notifications on");
    } else {
      toast.error("Permission denied — allow notifications in your browser.");
    }
  }

  function toggleCat(cat: NotifCat) {
    const next = !cats[cat];
    setCat(cat, next);
    setCats((c) => ({ ...c, [cat]: next }));
  }

  async function sendTest() {
    setSending(true);
    try {
      await testNotification();
      setPerm(notifyPermission());
      toast.success("Test notification sent", {
        description:
          "Don't see it? Your OS may be muting it — check Focus Assist / Do Not Disturb.",
      });
    } catch (e) {
      setPerm(notifyPermission());
      toast.error(e instanceof Error ? e.message : "Couldn't send the notification");
    } finally {
      setSending(false);
    }
  }

  if (!mounted) return null;
  const supported = notifySupported();

  return (
    <div className="life-card divide-y divide-[var(--border-soft)] overflow-hidden">
      <div className="px-4 py-3 flex items-center gap-3">
        <span className="shrink-0 text-[var(--accent)]">
          {enabled ? <Bell size={15} /> : <BellOff size={15} />}
        </span>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium">Reminders &amp; nudges</div>
          <p className="text-xs text-[var(--text-muted)] mt-0.5 leading-relaxed">
            Get a heads-up 5, 3 and 1 days before — and on the day — for upcoming
            tasks, subscription renewals, deadlines and birthdays, plus habit
            nudges. Shown on your desktop and in the bell, while Life OS is open.
          </p>
          {!supported && (
            <p className="text-xs text-[var(--bad)] mt-1">
              Not supported in this browser.
            </p>
          )}
          {supported && perm === "denied" && (
            <p className="text-xs text-[var(--bad)] mt-1">
              Blocked — allow notifications from your browser&apos;s address bar.
            </p>
          )}
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          onClick={toggle}
          disabled={!supported}
          className="relative w-[44px] h-[26px] rounded-full transition-colors shrink-0 disabled:opacity-40"
          style={{ background: enabled ? "var(--accent)" : "var(--border-strong)" }}
        >
          <span
            className="absolute top-[3px] w-5 h-5 rounded-full bg-white transition-[left] duration-200"
            style={{ left: enabled ? 21 : 3, boxShadow: "0 1px 3px rgba(0,0,0,0.25)" }}
          />
        </button>
      </div>

      <div className="px-4 py-3">
        <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--text-faint)] mb-1">
          What to notify about
        </div>
        <div className="divide-y divide-[var(--border-soft)]">
          {NOTIF_CATS.map((cat) => (
            <div key={cat} className="flex items-center gap-3 py-2">
              <span className="flex-1 text-sm">{CAT_LABEL[cat]}</span>
              <button
                type="button"
                role="switch"
                aria-checked={cats[cat]}
                aria-label={CAT_LABEL[cat]}
                onClick={() => toggleCat(cat)}
                className="relative w-[40px] h-[24px] rounded-full transition-colors shrink-0"
                style={{
                  background: cats[cat] ? "var(--accent)" : "var(--border-strong)",
                }}
              >
                <span
                  className="absolute top-[3px] w-[18px] h-[18px] rounded-full bg-white transition-[left] duration-200"
                  style={{
                    left: cats[cat] ? 19 : 3,
                    boxShadow: "0 1px 3px rgba(0,0,0,0.25)",
                  }}
                />
              </button>
            </div>
          ))}
        </div>
      </div>

      {enabled && (
        <button
          type="button"
          onClick={sendTest}
          disabled={sending}
          className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[var(--bg-card-hover)] transition text-left disabled:opacity-60"
        >
          <Bell size={14} className="text-[var(--text-faint)]" />
          <div className="flex-1">
            <div className="text-sm font-medium">
              {sending ? "Sending…" : "Send a test notification"}
            </div>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">
              Make sure it comes through.
            </p>
          </div>
        </button>
      )}
    </div>
  );
}
