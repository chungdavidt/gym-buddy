# Gym Buddy — Personal workout tracker (PWA, mobile-first)

A personal workout app for David. Primary device: iPhone Safari. Tells him what to lift today, lets him log it with minimal taps, shows progress over time. Currently at the end of **Phase 4c**: ships as an installable PWA via GitHub Pages. Home-screen icon opens fullscreen Safari, bundle is precached by a service worker, URL is `https://chungdavidt.github.io/gym-buddy/`. GitHub Actions builds + deploys on every push to `main`.

## Project state

- **Phase 1 (done, committed)**: Vite + React + TS + Tailwind scaffold; bottom-tab nav; read-only Today screen. Initial commit on `main`.
- **Phase 2 (done, uncommitted)**: Session lifecycle (start/log/tag/finish/cancel) via `useReducer` + Context, localStorage persistence under versioned key `gym-buddy:workout:v1`, interactive set rows with `+`/`-` + `✓`, per-set too-heavy/too-easy chips, wall-clock rest timer with Web-Audio chime (iOS audio unlocked via user-gesture `start()` call), `state.nextCycleDay` rotation on Finish.
- **Phase 3 (done, uncommitted)**: Double-progression. Pure util `prescribeForEntry(entry, exercise, sessions, cycleDay, variant)` → `{ weight, repsPerSet, bumped }`. Both card components call the util via `useMemo`; `TodayScreen` threads the per-set prescription into `LOG_SET` so each `SessionSet.target` records what was shown. Reducer falls back to the util if no target is passed. Weighted: hit top on every working-weight set → `weight + weightIncrement`, reset reps to bottom of range; else hold and prefill reps from last actuals. Bodyweight: hit top → aim for top on every set; else prefill from last actuals. `too_heavy` / `too_easy` still captured but ignored by prescription (Phase 3.5).
- **Phase 4a (done, uncommitted)**: Real Settings screen. Two new reducer actions — `UPDATE_SETTINGS { patch: Partial<Settings> }` (immediate writes, no Save button) and `IMPORT_WORKOUT { data: WorkoutData }` (wholesale replace). New pure helper `parseWorkoutJSON(raw)` validates JSON + top-level shape + `version === 1`. New `src/utils/download.ts` one-shot Blob → anchor download. `SettingsScreen` exposes six sections: Units (`lb`/`kg` segmented), Default rest (`[−15] [+15]` stepper, 30–300s), Cloud backup preview (Gist token + Gist ID, stored but unused), Manual backup (Export button + Import textarea + Apply, with local error surface), Danger zone (Clear all data → `clearWorkout()` + `location.reload()`, behind `window.confirm`), and About (version / last session date / completed count).
- **Phase 4b (done, uncommitted)**: GitHub Gist sync. New pure `src/data/gistSync.ts` wraps `fetch` against `api.github.com/gists` — `createGist` / `updateGist` / `readGist`, each returns `{ ok: true; value } | { ok: false; error }`. New `src/hooks/useGistSync.tsx` context (wrapped between `SessionProvider` and `RestTimerProvider` in `App.tsx`) owns `status | lastSyncedAt | lastError`, auto-pushes on `workout.state.lastSessionDate` transitions (dedupe via `lastPushedRef` persisted to `localStorage['gym-buddy:sync:lastPushedSessionDate']`), exposes `pushNow()` + `pullNow()`. Settings Cloud-backup section now renders a status line + Push/Pull buttons (Pull gated by `window.confirm`). Conflict policy is last-write-wins; no auto-pull on boot. No new npm deps — native `fetch` + GitHub REST API.
- **Phase 4c (done, uncommitted)**: GitHub Pages deployment + PWA. Four threads wired together: (1) `.github/workflows/deploy.yml` — Node 22 runner, `npm ci --legacy-peer-deps` + `npm run build`, upload `dist/` via `actions/upload-pages-artifact@v3`, deploy via `actions/deploy-pages@v4`. Triggers on push to `main` + manual `workflow_dispatch`. (2) `vite.config.ts` — mode-conditional `base: mode === 'production' ? '/gym-buddy/' : '/'` so dev still serves from `/`, prod emits `/gym-buddy/`-prefixed URLs. (3) `VitePWA` plugin from `vite-plugin-pwa@^1.2.0` — `registerType: 'autoUpdate'`, full manifest (name / short_name / theme_color `#4f46e5` / background `#f8fafc` / `display: standalone` / `orientation: portrait` / `scope` and `start_url` both `/gym-buddy/` / 3 icons), workbox precaches `{js,css,html,svg,png,ico,webmanifest}`. Emits `dist/manifest.webmanifest`, `dist/sw.js`, `dist/workbox-*.js`, `dist/registerSW.js`. (4) `src/main.tsx` — `BrowserRouter` → `HashRouter` so `/gym-buddy/#/today` survives reload without needing a Pages 404 fallback. Three placeholder PNG icons in `public/` (slate-900 bg, white "GB") generated via Python/PIL. `index.html` adds 6 iOS/theme meta tags. One-time manual step: **Settings → Pages → Source → GitHub Actions** in the repo, otherwise first deploy's `deploy` job fails. `--legacy-peer-deps` required everywhere because `vite-plugin-pwa@1.2.0`'s peer range maxes at Vite 7; Vite 8 works with the plugin at runtime but npm's resolver refuses without the flag.
- **Phase 4d+ (not started)**: History screen, Progress charts.

