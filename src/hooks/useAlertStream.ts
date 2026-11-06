'use client';

import { useEffect, useRef, useState } from 'react';

import { API_BASE_URL, ENDPOINTS } from '@/consts/api';
import { mockingReady } from '@/mocks/ready';
import type { AlertT } from '@/types/api';

/**
 * 콜드체인 알림 SSE.
 * 연결하면 지난 알림부터 다시 보내고, 서버가 5분마다 끊으면 EventSource 가 알아서 다시 붙는다.
 * 그때 같은 알림이 또 오므로 seq 로 중복을 거른다.
 */
export const useAlertStream = (
  containerId: string,
  planId: string,
  onAlert?: (alert: AlertT) => void
) => {
  const [alerts, setAlerts] = useState<AlertT[]>([]);
  const onAlertRef = useRef(onAlert);

  useEffect(() => {
    onAlertRef.current = onAlert;
  });

  useEffect(() => {
    const seen = new Set<number>();
    // 같은 컨테이너에 계획이 여럿이면 다른 계획의 알림이 섞이지 않게 계획으로 거른다
    const params = new URLSearchParams({ container_id: containerId, plan_id: planId });
    let source: EventSource | null = null;
    let isClosed = false;

    // 목업 모드면 MSW 워커가 준비된 뒤에 연결한다
    mockingReady.then(() => {
      if (isClosed) return;

      source = new EventSource(`${API_BASE_URL}${ENDPOINTS.COLDCHAIN_ALERTS_STREAM}?${params}`);
      source.addEventListener('alert', event => {
        const alert = JSON.parse((event as MessageEvent<string>).data) as AlertT;
        if (seen.has(alert.seq)) return;

        seen.add(alert.seq);
        setAlerts(prev => [alert, ...prev]);
        onAlertRef.current?.(alert);
      });
    });

    return () => {
      isClosed = true;
      source?.close();
    };
  }, [containerId, planId]);

  return alerts;
};
