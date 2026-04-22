import { createContext, useContext, useEffect, useMemo, useReducer } from 'react';
import type { Dispatch, ReactNode } from 'react';
import { workout as seed } from '../data/sampleWorkout';
import { loadWorkout, saveWorkout } from '../data/storage';
import { prescribeForEntry } from '../utils/progression';
import type {
  CycleDay,
  Session,
  SessionSet,
  SessionTag,
  Settings,
  Variant,
  WorkoutData,
} from '../types/workout';

export type SessionAction =
  | { type: 'START_SESSION'; variant: Variant }
  | {
      type: 'LOG_SET';
      routineEntryIndex: number;
      setNumber: number;
      weight: number | null;
      reps: number;
      target?: { weight: number | null; reps: number };
    }
  | {
      type: 'TAG_SET';
      routineEntryIndex: number;
      setNumber: number;
      tag: SessionTag | undefined;
    }
  | { type: 'FINISH_SESSION' }
  | { type: 'CANCEL_SESSION' }
  | { type: 'UPDATE_SETTINGS'; patch: Partial<Settings> }
  | { type: 'IMPORT_WORKOUT'; data: WorkoutData };

const NEXT_CYCLE: Record<CycleDay, CycleDay> = {
  push: 'pull',
  pull: 'legs',
  legs: 'push',
};