See `PLAN.md` for the full design doc, `~/.claude/plans/lucky-discovering-biscuit.md` for the Phase 1 plan, `~/.claude/plans/ok-great-lets-start-virtual-harp.md` for the Phase 2 plan, `~/.claude/plans/bright-whistling-kite.md` for the Phase 3 plan, `~/.claude/plans/witty-beaming-lynx.md` for the Phase 4a plan, `~/.claude/plans/parsed-petting-sparrow.md` for the Phase 4b plan, and `~/.claude/plans/fluffy-exploring-otter.md` for the Phase 4c plan.

## Contents

| File / Dir | Description |
|------------|-------------|
| `PLAN.md` | Living design doc — tech stack, design principles, PPL routine, double-progression scheme, in-workout UX, data model, backup strategy, open questions |
| `README.md` | Default Vite-template README — not yet customized |
| `.gitignore` | Standard Vite/Node ignores + `.claude/settings.local.json` |
| `sample-workout.json` | Schema + seed data (settings, 32 exercises, full PPL gym/home routine, empty sessions, state with `inProgressSessionId: null`) — initial seed; live state lives in localStorage after first boot |
| `public/favicon.svg` | Default Vite favicon |
| `public/pwa-192x192.png` | 192×192 PWA icon (slate-900 square, white "GB" wordmark). Placeholder — swap in a real design when ready. |
| `public/pwa-512x512.png` | 512×512 PWA icon, same design. Used as both a regular icon and `purpose: 'any maskable'`. |
| `public/apple-touch-icon.png` | 180×180 iOS home-screen icon, same design. Referenced by `<link rel="apple-touch-icon">` in `index.html` because iOS Safari doesn't fully honor the web manifest. |
| `.github/workflows/deploy.yml` | GitHub Actions workflow — builds on Ubuntu with Node 22, deploys `dist/` to GitHub Pages on push to `main` or manual dispatch. Uses GitHub-maintained actions (`checkout@v4`, `setup-node@v4`, `configure-pages@v5`, `upload-pages-artifact@v3`, `deploy-pages@v4`). `npm ci --legacy-peer-deps` — required by the Vite 8 / vite-plugin-pwa peer-range mismatch. |
| `src/main.tsx` | Vite entry; mounts `<App/>` inside `<HashRouter>` — hash routing picked over `BrowserRouter` so `/#/settings` survives reload on Pages without a 404.html redirect hack. |
| `src/App.tsx` | Wraps routes in `<SessionProvider>` → `<GistSyncProvider>` → `<RestTimerProvider>`; same four routes + layout shell |
| `src/index.css` | Tailwind directives + minimal reset |
| `src/types/workout.ts` | All TS types — Exercise discriminated union, Routine, Session (with `status/startedAt/completedAt`), SessionSet (with `routineEntryIndex/setNumber`), State (with `inProgressSessionId`) |
| `src/data/sampleWorkout.ts` | Imports + type-asserts the seed JSON |
| `src/data/storage.ts` | `loadWorkout` / `saveWorkout` / `clearWorkout` over `localStorage` key `gym-buddy:workout:v1` |
| `src/data/gistSync.ts` | Pure `fetch` wrappers around GitHub's Gists REST API — `createGist(token, content)`, `updateGist(token, gistId, content)`, `readGist(token, gistId)`. Each returns `{ ok: true; value } | { ok: false; error }`. Writes/reads one private gist with a single file named `gym-buddy-data.json`. Classifies 401/403 → `"Invalid token"`, 404 → `"Gist not found"`, fetch reject → `"Network error"` |
| `src/state/sessionStore.tsx` | React Context + `useReducer`. Owns `WorkoutData`. Actions: `START_SESSION`, `LOG_SET` (with optional `target`), `TAG_SET`, `FINISH_SESSION`, `CANCEL_SESSION`, `UPDATE_SETTINGS` (partial merge), `IMPORT_WORKOUT` (wholesale replace). Auto-saves on every state change. If `LOG_SET` omits `target`, reducer calls `prescribeForEntry` as a fallback so stored history is never corrupted. Also exports pure `parseWorkoutJSON(raw)` helper — used by Settings import. Exports `SessionProvider`, `useWorkout()`, `parseWorkoutJSON` |
| `src/hooks/useRestTimer.tsx` | Wall-clock rest timer context. `start/stop/skip` + `remaining/isRunning`. Lazy `AudioContext` unlocked on first `start()` inside a user-gesture frame. StrictMode-safe chime via `firedRef` |
| `src/hooks/useGistSync.tsx` | Context provider + `useGistSync()` hook. Owns `status` (`'idle' \| 'pushing' \| 'pulling' \| 'error'`), `lastSyncedAt`, `lastError` — all persisted to `localStorage['gym-buddy:sync:status:v1']`. Auto-push effect fires when `workout.state.lastSessionDate` changes and dedupes via `lastPushedRef` persisted to `localStorage['gym-buddy:sync:lastPushedSessionDate']` (survives reload + React 19 StrictMode double-mount). `pushNow()` is unconditional; `pullNow()` GETs the gist, runs `parseWorkoutJSON`, dispatches `IMPORT_WORKOUT`, and clears `lastPushedRef` so the next finish re-pushes. `inFlightRef` blocks concurrent ops |
| `src/utils/format.ts` | `formatRepRange([low, high])` → `"6-8 reps"`; `formatDuration(seconds)` → `"m:ss"` |
| `src/utils/progression.ts` | Pure `prescribeForEntry(entry, exercise, sessions, cycleDay, variant) → { weight, repsPerSet, bumped }`. Finds most recent completed session for the `(cycleDay, variant)` pair, filters its sets to `exerciseId`, and applies double-progression: weighted bumps by `weightIncrement` if every working-weight set hit top; bodyweight prescribes top-of-range if every set hit top. Mode-with-max-tiebreak picks the "working weight" so mid-session bumps don't fake a bump |
| `src/utils/download.ts` | `downloadJSON(filename, data)` — `JSON.stringify` → Blob → object URL → synthetic anchor click → revoke. Used by the Settings "Export workout" button. DOM mutation lives here (not in the screen) so it's stubbable in future tests |
| `src/components/BottomNav.tsx` | Fixed 4-tab bottom nav (Today / History / Progress / Settings) |
| `src/components/VariantToggle.tsx` | Gym/Home segmented control |
| `src/components/ExerciseCard.tsx` | Read-only card (used pre-session). Takes `sessions` + `cycleDay` + `variant`, calls `prescribeForEntry` for the `@ weight` display so the pre-start preview matches what the next in-session render will show |
| `src/components/InteractiveExerciseCard.tsx` | In-session card. Takes `sessions` + `cycleDay` + `variant`. Computes one `Prescription` via `useMemo`, passes per-set `target = { weight: prescription.weight, reps: prescription.repsPerSet[i] }` into each `<SetRow>`, and forwards the same `target` up through `onLogSet` so the dispatched `LOG_SET` records the exact thing the UI showed |
| `src/components/SetRow.tsx` | One set: `[−] weight [+]   [−] reps [+]   [✓]`, plus tag chips on logged rows. Draft state initialised from target; displays logged values once logged |
| `src/components/RestTimer.tsx` | Fixed banner above bottom nav (`bottom-16`). Shows `mm:ss`, tap to skip. Auto-hides when idle |
| `src/screens/TodayScreen.tsx` | Reads `useWorkout()` + `useRestTimer()`. Branches on `inProgressSession`: read-only + Start vs interactive + Finish/Cancel. Passes `sessions={workout.sessions}` + `cycleDay={activeCycleDay}` + `variant={variant}` into both card components so progression drives the prescription. Threads per-set `target` through `handleLogSet` into the dispatched `LOG_SET`. Timer banner always mounted (self-hides) |
| `src/screens/SettingsScreen.tsx` | Real Settings screen (Phase 4a, extended in 4b). Dispatches `UPDATE_SETTINGS` on every control change (no Save button). Uses `parseWorkoutJSON` + `IMPORT_WORKOUT` for import and `downloadJSON` for export. Cloud-backup section reads `useGistSync()` for the status line + Push/Pull buttons (Pull gated by `window.confirm`). "Clear all data" calls `clearWorkout()` then `window.location.reload()` behind `window.confirm`. Local React state holds only the import textarea draft, a transient error string, and a 3-second toast |
| `src/screens/{History,Progress}Screen.tsx` | "Coming soon" stubs |
| `tailwind.config.js`, `postcss.config.js` | Tailwind v3 config |
| `tsconfig.app.json` | TS config — `verbatimModuleSyntax: true`, `resolveJsonModule: true`, includes `sample-workout.json` |
| `vite.config.ts` | `defineConfig(({ mode }) => ...)` — mode-conditional `base` (`/gym-buddy/` in prod, `/` in dev) + `VitePWA` plugin with full manifest (`start_url`/`scope` both `/gym-buddy/`, display `standalone`, portrait, theme `#4f46e5`, bg `#f8fafc`, 3 icons including maskable) + workbox precache glob. |
| `index.html` | Vite entry HTML. Includes 6 iOS/theme meta tags (`apple-touch-icon` link, `theme-color`, `apple-mobile-web-app-capable`, `apple-mobile-web-app-status-bar-style`, `apple-mobile-web-app-title`, `mobile-web-app-capable`) — required because iOS Safari doesn't fully honor the web manifest. `<link rel="manifest">` + `<script src="registerSW.js">` are auto-injected by `VitePWA`, don't add manually. |
| `eslint.config.js` | Standard Vite scaffold |

