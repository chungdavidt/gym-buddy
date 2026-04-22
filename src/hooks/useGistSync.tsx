import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { ReactNode } from 'react';
import {
  parseWorkoutJSON,
  stripSecrets,
  useWorkout,
  withLocalSecrets,
} from '../state/sessionStore';
import { createGist, readGist, updateGist } from '../data/gistSync';
import type { WorkoutData } from '../types/workout';

export type SyncStatus = 'idle' | 'pushing' | 'pulling' | 'error';

export interface GistSyncValue {
  status: SyncStatus;
  lastSyncedAt: string | null;
  lastError: string | null;
  enabled: boolean;
  canPull: boolean;
  pushNow: () => Promise<void>;
  pullNow: () => Promise<void>;
}

const GistSyncContext = createContext<GistSyncValue | null>(null);

const STATUS_KEY = 'gym-buddy:sync:status:v1';
const LAST_PUSHED_KEY = 'gym-buddy:sync:lastPushedSessionDate';

interface PersistedSyncState {
  status: SyncStatus;
  lastSyncedAt: string | null;
  lastError: string | null;
}

const DEFAULT_PERSISTED: PersistedSyncState = {
  status: 'idle',
  lastSyncedAt: null,
  lastError: null,
};

function loadPersisted(): PersistedSyncState {
  try {
    const raw = localStorage.getItem(STATUS_KEY);
    if (!raw) return DEFAULT_PERSISTED;
    const parsed = JSON.parse(raw) as Partial<PersistedSyncState> | null;
    if (!parsed || typeof parsed !== 'object') return DEFAULT_PERSISTED;
    // Never resume mid-flight — if the tab died while pushing, we don't
    // know if the request landed. Fall back to idle; lastError surfaces
    // any previously-persisted failure.
    const status: SyncStatus =
      parsed.status === 'error' ? 'error' : 'idle';
    return {
      status,
      lastSyncedAt:
        typeof parsed.lastSyncedAt === 'string' ? parsed.lastSyncedAt : null,
      lastError:
        typeof parsed.lastError === 'string' ? parsed.lastError : null,
    };
  } catch {
    return DEFAULT_PERSISTED;
  }
}

function persistSyncState(s: PersistedSyncState): void {
  try {
    localStorage.setItem(STATUS_KEY, JSON.stringify(s));
  } catch {
    // ignore
  }
}

function loadLastPushed(): string | null {
  try {
    return localStorage.getItem(LAST_PUSHED_KEY);
  } catch {
    return null;
  }
}

function persistLastPushed(v: string | null): void {
  try {
    if (v === null) localStorage.removeItem(LAST_PUSHED_KEY);
    else localStorage.setItem(LAST_PUSHED_KEY, v);
  } catch {
    // ignore
  }
}

export function GistSyncProvider({ children }: { children: ReactNode }) {
  const { workout, dispatch } = useWorkout();

  // Latest-workout ref so async callbacks stringify the current state at
  // the moment the push fires, not whatever was current when the callback
  // was created.
  const workoutRef = useRef<WorkoutData>(workout);
  useEffect(() => {
    workoutRef.current = workout;
  }, [workout]);

  const persisted = useMemo(() => loadPersisted(), []);
  const [status, setStatus] = useState<SyncStatus>(persisted.status);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(
    persisted.lastSyncedAt,
  );
  const [lastError, setLastError] = useState<string | null>(persisted.lastError);

  useEffect(() => {
    persistSyncState({ status, lastSyncedAt, lastError });
  }, [status, lastSyncedAt, lastError]);

  const lastPushedRef = useRef<string | null>(loadLastPushed());
  const inFlightRef = useRef<'push' | 'pull' | null>(null);

  const setLastPushed = useCallback((v: string | null) => {
    lastPushedRef.current = v;
    persistLastPushed(v);
  }, []);

  const runPush = useCallback(async (): Promise<void> => {
    if (inFlightRef.current !== null) return;
    const current = workoutRef.current;
    const token = current.settings.gistToken;
    if (!token) return;

    inFlightRef.current = 'push';
    setStatus('pushing');
    setLastError(null);
    try {
      // Strip gistToken/gistId before serializing — GitHub's secret scanner
      // finds + revokes any token in pushed gist bodies, even private ones.
      const body = JSON.stringify(stripSecrets(current));
      const gistId = current.settings.gistId;
      if (!gistId) {
        const res = await createGist(token, body);
        if (!res.ok) {
          setStatus('error');
          setLastError(res.error);
          return;
        }
        dispatch({
          type: 'UPDATE_SETTINGS',
          patch: { gistId: res.value.id },
        });
        setLastSyncedAt(res.value.updatedAt);
      } else {
        const res = await updateGist(token, gistId, body);
        if (!res.ok) {
          setStatus('error');
          setLastError(res.error);
          return;
        }
        setLastSyncedAt(res.value.updatedAt);
      }
      setStatus('idle');
      setLastPushed(current.state.lastSessionDate ?? null);
    } finally {
      inFlightRef.current = null;
    }
  }, [dispatch, setLastPushed]);

  const pushNow = useCallback(async (): Promise<void> => {
    await runPush();
  }, [runPush]);

  const pullNow = useCallback(async (): Promise<void> => {
    if (inFlightRef.current !== null) return;
    const current = workoutRef.current;
    const token = current.settings.gistToken;
    const gistId = current.settings.gistId;
    if (!token || !gistId) return;

    inFlightRef.current = 'pull';
    setStatus('pulling');
    setLastError(null);
    try {
      const res = await readGist(token, gistId);
      if (!res.ok) {
        setStatus('error');
        setLastError(res.error);
        return;
      }
      const parsed = parseWorkoutJSON(res.value.content);
      if (!parsed.ok) {
        setStatus('error');
        setLastError(`Gist content invalid: ${parsed.error}`);
        return;
      }
      // Pulled gist has stripped credentials; preserve the local token +
      // gistId so a restore doesn't wipe them out of the Settings form.
      const merged = withLocalSecrets(parsed.data, {
        gistToken: current.settings.gistToken,
        gistId: current.settings.gistId,
      });
      dispatch({ type: 'IMPORT_WORKOUT', data: merged });
      setLastSyncedAt(res.value.updatedAt);
      // Force the next FINISH to push — user may have just logged on the
      // other device and want this one's next write to propagate.
      setLastPushed(null);
      setStatus('idle');
    } finally {
      inFlightRef.current = null;
    }
  }, [dispatch, setLastPushed]);

  const lastSessionDate = workout.state.lastSessionDate;
  const token = workout.settings.gistToken;
  useEffect(() => {
    if (!token) return;
    if (!lastSessionDate) return;
    if (lastSessionDate === lastPushedRef.current) return;
    void runPush();
  }, [lastSessionDate, token, runPush]);

  const enabled = token !== null && token !== '';
  const gistId = workout.settings.gistId;
  const canPull = enabled && gistId !== null && gistId !== '';

  const value = useMemo<GistSyncValue>(
    () => ({
      status,
      lastSyncedAt,
      lastError,
      enabled,
      canPull,
      pushNow,
      pullNow,
    }),
    [status, lastSyncedAt, lastError, enabled, canPull, pushNow, pullNow],
  );

  return (
    <GistSyncContext.Provider value={value}>{children}</GistSyncContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useGistSync(): GistSyncValue {
  const ctx = useContext(GistSyncContext);
  if (!ctx) throw new Error('useGistSync must be used inside <GistSyncProvider>');
  return ctx;
}
