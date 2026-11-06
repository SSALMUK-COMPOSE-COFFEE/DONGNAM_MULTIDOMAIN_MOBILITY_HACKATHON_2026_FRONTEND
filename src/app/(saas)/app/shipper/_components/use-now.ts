'use client';

import { useEffect, useState, useSyncExternalStore } from 'react';

const MINUTE_MS = 60 * 1000;

const subscribeMinute = (onChange: () => void) => {
  const timer = setInterval(onChange, MINUTE_MS);

  return () => clearInterval(timer);
};

const minuteSnapshot = () => Math.floor(Date.now() / MINUTE_MS) * MINUTE_MS;

const serverSnapshot = () => null;

export const useNowMinute = () =>
  useSyncExternalStore(subscribeMinute, minuteSnapshot, serverSnapshot);

export const useDebouncedValue = <T>(value: T, delayMs: number) => {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);

    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
};