## Tech stack

- **Vite 8 + React 19 + TypeScript 6** (Vite scaffold defaults — React 19 with strict mode, TS with `verbatimModuleSyntax`)
- **Tailwind CSS v3** (NOT v4 — v3 was specified to follow the standard PostCSS plugin path; v4 has a different setup)
- **react-router-dom v7** via **`HashRouter`** (not `BrowserRouter`) — Pages-compatible without a 404.html redirect
- **vite-plugin-pwa@^1.2.0** (Workbox wrapper) for manifest + service worker
- Node v22 on CI (GitHub Actions); local is v23 (npm warns about engine mismatch on some devDeps; safe to ignore for now)

## Build / run

```bash
npm install --legacy-peer-deps   # vite-plugin-pwa@1.2.0 peer-range maxes at Vite 7; plain `npm install` fails
npm run dev                      # Vite dev server on http://localhost:5173/ (base = /, no SW)
npm run build                    # tsc -b && vite build → dist/ (base = /gym-buddy/, with manifest + sw.js)
npm run preview                  # serves dist/ on http://localhost:4173/gym-buddy/ — use this to exercise the PWA locally
npm run lint                     # ESLint
```

**Deploy**: push to `main` triggers `.github/workflows/deploy.yml` which publishes to `https://chungdavidt.github.io/gym-buddy/`. **One-time repo setup**: Settings → Pages → Source → **GitHub Actions**. The first deploy's `deploy` job will fail until this is set.

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
