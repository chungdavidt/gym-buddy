export type Variant = 'gym' | 'home';
export type CycleDay = 'push' | 'pull' | 'legs';
export type Units = 'lb' | 'kg';

export type Muscle = string;

interface ExerciseBase {
  id: string;
  name: string;
  muscles: Muscle[];
  notes?: string;
}

export interface WeightedExercise extends ExerciseBase {
  type: 'weighted';
  weightIncrement: number;
}

export interface BodyweightExercise extends ExerciseBase {
  type: 'bodyweight';
}

export type Exercise = WeightedExercise | BodyweightExercise;

export interface RoutineEntry {
  exerciseId: string;
  sets: number;
  repRange: [number, number];
  startingWeight?: number;
}

export type RoutineDay = {
  [V in Variant]: RoutineEntry[];
};

export interface Routine {
  cycle: CycleDay[];
  restDayRule: { maxConsecutive: number };
  days: { [D in CycleDay]: RoutineDay };
}

export interface Settings {
  units: Units;
  defaultRestSeconds: number;
  lastVariant: Variant;
  gistToken: string | null;
  gistId: string | null;
  /**
   * Body weight in `units`, unconverted (same convention as every other stored
   * weight — see `units` being a display label only). Used solely by the
   * calorie estimate. Optional because pre-Phase-5 localStorage blobs and Gist
   * backups lack the key entirely; the schema version deliberately stays at 1.
   */
  bodyWeight?: number | null;
}

export type SessionStatus = 'in-progress' | 'complete';

export type SessionTag = 'too_heavy' | 'too_easy';

export interface SessionSet {
  exerciseId: string;
  routineEntryIndex: number;
  setNumber: number;
  target: { weight: number | null; reps: number };
  actual: { weight: number | null; reps: number };
  tag?: SessionTag;
}

export interface Session {
  id: string;
  date: string;
  cycleDay: CycleDay;
  variant: Variant;
  status: SessionStatus;
  startedAt: string;
  completedAt: string | null;
  sets: SessionSet[];
}

export interface State {
  lastSessionDate: string | null;
  nextCycleDay: CycleDay;
  inProgressSessionId: string | null;
}

export interface WorkoutData {
  version: number;
  settings: Settings;
  exercises: Exercise[];
  routine: Routine;
  sessions: Session[];
  state: State;
}
