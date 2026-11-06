'use client';

import { useSyncExternalStore } from 'react';

import { NARROW_QUERY } from '@/app/(saas)/app/shipper/_components/mobile';

const subscribe = (onChange: () => void) => {
  const query = window.matchMedia(NARROW_QUERY);
  query.addEventListener('change', onChange);

  return () => query.removeEventListener('change', onChange);
};

export const useNarrow = () =>
  useSyncExternalStore(
    subscribe,
    () => window.matchMedia(NARROW_QUERY).matches,
    () => false
  );
