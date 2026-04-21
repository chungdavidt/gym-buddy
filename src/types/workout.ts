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
}

export interface SessionSet {
  exerciseId: string;
  target: { weight: number | null; reps: number };
  actual: { weight: number | null; reps: number };
  tag?: 'too_heavy' | 'too_easy' | string;
}

export interface Session {
  id: string;
  date: string;
  cycleDay: CycleDay;
  variant: Variant;
  sets: SessionSet[];
}

export interface State {
  lastSessionDate: string | null;
  nextCycleDay: CycleDay;
}

export interface WorkoutData {
  version: number;
  settings: Settings;
  exercises: Exercise[];
  routine: Routine;
  sessions: Session[];
  state: State;
}
