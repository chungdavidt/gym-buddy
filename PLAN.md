# Gym Buddy — Design Plan

*Living document. Add to this as decisions evolve. Last updated: 2026-04-19.*

---

## What this is

A personal workout tracking app for David. Primary device: iPhone (Safari). The product goal in one sentence:

> An app that **tells you what to lift today**, lets you log it with minimal taps, and shows you your progress over time — with no decision fatigue.

---

## Tech stack

- **Vite + React + TypeScript**
- **Tailwind CSS** for styling
- **Recharts** for progress charts
- **PWA** (Progressive Web App — a website you can "install" to your home screen that works offline and feels like a native app)
- Local data in **IndexedDB** or **localStorage**
- **GitHub Gist** for cloud backup/sync (not optional — see "Backup" section below)
- Hosted on **GitHub Pages** (free static hosting)

---

## Design principles

1. **Built to be used, not a side project.** This is a daily-driver app David intends to use for years. Every technical decision should be weighed against 5-year maintenance cost: prefer fewer dependencies over more, stable formats over clever ones, boring over novel. A versioned `WorkoutData` schema, backup that survives iOS Safari ITP purges, and a deployment that David can re-deploy two years from now without re-learning the toolchain are all more valuable than any individual feature.
2. **Prescriptive, not passive.** The app picks your weights and rep targets. You don't decide.
3. **User feedback refines predictions.** Per-set adjustment tags (`too heavy` / `too easy` / freeform note) feed back into future prescriptions.
4. **Gym/Home toggle, not exercise swapping.** Each day has two pre-authored variants. You tap one; exercises just appear.
5. **Auto-save every set.** If Safari tab dies or your phone crashes mid-workout, you reopen and you're exactly where you left off.
6. **Big buttons, fast taps.** The workout screen is designed for sweaty fingers with the phone on the gym floor.
7. **Library over duplication.** Every exercise exists once in a library and is referenced by ID from the routine and session logs.

---

## Routine structure

### PPL (Push / Pull / Legs), rotating cycle

- **Not calendar-based.** "Next workout" = whatever comes after the last workout you completed, regardless of weekday.
- **Rule: no more than 2 rest days in a row.** The Today screen nudges mildly after 1 rest day, harder after 2.
- Cycle order: Push → Pull → Legs → repeat.

### Two variants per day: Gym and Home

- **Gym variant** = barbell / dumbbell / cable / machine exercises. Weighted, progressively loaded.
- **Home variant** = bodyweight / calisthenics. Mostly disjoint exercise list from gym (push-ups, dips, handstand progressions, etc.).
- **Toggle at the top of the Today screen** chooses variant. Default = most recent choice.

---

## Progression scheme: Double Progression

Each exercise has:
- A **rep range** (e.g., 8-12 reps)
- A **set count** (e.g., 3 sets)
- A **current weight** (updates based on history)
- A **weight increment** (e.g., +5 lb for upper body, +10 lb for squat/deadlift)

### How it works

- Stay at the same weight until you hit **the top of the rep range on every set**.
- Then the app bumps the weight by the increment and resets reps to the bottom of the range.
- User's `too heavy` / `too easy` tags modify what the app prescribes next session.
- First time the app sees an exercise with no history: ask user for starting weight.

### Example flow (Bench Press, 3 × 8-12)

| Session | App prescribes | You log | Next session says |
|---------|---------------|---------|-------------------|
| 1 | 135 × 8-12 | 10, 9, 8 | 135, aim higher |
| 2 | 135 × 8-12 | 11, 10, 9 | 135, aim higher |
| 3 | 135 × 8-12 | 12, 12, 11 | 135, close to bumping |
| 4 | 135 × 8-12 | 12, 12, 12 | **Bump to 140 × 8** |
| 5 | 140 × 8-12 | 8, 8, 7 | 140, grind back up |

---

## Screens (4 total)

### 1. Today
- Current position in the PPL rotation.
- Gym/Home toggle at top.
- Prescribed exercises with sets/reps/weight.
- Set-by-set logging with auto-save.
- Rest timer between sets.

### 2. History
- Chronological list of past sessions.
- Tap a session to see its details.

### 3. Progress
- **Per-exercise trend** — weight or reps over time (line chart), PRs marked.
- **Weekly volume per muscle group** (bar chart) — shows training balance.
- **Consistency heatmap** — GitHub-contributions-style grid of days you trained.
- *(Running charts deferred — see "Deferred" below.)*

### 4. Settings
- Routine editor (v1: raw JSON text area; v2: proper UI if JSON gets annoying).
- Export/import JSON manually.
- GitHub Gist token input.
- Units (lb/kg).

---

## In-workout UX — the 90% screen

The workout screen is where 90% of your time in the app is spent. It has to be great.

### Set row layout
```
Set 1    [ − ]  135 lb  [ + ]    [ − ]  10  [ + ]  reps    [ ✓ ]
```

