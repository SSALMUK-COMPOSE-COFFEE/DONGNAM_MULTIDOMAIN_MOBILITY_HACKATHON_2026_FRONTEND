/** 백엔드 시연 스크립트(GET /api/demo/script)와 같은 값 */
export const DEMO_SCENARIO_ID = 'default';
export const DEMO_CONTAINER_ID = 'CA-01';
export const DEMO_DEVICE_ID = 'arduino-01';

export const SIMULATION_PRESET = 'power_cut_restore';
/** 측정값 85건을 0.5초 간격으로 재생 → 약 40초 */
export const SIMULATION_INTERVAL_SECONDS = 0.5;

/** 시연 ② 취소 재최적화: 산청 딸기 5 → 3파렛트 (2파렛트 취소) */
export const DEMO_REDUCE_LOT_ID = 'lot-sancheong-sb-1';
export const DEMO_REDUCE_TO_PALLETS = 3;

/** 시연 ① 출하 입력: 산청 딸기 2파렛트, 11/17 출하, 홍콩 (백엔드 시연 스크립트 1단계) */
export const DEMO_INTAKE = {
  product: 'strawberry',
  pallets: 2,
  ready_date: '2026-11-17',
  shipper: 'sh-sancheong',
  destination: 'HKHKG',
} as const;

/** 시연 ③ 항공 전환: 판매 기간이 짧아진 산청 딸기를 항공으로 (백엔드 시연 스크립트 5단계) */
export const DEMO_AIR_SWITCH_LOT_ID = 'lot-sancheong-sb-1';
