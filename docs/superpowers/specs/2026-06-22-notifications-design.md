# Upcoming-item notifications — design

Date: 2026-06-22

## Goal

Notify the user about upcoming **subscriptions**, **tasks**, and **calendar items**
(everything dated) at **5, 3, 1 days before and on the day**. Surface them two ways:

1. A polished in-app **notification center** (bell + dropdown) in the top bar.
2. Native **desktop (PC) notifications** + an in-app toast, while Life-OS is open.

## Constraints / decisions

- **No push server.** Notifications fire only while a Life-OS tab is open (reusing the
  existing service-worker path). True background-when-closed delivery is explicitly out of
  scope (would need a push server + Web Push subscriptions).
- **Coverage = all dated items**: task `dueDate`, subscription `nextChargeAt`, project
  `targetDate` (deadline), person `birthday`.
- **Live-derived feed**, not stored notification records. The bell computes its list on the
  fly from `db.items` (same pattern as the Calendar). "Read"/"fired" are small
  date-keyed maps in `localStorage`, pruned once a target date passes.

## The schedule

For each dated item with target date `D`, milestones fire at **5, 3, 1, 0** days before `D`
(local midnight granularity). The existing 60-second scheduler in `PwaBootstrap` fires a
milestone the first time the app is open on/after that day, so the user need not be present
at the exact instant. Each `(item, milestone, D)` fires once; dedup key
`cat:id:milestone:YYYY-MM-DD`.

To keep the in-app badge consistent with the OS pings, a feed entry's **unread key** snaps
its raw days-until to the last milestone reached:

| days until | unread bucket |
|---|---|
| ≥ 4 | 5 |
| 2–3 | 3 |
| 1 | 1 |
| ≤ 0 | 0 |

So a new "unread" appears only when the item crosses 5 / 3 / 1 / 0 — matching the OS pings.
The display label still uses the precise days-until ("in 4 days").

Existing time-based notifications are preserved: per-habit reminder time, the evening
"habits still pending" nudge, and the exact-time ping for reminder-type tasks. The reminder
task's same-day (0) milestone OS ping is suppressed so it isn't doubled with its exact-time
ping; it still appears in the center.

## Components

- `src/lib/notify.ts` (refactor) — pure `computeFeed(items, now): FeedNotif[]` (testable),
  plus `fireDue(items)` reworked to fire milestone + time-based notifications and **return**
  the freshly-fired list (so the bootstrap can toast them). Formatting helpers
  (`whenLabel`, `feedPrimary`, `feedSecondary`, `osText`).
- `src/lib/notify-state.ts` (new) — `localStorage` helpers: per-category prefs
  (`task`/`subscription`/`deadline`/`birthday`), the `read` map, the `fired` map, and
  date-based pruning. No React, no DOM beyond `localStorage`.
- `src/components/notification-bell.tsx` (new) — bell + dropdown center. `useLiveQuery` over
  `db.items`, recomputes every 60s, groups by Overdue / Today / Coming up, unread badge,
  mark-as-read on open, click-through navigation, "Mark all read", empty state, calendar
  footer link. Independent of OS permission (the center always works).
- `src/components/top-bar.tsx` — mount `<NotificationBell />` in the right cluster.
- `src/components/pwa-bootstrap.tsx` — toast each freshly-fired notification (cap 3 + "+N
  more"), with a "View" action that navigates.
- `src/app/(app)/settings/notifications-section.tsx` — updated copy describing the
  5/3/1/same-day advance reminders + four per-category toggles.

## FeedNotif shape

```ts
type NotifCat = "task" | "subscription" | "deadline" | "birthday";
type FeedNotif = {
  key: string;        // cat:id:bucket:YYYY-MM-DD  (identity for read/fired)
  id: string;         // source item id
  cat: NotifCat;
  title: string;      // item display title (person name for birthdays)
  meta: string | null;// "$9.99", "turns 30", …
  url: string;        // where a click goes
  targetYmd: string;  // for pruning
  daysUntil: number;  // negative = overdue
  isReminder: boolean;// task reminder flag (suppresses doubled same-day ping)
};
```

## Horizon

- Upcoming: `daysUntil` in `0..5`.
- Overdue: `daysUntil` in `-30..-1` for task / subscription / deadline (bounded so the feed
  stays small). Birthdays show only the next occurrence (0..5), never overdue.

## Testing

No test runner exists in the repo. `computeFeed` is written as a pure function so it can be
unit-tested if a runner is added later; end-to-end behavior is verified by a TypeScript
build (`tsc --noEmit`) and by running the app.
