import { HttpResponse, delay, http, ws } from 'msw';

import { WS_BASE_URL } from '@/consts/api';
import plan from '@/mocks/fixtures/plan.json';
import type { PlanT } from '@/types/plan';
import type { SensorReadingT } from '@/types/sensor';

const SENSOR_INTERVAL_MS = 1_000;
/** 전원이 꺼진 뒤 1초마다 오르는 온도 (시연용 가정) */
const TEMP_RISE_PER_TICK = 0.15;

const sensor = ws.link(`${WS_BASE_URL}/ws/sensor/*`);

export const handlers = [
  http.get('*/plans/:planId', async () => {
    // 재계산 로딩 UI를 확인할 수 있게 약간 지연
    await delay(400);

    return HttpResponse.json(plan as PlanT);
  }),

  /**
   * 아두이노 대신 1초마다 온도를 보낸다.
   * 클라이언트가 { "type": "power", "power": "off" } 를 보내면 단전 상황을 흉내 낸다.
   */
  sensor.addEventListener('connection', ({ client }) => {
    let power: SensorReadingT['power'] = 'on';
    let tempC = 3;

    client.addEventListener('message', event => {
      if (typeof event.data !== 'string') return;

      const message = JSON.parse(event.data) as { type?: string; power?: SensorReadingT['power'] };
      if (message.type === 'power' && message.power) power = message.power;
    });

    const timer = setInterval(() => {
      tempC =
        power === 'off' ? tempC + TEMP_RISE_PER_TICK : Math.max(3, tempC - TEMP_RISE_PER_TICK);
      const reading: SensorReadingT = {
        ts: new Date().toISOString(),
        tempC: Number(tempC.toFixed(2)),
        power,
        lossRate: tempC > 4 ? 0.068 : 0.019,
      };
      client.send(JSON.stringify(reading));
    }, SENSOR_INTERVAL_MS);

    client.addEventListener('close', () => clearInterval(timer));
  }),
];
