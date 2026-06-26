# Gym / exercise tracker — design

Date: 2026-06-23

Replace the Health tab with a detailed gym tracker. Quick-log style (no live
rest timer). Strength + cardio. Bodyweight carried over from Health. Taste pass
applied (Life-OS brand preserved; clutter cut; full interactive states).

## Route & nav

- Move `src/app/(app)/health/` → `src/app/(app)/gym/` (URL `/gym`).
- Sidebar nav: `{ href: "/gym", label: "Gym", icon: Dumbbell }`.
- Voice command: `gym: { href: "/gym", label: "Gym" }`.
- `src/lib/store/health.ts` stays — reused for bodyweight (date → weightKg) and
  the kg/lb helpers. The mood/sleep/water UI is retired.

## Data (Dexie v9, new tables)

- `exercises` — library. `{ id, name, muscle, equipment, type: 'strength'|'cardio', custom, createdAt }`.
  Index `id, name, muscle, type, custom`. Seeded on first run (~50 strength + cardio).
- `workouts` — sessions. `{ id, date, focus, title, notes, entries, createdAt, updatedAt }`.
  - `focus`: a split label (Push/Pull/Legs/Upper/Lower/Chest/Back/Shoulders/Arms/Core/Cardio/Full body/custom) or null.
  - `entries`: `{ exerciseId, name, muscle, type, sets }[]`.
  - `sets`: `{ weightKg?, reps?, rpe?, distanceKm?, durationSec? }[]` (strength uses weight/reps/rpe; cardio uses distance/duration).
  - Index `id, date, focus`.
- `routines` — templates. `{ id, name, focus, note, items, preset, createdAt, updatedAt }`.
  - `items`: `{ exerciseId, name, muscle, targetSets?, targetReps?, note? }[]`. Index `id, name`.
- Seed flag in `appKV` (`gym.seeded`) so a deliberately-emptied library isn't re-seeded.

## Lib

- `src/lib/gym/types.ts` — types + constants: `MuscleGroup`, `Equipment`, `ExerciseType`,
  `Focus` list with a color per focus (from the 5-color theme palette), muscle/equipment labels.
- `src/lib/gym/seed.ts` — `SEED_EXERCISES` + `SEED_ROUTINES` (pure data).
- `src/lib/gym/calc.ts` — pure, testable: `epley1RM`, `setVolume`/`workoutVolume`,
  `bestSet`, `exerciseHistory`, per-exercise PR detection, `thisWeekCount`,
  `streakWeeks` (consecutive weeks with ≥1 workout), `volumeInPeriod`,
  `muscleBalance`, `splitBalance`.
- `src/lib/store/gym.ts` — Dexie hooks (`useExercises`, `useWorkouts`, `useRoutines`),
  CRUD (`addWorkout`/`updateWorkout`/`deleteWorkout`, exercise + routine CRUD,
  `upsertDayFocus(date, focus)` for the fast path), `seedGymIfNeeded()`.

## UI (in-page tabs: Log · Routines · Library · Stats)

- `gym/page.tsx` — shell: header (title, kg/lb toggle), tab switcher, seeds on mount,
  unit state, workout-form modal host.
- `gym/log-tab.tsx` — week-at-a-glance strip (each day's focus, click a past day to fast-log
  just a focus), a "Log a workout" button (opens form for today), recent workouts list (cards)
  with edit/delete. Composed empty state when there are no workouts.
- `gym/workout-form.tsx` — add/edit a workout: date, focus chips, exercises (via picker),
  per-exercise set editor (strength rows / cardio fields), notes, save. "Start from routine" prefill.
- `gym/exercise-picker.tsx` — searchable + muscle/equipment-filtered list to add exercises; add custom.
- `gym/library-tab.tsx` — exercise card grid, search + filters, add custom, per-exercise detail
  (history, best set, est 1RM, mini progression chart).
- `gym/routines-tab.tsx` — routines (presets + custom), create/edit, Start → opens the form prefilled.
- `gym/stats-tab.tsx` — this week, week streak, volume, split balance, muscle balance, recent PRs,
  and Body (log bodyweight + trend, reusing healthLogs).

## Taste pass (applied throughout)

Keep brand (warm paper, terracotta accent, Geist, lucide — for app consistency). One radius scale,
terra as the single accent (sage/gold/sky/plum only to color-code data). Far fewer uppercase
eyebrow labels than the old Health tab. Sets table grouped (zebra), not a hairline per row. Real
empty/loading/error states, tactile `:active` feedback. Restrained motion (entry + hover only).

## Verification

`calc.ts` pure helpers get a logic test (1RM, volume, PR detection, streak). Then `tsc --noEmit`
and `next build`. Commit to `main`.
