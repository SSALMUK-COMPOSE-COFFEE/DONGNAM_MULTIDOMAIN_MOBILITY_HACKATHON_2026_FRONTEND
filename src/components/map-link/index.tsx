'use client';

import {
  type FocusEvent,
  type MouseEvent,
  type ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react';

export const LINK_ALL = 'all';

export type MapLinkSourceT = 'dom' | 'map';

export type MapLinkHoverT = {
  keys: string[];
  source: MapLinkSourceT;
  originId: string | null;
};

export type MapLinkPickT = {
  keys: string[];
  originId: string | null;
};

type MapLinkFlashT = { id: string; nonce: number };

type MapLinkContextT = {
  hover: MapLinkHoverT | null;
  pick: MapLinkPickT | null;
  flash: MapLinkFlashT | null;
  setHover: (hover: MapLinkHoverT | null) => void;
  setPick: (pick: MapLinkPickT | null) => void;
  register: (element: HTMLElement) => () => void;
  focusFromMap: (keys: string[]) => void;
};

const NOOP = () => {};

const INERT_CONTEXT: MapLinkContextT = {
  hover: null,
  pick: null,
  flash: null,
  setHover: NOOP,
  setPick: NOOP,
  register: () => NOOP,
  focusFromMap: NOOP,
};

const MapLinkContext = createContext<MapLinkContextT>(INERT_CONTEXT);

const FLASH_MS = 1000;
const LINK_ID_ATTR = 'data-link-id';

export const keysOverlap = (a: readonly string[], b: readonly string[]) => {
  if (a.length === 0 || b.length === 0) return false;
  if (a.includes(LINK_ALL) || b.includes(LINK_ALL)) return true;

  return a.some(key => b.includes(key));
};

const normalizeKeys = (keys: readonly string[]) =>
  keys.includes(LINK_ALL) ? [LINK_ALL] : [...new Set(keys.filter(Boolean))];

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const IGNORED_CLICK_TARGETS = 'input,button,a,select,textarea,label,[role="checkbox"]';

export function MapLinkProvider({ children }: { children: ReactNode }) {
  const [hover, setHover] = useState<MapLinkHoverT | null>(null);
  const [pick, setPick] = useState<MapLinkPickT | null>(null);
  const [flash, setFlash] = useState<MapLinkFlashT | null>(null);
  const registryRef = useRef(new Set<HTMLElement>());
  const flashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flashNonceRef = useRef(0);

  useEffect(
    () => () => {
      if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
    },
    []
  );

  const register = useCallback((element: HTMLElement) => {
    const registry = registryRef.current;
    registry.add(element);

    return () => {
      registry.delete(element);
    };
  }, []);

  const focusFromMap = useCallback((rawKeys: string[]) => {
    const keys = normalizeKeys(rawKeys);
    if (keys.length === 0) return;

    const matches = [...registryRef.current]
      .filter(element => element.isConnected)
      .filter(element => keysOverlap(keys, (element.dataset.link ?? '').split(' ')))
      .sort((a, b) => (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1));
    const target = matches[0];

    if (!target) {
      setPick({ keys, originId: null });
      return;
    }

    target.scrollIntoView({
      block: 'center',
      behavior: prefersReducedMotion() ? 'auto' : 'smooth',
    });

    const targetId = target.getAttribute(LINK_ID_ATTR);
    setPick({ keys: normalizeKeys((target.dataset.link ?? '').split(' ')), originId: targetId });

    if (!targetId) return;
    flashNonceRef.current += 1;
    setFlash({ id: targetId, nonce: flashNonceRef.current });
    if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
    flashTimerRef.current = setTimeout(() => setFlash(null), FLASH_MS);
  }, []);

  const value = useMemo<MapLinkContextT>(
    () => ({ hover, pick, flash, setHover, setPick, register, focusFromMap }),
    [hover, pick, flash, register, focusFromMap]
  );

  return <MapLinkContext value={value}>{children}</MapLinkContext>;
}

export type MapLinkTargetOptionsT = {
  pickable?: boolean;
};

export type MapLinkTargetPropsT = {
  ref: (element: HTMLElement | null) => (() => void) | void;
  onMouseEnter: (event: MouseEvent<HTMLElement>) => void;
  onMouseLeave: (event: MouseEvent<HTMLElement>) => void;
  onFocus: (event: FocusEvent<HTMLElement>) => void;
  onBlur: (event: FocusEvent<HTMLElement>) => void;
  onClick: (event: MouseEvent<HTMLElement>) => void;
  className: string;
  'data-link': string;
  'data-link-id': string;
};

export function useMapLinkTarget(
  keys: readonly string[],
  { pickable = true }: MapLinkTargetOptionsT = {}
): MapLinkTargetPropsT {
  const id = useId();
  const { hover, pick, flash, setHover, setPick, register } = useContext(MapLinkContext);
  const linkKeys = normalizeKeys(keys);
  const keyString = linkKeys.join(' ');

  const ref = useCallback(
    (element: HTMLElement | null) => {
      if (!element) return;
      return register(element);
    },
    [register]
  );

  const isPick = pick !== null && pick.originId === id;
  const hoverLit = hover !== null && hover.originId !== id && keysOverlap(linkKeys, hover.keys);
  const pickLit = hover === null && pick !== null && !isPick && keysOverlap(linkKeys, pick.keys);
  const isFlash = flash !== null && flash.id === id;

  const classNames = [
    hoverLit || pickLit ? 'is-lit' : '',
    isPick ? 'is-pick' : '',
    isFlash ? 'is-flash' : '',
    isFlash && flash.nonce % 2 === 0 ? 'is-flash-alt' : '',
  ].filter(Boolean);

  const startHover = () => {
    if (linkKeys.length === 0) return;
    setHover({ keys: linkKeys, source: 'dom', originId: id });
  };
  const endHover = () => {
    if (hover?.originId === id) setHover(null);
  };

  return {
    ref,
    onMouseEnter: startHover,
    onMouseLeave: endHover,
    onFocus: startHover,
    onBlur: endHover,
    onClick: event => {
      if (!pickable || linkKeys.length === 0) return;
      const target = event.target instanceof Element ? event.target : null;
      const control = target?.closest(IGNORED_CLICK_TARGETS);
      if (control && control !== event.currentTarget) return;

      setPick(isPick ? null : { keys: linkKeys, originId: id });
    },
    className: classNames.join(' '),
    'data-link': keyString,
    'data-link-id': id,
  };
}

export type MapLinkStateT = {
  hover: MapLinkHoverT | null;
  pick: MapLinkPickT | null;
  activeKeys: string[] | null;
  isActive: (keys: readonly string[]) => boolean;
  hoverFromMap: (keys: readonly string[] | null) => void;
  focusFromMap: (keys: readonly string[]) => void;
  clearPick: () => void;
};

export function useMapLinkState(): MapLinkStateT {
  const { hover, pick, setHover, setPick, focusFromMap } = useContext(MapLinkContext);
  const activeKeys = hover?.keys ?? pick?.keys ?? null;

  const hoverFromMap = useCallback(
    (keys: readonly string[] | null) => {
      const next = keys ? normalizeKeys(keys) : [];
      setHover(next.length > 0 ? { keys: next, source: 'map', originId: null } : null);
    },
    [setHover]
  );
  const focusLinked = useCallback(
    (keys: readonly string[]) => focusFromMap([...keys]),
    [focusFromMap]
  );
  const clearPick = useCallback(() => setPick(null), [setPick]);

  return {
    hover,
    pick,
    activeKeys,
    isActive: keys => activeKeys !== null && keysOverlap(keys, activeKeys),
    hoverFromMap,
    focusFromMap: focusLinked,
    clearPick,
  };
}
