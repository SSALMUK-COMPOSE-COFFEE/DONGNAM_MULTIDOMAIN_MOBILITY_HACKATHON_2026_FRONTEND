import { z } from 'zod';

/**
 * 아두이노 센서 WebSocket 메시지.
 * 서버가 보낸 값이 형식과 다르면 화면이 조용히 깨지지 않도록 Zod로 검증한다.
 * NOTE: 백엔드와 확정 전 초안이다.
 */
export const sensorReadingSchema = z.object({
  ts: z.iso.datetime(),
  tempC: z.number(),
  power: z.enum(['on', 'off']),
  lossRate: z.number(),
});

export type SensorReadingT = z.infer<typeof sensorReadingSchema>;
