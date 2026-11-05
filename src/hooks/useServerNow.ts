'use client';

import { useSyncExternalStore } from 'react';

const subscribe = (onChange: () => void) => {
  const timer = setInterval(onChange, 1000);

  return () => clearInterval(timer);
};
const snapshot = () => Math.floor(Date.now() / 1000) * 1000;
const serverSnapshot = () => null;

export function useServerNow(serverNow: string | null | undefined, receivedAt: number) {
  const now = useSyncExternalStore(subscribe, snapshot, serverSnapshot);
  const server = serverNow ? Date.parse(serverNow) : Number.NaN;

  return now !== null && receivedAt > 0 && Number.isFinite(server)
    ? now + server - receivedAt
    : null;
}

export const remainingMilliseconds = (deadline: string, now: number | null) => {
  const end = Date.parse(deadline);

  return now !== null && Number.isFinite(end) ? Math.max(0, end - now) : null;
};

export const remainingTimeText = (deadline: string, now: number | null) => {
  const remaining = remainingMilliseconds(deadline, now);
  if (remaining === null) return '시간 확인 중';
  if (remaining === 0) return '마감됨';
  const seconds = Math.ceil(remaining / 1000);
  const minutes = Math.floor(seconds / 60);

  return `${minutes}:${String(seconds % 60).padStart(2, '0')}`;
};
