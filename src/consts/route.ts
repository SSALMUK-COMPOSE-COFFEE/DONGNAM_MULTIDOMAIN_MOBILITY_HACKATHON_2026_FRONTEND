export const ROUTES = {
  PLAN: '/plan',
  REPLAN: '/replan',
  SENSOR: '/sensor',
  MODE_SWITCH: '/mode-switch',
} as const;

/** 본선 시연 순서대로 정렬한 내비게이션 */
export const DEMO_NAV = [
  { href: ROUTES.PLAN, step: '01', label: '운송계획' },
  { href: ROUTES.REPLAN, step: '02', label: '취소 재최적화' },
  { href: ROUTES.SENSOR, step: '03', label: '단전 관제' },
  { href: ROUTES.MODE_SWITCH, step: '04', label: '항공 전환' },
] as const;
