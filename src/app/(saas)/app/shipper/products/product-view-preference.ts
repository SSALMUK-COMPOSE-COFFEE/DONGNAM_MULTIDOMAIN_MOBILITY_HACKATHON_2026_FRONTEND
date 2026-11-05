'use client';

import { useSyncExternalStore } from 'react';

type ProductViewT = 'cards' | 'list';
const STORAGE_KEY = 'shipperproducts-view';
const CHANGE_EVENT = 'shipperproducts-view-change';
let cachedView: ProductViewT | null = null;

const getView = (): ProductViewT => {
  if (cachedView) return cachedView;
  try {
    cachedView = window.localStorage.getItem(STORAGE_KEY) === 'list' ? 'list' : 'cards';
  } catch {
    cachedView = 'cards';
  }
  return cachedView;
};

const subscribe = (notify: () => void) => {
  const onStorage = (event: StorageEvent) => {
    if (event.key !== STORAGE_KEY && event.key !== null) return;
    cachedView = null;
    notify();
  };
  window.addEventListener('storage', onStorage);
  window.addEventListener(CHANGE_EVENT, notify);
  return () => {
    window.removeEventListener('storage', onStorage);
    window.removeEventListener(CHANGE_EVENT, notify);
  };
};

const setView = (view: ProductViewT) => {
  cachedView = view;
  try {
    window.localStorage.setItem(STORAGE_KEY, view);
  } catch {
    window.dispatchEvent(new Event(CHANGE_EVENT));
    return;
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
};

export const useProductViewPreference = () => {
  const view = useSyncExternalStore(subscribe, getView, () => 'cards' as const);
  return [view, setView] as const;
};
