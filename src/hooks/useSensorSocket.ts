'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { ENDPOINTS, WS_BASE_URL } from '@/consts/api';
import { type SensorReadingT, sensorReadingSchema } from '@/types/sensor';

/** 차트에 남길 최근 측정값 개수 (1초 간격 → 약 3분) */
const MAX_READINGS = 180;
const RECONNECT_DELAY_MS = 2_000;

type SocketStatusT = 'connecting' | 'open' | 'closed';

export const useSensorSocket = (containerId: string) => {
  const socketRef = useRef<WebSocket | null>(null);
  const [readings, setReadings] = useState<SensorReadingT[]>([]);
  const [status, setStatus] = useState<SocketStatusT>('connecting');

  useEffect(() => {
    let isUnmounted = false;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

    const connect = () => {
      const socket = new WebSocket(`${WS_BASE_URL}${ENDPOINTS.SENSOR_WS(containerId)}`);
      socketRef.current = socket;

      socket.onopen = () => setStatus('open');

      socket.onmessage = event => {
        const parsed = sensorReadingSchema.safeParse(JSON.parse(event.data));
        if (!parsed.success) {
          console.error('[sensor] 메시지 형식이 다릅니다', parsed.error.issues);
          return;
        }
        setReadings(prev => [...prev.slice(-(MAX_READINGS - 1)), parsed.data]);
      };

      // 시연 중 서버가 잠깐 끊겨도 자동으로 다시 붙는다
      socket.onclose = () => {
        if (isUnmounted) return;
        setStatus('closed');
        reconnectTimer = setTimeout(() => {
          setStatus('connecting');
          connect();
        }, RECONNECT_DELAY_MS);
      };
    };

    connect();

    return () => {
      isUnmounted = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      socketRef.current?.close();
    };
  }, [containerId]);

  const send = useCallback((message: unknown) => {
    if (socketRef.current?.readyState !== WebSocket.OPEN) return;
    socketRef.current.send(JSON.stringify(message));
  }, []);

  return { readings, latest: readings.at(-1), status, send };
};