### Interaction rules
- Weight pre-filled with target weight (from prescription).
- Reps field pre-filled with smart default — middle of range, or previous set's actual reps.
- Tap `+` / `−` to adjust by 1 rep, or by weight increment (e.g., 5 lb).
- **Long-press** `+` / `−` for rapid scroll.
- **Tap the number itself** to pop up a numeric keypad for precise entry.
- Tap `✓` to log the set → rest timer auto-starts → next set row becomes active.
- Optional per-set adjustment tag: `too_heavy` / `too_easy` / freeform note.
- Every interaction auto-saves. No "finish workout" button required.

---

## Data model (sketch, not final)

Three top-level collections:

### 1. Exercises (library)
```
{
  id: string,
  name: string,
  muscles: string[],              // e.g., ["chest", "triceps"]
  notes?: string,
  defaultRepRange: [number, number],
  defaultSets: number,
  weightIncrement: number         // e.g., 5 (lb)
}
```

### 2. Routine
```
{
  push: { gym: [exerciseRef, ...], home: [exerciseRef, ...] },
  pull: { ... },
  legs: { ... }
}
```
Where `exerciseRef` = `{ exerciseId, sets, repRange, startingWeight? }`.

### 3. Sessions
```
{
  id: string,
  date: string,
  cycleDay: 'push' | 'pull' | 'legs',
  variant: 'gym' | 'home',
  sets: [
    {
      exerciseId: string,
      target: { weight, reps },
      actual: { weight, reps },
      tag?: 'too_heavy' | 'too_easy' | string
    }
  ]
}
```

We'll formalize this in an actual JSON schema later.

---

## Backup / data persistence

### The problem
iOS Safari purges PWA local storage after ~7 days of no use. IndexedDB is more durable than localStorage but not bulletproof. Apple has aggressive "Intelligent Tracking Prevention" (ITP) that affects PWAs.

### The solution
**GitHub Gist auto-sync.**
- A Gist is a single-file hosted snippet on GitHub, accessible via API. Can be made secret (unlisted, not indexed).
- User generates a **Personal Access Token (PAT)** with `gist` scope, pastes it into Settings.
- App writes the full workout JSON to the Gist after every session.
- If phone dies or Safari evicts data: reinstall app, paste token, app pulls the Gist and restores state.

### Bonus
The Gist doubles as a **sync mechanism** across devices. Edit routine on a laptop, check progress from desktop — all devices read/write the same Gist.

### Fallback
Manual JSON export/import button in Settings for weekly emails-to-self or iCloud Drive backups.

---

## Deferred (not in v1)

- **Running.** Different data shape (distance, pace, duration). Will add later as a separate session type via discriminated union on `session.type`.
- **Routine editor UI.** v1 is raw JSON text area in Settings. Upgrade to a proper editor only if editing JSON becomes painful.
- **Advanced progression** — deload logic, planned programs, periodization.
- **Social / sharing features.** Never, probably.

---

## Open questions / TODO

- [ ] **Actual PPL routine** — exercises per day, sets, rep ranges, starting weights, for both gym and home variants.
- [ ] **Weight increment conventions** — confirm +5 lb upper body, +10 lb squat/deadlift.
- [ ] **Home variant progression** — bodyweight doesn't load progressive weight. How to represent "progress" for push-ups? Options: (a) more reps only, (b) harder variation progression (knee push-ups → regular → archer → one-arm).
- [ ] **Rep range defaults** for exercises without specified ranges.
- [ ] **Rest timer defaults** — per exercise? Global? User-configurable?
- [ ] **Units** — lb vs kg (presumably lb, US).
- [ ] **First-session starting weights** — does the app prompt on first log, or does routine specify?
- [ ] **Exercise library seeding** — via routine editor, separate library screen, or both?

---

## Working agreements (how we collaborate on this project)

- **TypeScript, not JavaScript.** The data model is the product; type safety catches refactor bugs.
- **Define acronyms on first use** (global memory rule — applies to all conversations).
- **Push back on weak reasoning.** Don't concede without a real argument. David has explicitly called this out.
- **Pragmatic over principled** when the tradeoff is close. Accept some duplication, save the abstraction for when it hurts.
- **Iterate, don't over-analyze.** One thorough read → start building → fix issues as they surface.
- **Defer technical decisions to Claude.** David doesn't arbitrate schema / backend / implementation choices — only UX, feel, and visual design. Claude locks in technical calls with a brief rationale; David pushes back only if something feels wrong to use.
- **Snappy is a hard requirement.** Any implementation choice that could introduce lag gets flagged as a UX concern.

---

## Changelog

- **2026-04-19** — Initial plan drafted. Tech stack, design principles, PPL rotation model, double progression, 4 screens, in-workout UX, data model sketch, backup strategy, deferred items, open questions.
- **2026-04-22** — Added "Built to be used, not a side project" as design principle #1. Intent: decisions are made for 5-year maintainability, not experimentation.
