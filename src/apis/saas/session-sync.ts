export type SessionSignalKindT = 'login' | 'logout';

type SessionSignalT = { kind: SessionSignalKindT; at: number };

export const SESSION_CHANNEL_NAME = 'fs.saas.session';
export const SESSION_SIGNAL_STORAGE_KEY = 'fs.saas.session.signal';

let channel: BroadcastChannel | null = null;

const isBrowser = () => typeof window !== 'undefined';

const sessionChannel = () => {
  if (!isBrowser() || typeof BroadcastChannel !== 'function') return null;

  channel ??= new BroadcastChannel(SESSION_CHANNEL_NAME);

  return channel;
};

const parseSignal = (value: unknown): SessionSignalT | null => {
  const signal = value as Partial<SessionSignalT> | null;

  return signal && (signal.kind === 'login' || signal.kind === 'logout')
    ? { kind: signal.kind, at: Number(signal.at) || 0 }
    : null;
};

export const broadcastSessionChange = (kind: SessionSignalKindT) => {
  if (!isBrowser()) return;

  const signal: SessionSignalT = { kind, at: Date.now() };
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

export const subscribeSessionChange = (onChange: (kind: SessionSignalKindT) => void) => {
  if (!isBrowser()) return () => {};

  const source = sessionChannel();

  if (source) {
    const onMessage = (event: MessageEvent<unknown>) => {
      const signal = parseSignal(event.data);
      if (signal) onChange(signal.kind);
    };

    source.addEventListener('message', onMessage);

    return () => source.removeEventListener('message', onMessage);
  }

  const onStorage = (event: StorageEvent) => {
    if (event.key !== SESSION_SIGNAL_STORAGE_KEY || !event.newValue) return;

    try {
      const signal = parseSignal(JSON.parse(event.newValue));
      if (signal) onChange(signal.kind);
    } catch {
      return;
    }
  };

  window.addEventListener('storage', onStorage);

  return () => window.removeEventListener('storage', onStorage);
};
