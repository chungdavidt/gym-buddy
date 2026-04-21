# Gym Buddy — Personal workout tracker (PWA, mobile-first)

A personal workout app for David. Primary device: iPhone Safari. Tells him what to lift today, lets him log it with minimal taps, shows progress over time. Currently at the end of **Phase 3**: double-progression prescription reads prior completed sessions and drives today's weight + rep targets.

## Project state

- **Phase 1 (done, committed)**: Vite + React + TS + Tailwind scaffold; bottom-tab nav; read-only Today screen. Initial commit on `main`.
- **Phase 2 (done, uncommitted)**: Session lifecycle (start/log/tag/finish/cancel) via `useReducer` + Context, localStorage persistence under versioned key `gym-buddy:workout:v1`, interactive set rows with `+`/`-` + `✓`, per-set too-heavy/too-easy chips, wall-clock rest timer with Web-Audio chime (iOS audio unlocked via user-gesture `start()` call), `state.nextCycleDay` rotation on Finish.
- **Phase 3 (done, uncommitted)**: Double-progression. Pure util `prescribeForEntry(entry, exercise, sessions, cycleDay, variant)` → `{ weight, repsPerSet, bumped }`. Both card components call the util via `useMemo`; `TodayScreen` threads the per-set prescription into `LOG_SET` so each `SessionSet.target` records what was shown. Reducer falls back to the util if no target is passed. Weighted: hit top on every working-weight set → `weight + weightIncrement`, reset reps to bottom of range; else hold and prefill reps from last actuals. Bodyweight: hit top → aim for top on every set; else prefill from last actuals. `too_heavy` / `too_easy` still captured but ignored by prescription (Phase 3.5).
- **Phase 4+ (not started)**: History screen, Progress charts, PWA manifest + service worker, Gist sync, settings UI, deployment.

See `PLAN.md` for the full design doc, `~/.claude/plans/lucky-discovering-biscuit.md` for the Phase 1 plan, `~/.claude/plans/ok-great-lets-start-virtual-harp.md` for the Phase 2 plan, and `~/.claude/plans/bright-whistling-kite.md` for the Phase 3 plan.

## Contents