function genId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `sess_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function toDateStr(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function reducer(state: WorkoutData, action: SessionAction): WorkoutData {
  switch (action.type) {
    case 'START_SESSION': {
      if (state.state.inProgressSessionId) return state;
      const id = genId();
      const now = new Date();
      const session: Session = {
        id,
        date: toDateStr(now),
        cycleDay: state.state.nextCycleDay,
        variant: action.variant,
        status: 'in-progress',
        startedAt: now.toISOString(),
        completedAt: null,
        sets: [],
      };
      return {
        ...state,
        settings: { ...state.settings, lastVariant: action.variant },
        sessions: [...state.sessions, session],
        state: { ...state.state, inProgressSessionId: id },
      };
    }

    case 'LOG_SET': {
      const sessionId = state.state.inProgressSessionId;
      if (!sessionId) return state;
      const session = state.sessions.find((s) => s.id === sessionId);
      if (!session) return state;

      const entry =
        state.routine.days[session.cycleDay][session.variant][action.routineEntryIndex];
      if (!entry) return state;

      const exercise = state.exercises.find((e) => e.id === entry.exerciseId);
      if (!exercise) return state;

      let target = action.target;
      if (!target) {
        const prescription = prescribeForEntry(
          entry,
          exercise,
          state.sessions,
          session.cycleDay,
          session.variant,
        );
        target = {
          weight: prescription.weight,
          reps: prescription.repsPerSet[action.setNumber - 1] ?? 0,
        };
      }

      const existingIdx = session.sets.findIndex(
        (s) =>
          s.routineEntryIndex === action.routineEntryIndex &&
          s.setNumber === action.setNumber,
      );
      const existingTag = existingIdx >= 0 ? session.sets[existingIdx].tag : undefined;

      const logged: SessionSet = {
        exerciseId: entry.exerciseId,
        routineEntryIndex: action.routineEntryIndex,
        setNumber: action.setNumber,
        target,
        actual: { weight: action.weight, reps: action.reps },
        tag: existingTag,
      };

      const newSets =
        existingIdx >= 0
          ? session.sets.map((s, i) => (i === existingIdx ? logged : s))
          : [...session.sets, logged];

      return {
        ...state,
        sessions: state.sessions.map((s) =>
          s.id === sessionId ? { ...s, sets: newSets } : s,
        ),
      };
    }

    case 'TAG_SET': {
      const sessionId = state.state.inProgressSessionId;
      if (!sessionId) return state;
      return {
        ...state,
        sessions: state.sessions.map((s) => {
          if (s.id !== sessionId) return s;
          return {
            ...s,
            sets: s.sets.map((set) => {
              if (
                set.routineEntryIndex !== action.routineEntryIndex ||
                set.setNumber !== action.setNumber
              ) {
                return set;
              }
              return { ...set, tag: action.tag };
            }),
          };
        }),
      };
    }

    case 'FINISH_SESSION': {
      const sessionId = state.state.inProgressSessionId;
      if (!sessionId) return state;
      const session = state.sessions.find((s) => s.id === sessionId);
      if (!session) return state;
      const now = new Date();
      return {
        ...state,
        sessions: state.sessions.map((s) =>
          s.id === sessionId
            ? { ...s, status: 'complete', completedAt: now.toISOString() }
            : s,
        ),
        state: {
          ...state.state,
          lastSessionDate: toDateStr(now),
          nextCycleDay: NEXT_CYCLE[session.cycleDay],
          inProgressSessionId: null,
        },
      };
    }

    case 'CANCEL_SESSION': {
      const sessionId = state.state.inProgressSessionId;
      if (!sessionId) return state;
      return {
        ...state,
        sessions: state.sessions.filter((s) => s.id !== sessionId),
        state: { ...state.state, inProgressSessionId: null },
      };
    }

    case 'UPDATE_SETTINGS': {
      return {
        ...state,
        settings: { ...state.settings, ...action.patch },
      };
    }

    case 'IMPORT_WORKOUT': {
      return action.data;
    }
  }
}

type ParseResult =
  | { ok: true; data: WorkoutData }
  | { ok: false; error: string };

const REQUIRED_KEYS: Array<keyof WorkoutData> = [
  'version',
  'settings',
  'exercises',
  'routine',
  'sessions',
  'state',
];

// eslint-disable-next-line react-refresh/only-export-components
export function parseWorkoutJSON(raw: string): ParseResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { ok: false, error: 'Invalid JSON' };
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return { ok: false, error: 'Expected a JSON object' };
  }

  const obj = parsed as Record<string, unknown>;
  for (const key of REQUIRED_KEYS) {
    if (!(key in obj)) {
      return { ok: false, error: `Missing required field: ${key}` };
    }
  }

  if (typeof obj.version !== 'number') {
    return { ok: false, error: 'Field "version" must be a number' };
  }
  if (obj.version !== 1) {
    return { ok: false, error: 'Unsupported version' };
  }
  if (!obj.settings || typeof obj.settings !== 'object') {
    return { ok: false, error: 'Field "settings" must be an object' };
  }
  if (!Array.isArray(obj.exercises)) {
    return { ok: false, error: 'Field "exercises" must be an array' };
  }
  if (!obj.routine || typeof obj.routine !== 'object') {
    return { ok: false, error: 'Field "routine" must be an object' };
  }
  if (!Array.isArray(obj.sessions)) {
    return { ok: false, error: 'Field "sessions" must be an array' };
  }
  if (!obj.state || typeof obj.state !== 'object') {
    return { ok: false, error: 'Field "state" must be an object' };
  }

  return { ok: true, data: obj as unknown as WorkoutData };
}

interface ContextValue {
  workout: WorkoutData;
  inProgressSession: Session | null;
  dispatch: Dispatch<SessionAction>;
}

const SessionContext = createContext<ContextValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [workout, dispatch] = useReducer(reducer, seed, (s) => loadWorkout(s));

  useEffect(() => {
    saveWorkout(workout);
  }, [workout]);

  const inProgressSession = useMemo(
    () =>
      workout.sessions.find((s) => s.id === workout.state.inProgressSessionId) ??
      null,
    [workout.sessions, workout.state.inProgressSessionId],
  );

  const value = useMemo<ContextValue>(
    () => ({ workout, inProgressSession, dispatch }),
    [workout, inProgressSession],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useWorkout(): ContextValue {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useWorkout must be used inside <SessionProvider>');
  return ctx;
}
