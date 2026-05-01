'use client';
import { useState, useEffect, useRef, useCallback } from 'react';

export function useTimer(initialSeconds: number, onComplete?: () => void) {
  const [seconds, setSeconds] = useState(initialSeconds);
  const [running, setRunning] = useState(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    if (!running) return;
    intervalRef.current = setInterval(() => {
      setSeconds(prev => {
        if (prev <= 1) {
          setRunning(false);
          onCompleteRef.current?.();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [running]);

  const adjust = useCallback((delta: number) => {
    setSeconds(prev => Math.max(0, prev + delta));
  }, []);

  const skip = useCallback(() => {
    setRunning(false);
    setSeconds(0);
    onCompleteRef.current?.();
  }, []);

  const reset = useCallback((s: number) => {
    setSeconds(s);
    setRunning(true);
  }, []);

  const progress = initialSeconds > 0 ? Math.round(((initialSeconds - seconds) / initialSeconds) * 100) : 100;

  return { seconds, running, adjust, skip, reset, progress };
}

export function useElapsedTimer(startedAt: string) {
  const [elapsed, setElapsed] = useState('00:00:00');

  useEffect(() => {
    const update = () => {
      const diff = Date.now() - new Date(startedAt).getTime();
      const h = Math.floor(diff / 3600000).toString().padStart(2, '0');
      const m = Math.floor((diff % 3600000) / 60000).toString().padStart(2, '0');
      const s = Math.floor((diff % 60000) / 1000).toString().padStart(2, '0');
      setElapsed(`${h}:${m}:${s}`);
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [startedAt]);

  return elapsed;
}