| File / Dir | Description |
|------------|-------------|
| `PLAN.md` | Living design doc — tech stack, design principles, PPL routine, double-progression scheme, in-workout UX, data model, backup strategy, open questions |
| `README.md` | Default Vite-template README — not yet customized |
| `.gitignore` | Standard Vite/Node ignores + `.claude/settings.local.json` |
| `sample-workout.json` | Schema + seed data (settings, 32 exercises, full PPL gym/home routine, empty sessions, state with `inProgressSessionId: null`) — initial seed; live state lives in localStorage after first boot |
| `public/favicon.svg` | Default Vite favicon |
| `src/main.tsx` | Vite entry; mounts `<App/>` inside `<BrowserRouter>` |
| `src/App.tsx` | Wraps routes in `<SessionProvider>` + `<RestTimerProvider>`; same four routes + layout shell |
| `src/index.css` | Tailwind directives + minimal reset |
| `src/types/workout.ts` | All TS types — Exercise discriminated union, Routine, Session (with `status/startedAt/completedAt`), SessionSet (with `routineEntryIndex/setNumber`), State (with `inProgressSessionId`) |
| `src/data/sampleWorkout.ts` | Imports + type-asserts the seed JSON |
| `src/data/storage.ts` | `loadWorkout` / `saveWorkout` / `clearWorkout` over `localStorage` key `gym-buddy:workout:v1` |
| `src/state/sessionStore.tsx` | React Context + `useReducer`. Owns `WorkoutData`. Actions: `START_SESSION`, `LOG_SET` (now with optional `target`), `TAG_SET`, `FINISH_SESSION`, `CANCEL_SESSION`. Auto-saves on every state change. If `LOG_SET` omits `target`, reducer calls `prescribeForEntry` as a fallback so stored history is never corrupted. Exports `SessionProvider`, `useWorkout()` |
| `src/hooks/useRestTimer.tsx` | Wall-clock rest timer context. `start/stop/skip` + `remaining/isRunning`. Lazy `AudioContext` unlocked on first `start()` inside a user-gesture frame. StrictMode-safe chime via `firedRef` |
| `src/utils/format.ts` | `formatRepRange([low, high])` → `"6-8 reps"`; `formatDuration(seconds)` → `"m:ss"` |
| `src/utils/progression.ts` | Pure `prescribeForEntry(entry, exercise, sessions, cycleDay, variant) → { weight, repsPerSet, bumped }`. Finds most recent completed session for the `(cycleDay, variant)` pair, filters its sets to `exerciseId`, and applies double-progression: weighted bumps by `weightIncrement` if every working-weight set hit top; bodyweight prescribes top-of-range if every set hit top. Mode-with-max-tiebreak picks the "working weight" so mid-session bumps don't fake a bump |
| `src/components/BottomNav.tsx` | Fixed 4-tab bottom nav (Today / History / Progress / Settings) |
| `src/components/VariantToggle.tsx` | Gym/Home segmented control |
| `src/components/ExerciseCard.tsx` | Read-only card (used pre-session). Takes `sessions` + `cycleDay` + `variant`, calls `prescribeForEntry` for the `@ weight` display so the pre-start preview matches what the next in-session render will show |
| `src/components/InteractiveExerciseCard.tsx` | In-session card. Takes `sessions` + `cycleDay` + `variant`. Computes one `Prescription` via `useMemo`, passes per-set `target = { weight: prescription.weight, reps: prescription.repsPerSet[i] }` into each `<SetRow>`, and forwards the same `target` up through `onLogSet` so the dispatched `LOG_SET` records the exact thing the UI showed |
| `src/components/SetRow.tsx` | One set: `[−] weight [+]   [−] reps [+]   [✓]`, plus tag chips on logged rows. Draft state initialised from target; displays logged values once logged |
| `src/components/RestTimer.tsx` | Fixed banner above bottom nav (`bottom-16`). Shows `mm:ss`, tap to skip. Auto-hides when idle |
| `src/screens/TodayScreen.tsx` | Reads `useWorkout()` + `useRestTimer()`. Branches on `inProgressSession`: read-only + Start vs interactive + Finish/Cancel. Passes `sessions={workout.sessions}` + `cycleDay={activeCycleDay}` + `variant={variant}` into both card components so progression drives the prescription. Threads per-set `target` through `handleLogSet` into the dispatched `LOG_SET`. Timer banner always mounted (self-hides) |
| `src/screens/{History,Progress,Settings}Screen.tsx` | "Coming soon" stubs |
| `tailwind.config.js`, `postcss.config.js` | Tailwind v3 config |
| `tsconfig.app.json` | TS config — `verbatimModuleSyntax: true`, `resolveJsonModule: true`, includes `sample-workout.json` |
| `vite.config.ts`, `eslint.config.js`, `index.html` | Standard Vite scaffold |

## Tech stack

- **Vite 8 + React 19 + TypeScript 6** (Vite scaffold defaults — React 19 with strict mode, TS with `verbatimModuleSyntax`)
- **Tailwind CSS v3** (NOT v4 — v3 was specified to follow the standard PostCSS plugin path; v4 has a different setup)
- **react-router-dom v7** for nav
- Node v23 (npm warns about engine mismatch on some devDeps; safe to ignore for now)

## Build / run

```bash
npm install            # install deps
npm run dev            # Vite dev server on http://localhost:5173/
npm run build          # tsc -b && vite build → dist/
npm run preview        # serve dist/
npm run lint           # ESLint
```

## Conventions

- **TypeScript over JS** (data model is the product; type safety catches refactor bugs).
- **Mobile-first Tailwind**, max-width container `max-w-md` (~448px). Bottom nav is fixed 64px tall; main content has `pb-20` so cards aren't hidden.
- **`import type` for type-only imports** — required by `verbatimModuleSyntax: true`.
- **`noUnusedLocals` + `noUnusedParameters`** enabled — keep code tight or build will fail.
- **JSON imports** require both `resolveJsonModule: true` AND the file in tsconfig `include`. `sample-workout.json` is at project root, not under `src/`.
- **Library over duplication**: every exercise lives once in `exercises[]` and is referenced by `id` from the routine and (eventually) sessions.
- **Defer technical decisions to Claude** — David arbitrates UX/feel/visual, not schema/backend choices.
- **Snappy is a hard requirement** — flag any choice that could introduce lag.

## Reference files

Deep detail lives in the project memory files:
- `~/.claude/projects/-Users-dtc32-Library-CloudStorage-OneDrive-DukeUniversity-Documents-Personal-Coding-Projects-gym-buddy/memory/MEMORY.md` — current state snapshot
- `~/.claude/projects/-Users-dtc32-Library-CloudStorage-OneDrive-DukeUniversity-Documents-Personal-Coding-Projects-gym-buddy/memory/architecture.md` — module relationships, data flow, type model, data shape
