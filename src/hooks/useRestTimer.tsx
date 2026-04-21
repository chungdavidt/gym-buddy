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

interface RestTimerValue {
  remaining: number;
  isActive: boolean;
  isDone: boolean;
  start: (seconds: number) => void;
  stop: () => void;
  skip: () => void;
}

const RestTimerContext = createContext<RestTimerValue | null>(null);

const TIMER_KEY = 'gym-buddy:rest-timer:v1';
// Discard a restored timer whose endAt is more than this far in the past —
// user's been gone long enough that a stale "Done" banner would be confusing.
const STALE_CUTOFF_MS = 10 * 60 * 1000;

function loadEndAt(): number | null {
  try {
    const raw = localStorage.getItem(TIMER_KEY);
    if (!raw) return null;
    const n = Number(raw);
    if (!Number.isFinite(n)) return null;
    if (Date.now() - n > STALE_CUTOFF_MS) {
      localStorage.removeItem(TIMER_KEY);
      return null;
    }
    return n;
  } catch {
    return null;
  }
}

function persistEndAt(endAt: number | null): void {
  try {
    if (endAt === null) localStorage.removeItem(TIMER_KEY);
    else localStorage.setItem(TIMER_KEY, String(endAt));
  } catch {
    // ignore
  }
}

interface WebkitWindow {
  webkitAudioContext?: typeof AudioContext;
}

function getAudioCtor(): typeof AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (window.AudioContext) return window.AudioContext;
  const wk = (window as unknown as WebkitWindow).webkitAudioContext;
  return wk ?? null;
}

export function RestTimerProvider({ children }: { children: ReactNode }) {
  const initialEndAt = useMemo(() => loadEndAt(), []);
  const [endAt, setEndAtState] = useState<number | null>(initialEndAt);
  const [nowMs, setNowMs] = useState<number>(() => Date.now());
  const audioCtxRef = useRef<AudioContext | null>(null);
  const firedRef = useRef<boolean>(false);
  const unlockedRef = useRef<boolean>(false);

  const setEndAt = useCallback(
    (next: number | null | ((prev: number | null) => number | null)) => {
      setEndAtState((prev) => {
        const resolved = typeof next === 'function' ? next(prev) : next;
        persistEndAt(resolved);
        return resolved;
      });
    },
    [],
  );

  useEffect(() => {
    if (endAt === null) return;
    const id = window.setInterval(() => setNowMs(Date.now()), 250);
    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        setNowMs(Date.now());
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [endAt]);

  const playChime = useCallback(() => {
    try {
      const ctx = audioCtxRef.current;
      if (!ctx) return;
      if (ctx.state === 'suspended') {
        void ctx.resume();
      }
      const t = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, t);
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(0.3, t + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.4);
    } catch {
      // audio failure is non-fatal
    }
  }, []);

  const remaining =
    endAt === null ? 0 : Math.max(0, Math.ceil((endAt - nowMs) / 1000));
  const isActive = endAt !== null;
  const isDone = isActive && remaining === 0;

  useEffect(() => {
    if (endAt !== null && remaining === 0 && !firedRef.current) {
      firedRef.current = true;
      playChime();
    }
  }, [endAt, remaining, playChime]);

  const start = useCallback((seconds: number) => {
    try {
      if (!audioCtxRef.current) {
        const Ctor = getAudioCtor();
        if (Ctor) audioCtxRef.current = new Ctor();
      }
      const ctx = audioCtxRef.current;
      if (ctx) {
        if (ctx.state === 'suspended') {
          void ctx.resume();
        }
        if (!unlockedRef.current) {
          // iOS audio unlock: play a 1-sample silent buffer inside the
          // user-gesture frame. Just creating + resuming the context is
          // not enough on WebKit — an actual source must play.
          const buffer = ctx.createBuffer(1, 1, 22050);
          const source = ctx.createBufferSource();
          source.buffer = buffer;
          source.connect(ctx.destination);
          source.start(0);
          unlockedRef.current = true;
        }
      }
    } catch {
      // ignore audio unlock failures
    }
    firedRef.current = false;
    const now = Date.now();
    setNowMs(now);
    setEndAt(now + seconds * 1000);
  }, [setEndAt]);

  const stop = useCallback(() => {
    firedRef.current = true;
    setEndAt(null);
  }, [setEndAt]);

  const skip = useCallback(() => {
    setEndAt((cur) => {
      if (cur === null) return cur;
      if (!firedRef.current) {
        firedRef.current = true;
        playChime();
      }
      return null;
    });
  }, [playChime, setEndAt]);

  const value = useMemo<RestTimerValue>(
    () => ({ remaining, isActive, isDone, start, stop, skip }),
    [remaining, isActive, isDone, start, stop, skip],
  );

  return (
    <RestTimerContext.Provider value={value}>{children}</RestTimerContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useRestTimer(): RestTimerValue {
  const ctx = useContext(RestTimerContext);
  if (!ctx) throw new Error('useRestTimer must be used inside <RestTimerProvider>');
  return ctx;
}
