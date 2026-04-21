# Gym Buddy — Personal workout tracker (PWA, mobile-first)

A personal workout app for David. Primary device: iPhone Safari. Tells him what to lift today, lets him log it with minimal taps, shows progress over time. Currently at the end of **Phase 1**: scaffold + read-only Today screen rendering from `sample-workout.json`.

## Project state

- **Phase 1 (done)**: Vite + React + TS + Tailwind scaffold; bottom-tab nav; read-only Today screen.
- **Phase 2+ (not started)**: set logging, rest timer, progression math, persistence (IndexedDB), routine editor, charts, PWA, Gist sync, deployment.

See `PLAN.md` for the full design doc and `~/.claude/plans/lucky-discovering-biscuit.md` for the Phase 1 plan.

## Contents

| File / Dir | Description |
|------------|-------------|
| `PLAN.md` | Living design doc — tech stack, design principles, PPL routine, double-progression scheme, in-workout UX, data model, backup strategy, open questions |
| `sample-workout.json` | Schema + seed data (settings, 32 exercises, full PPL gym/home routine, empty sessions, state) — current single source of data |
| `src/main.tsx` | Vite entry; mounts `<App/>` inside `<BrowserRouter>` |
| `src/App.tsx` | Routes (`/today`, `/history`, `/progress`, `/settings`; `/` → `/today`) + layout shell |
| `src/index.css` | Tailwind directives + minimal reset |
| `src/types/workout.ts` | All TS types for the workout JSON (Exercise discriminated union, Routine, Session, etc.) |
| `src/data/sampleWorkout.ts` | Imports + type-asserts the JSON |
| `src/components/BottomNav.tsx` | Fixed 4-tab bottom nav (Today / History / Progress / Settings) |
| `src/components/VariantToggle.tsx` | Gym/Home segmented control |
| `src/components/ExerciseCard.tsx` | Read-only display of one routine entry |
| `src/screens/TodayScreen.tsx` | Reads `state.nextCycleDay` + `settings.lastVariant`; renders cards |
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
