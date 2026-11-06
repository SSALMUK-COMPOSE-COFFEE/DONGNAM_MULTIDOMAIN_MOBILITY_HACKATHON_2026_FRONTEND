export type SessionSignalKindT = 'login' | 'logout' | 'switch' | 'reset';

const SESSION_SIGNAL_KINDS = ['login', 'logout', 'switch', 'reset'] as const;

type SessionSignalT = {
  kind: SessionSignalKindT;
  at: number;
  world_id: string | null;
};

export const SESSION_CHANNEL_NAME = 'fs.saas.session';
export const SESSION_SIGNAL_STORAGE_KEY = 'fs.saas.session.signal';

let channel: BroadcastChannel | null = null;

const isBrowser = () => typeof window !== 'undefined';

const isKind = (value: string): value is SessionSignalKindT =>
  (SESSION_SIGNAL_KINDS as readonly string[]).includes(value);

const sessionChannel = () => {
  if (!isBrowser() || typeof BroadcastChannel !== 'function') return null;

  channel ??= new BroadcastChannel(SESSION_CHANNEL_NAME);

  return channel;
};

const parseSignal = (value: unknown): SessionSignalT | null => {
  if (!value || typeof value !== 'object') return null;

  const signal = value as { kind?: unknown; at?: unknown; world_id?: unknown };
  if (typeof signal.kind !== 'string' || !isKind(signal.kind)) return null;

  return {
    kind: signal.kind,
    at: Number(signal.at) || 0,
    world_id: typeof signal.world_id === 'string' ? signal.world_id : null,
  };
};

export const broadcastSessionChange = (kind: SessionSignalKindT, worldId: string | null = null) => {
  if (!isBrowser()) return;

  const signal: SessionSignalT = { kind, at: Date.now(), world_id: worldId };
  const target = sessionChannel();

  if (target) {
    target.postMessage(signal);
    return;
  }

  try {
    localStorage.setItem(SESSION_SIGNAL_STORAGE_KEY, JSON.stringify(signal));
  } catch {
    return;
  }
};

export const subscribeSessionChange = (onChange: (signal: SessionSignalT) => void) => {
  if (!isBrowser()) return () => {};

  const source = sessionChannel();

  if (source) {
    const onMessage = (event: MessageEvent<unknown>) => {
      const signal = parseSignal(event.data);
      if (signal) onChange(signal);
    };

    source.addEventListener('message', onMessage);

    return () => source.removeEventListener('message', onMessage);
  }

  const onStorage = (event: StorageEvent) => {
    if (event.key !== SESSION_SIGNAL_STORAGE_KEY || !event.newValue) return;

    try {
      const signal = parseSignal(JSON.parse(event.newValue));
      if (signal) onChange(signal);
    } catch {
      return;
    }
  };

  window.addEventListener('storage', onStorage);

  return () => window.removeEventListener('storage', onStorage);
};
