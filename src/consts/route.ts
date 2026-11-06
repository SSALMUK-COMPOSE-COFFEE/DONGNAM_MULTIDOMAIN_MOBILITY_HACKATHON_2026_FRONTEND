export const ROUTES = {
  INTAKE: '/intake',
  PLAN: '/plan',
  REPLAN: '/replan',
  MODE_SWITCH: '/mode-switch',
  FUEL_SHOCK: '/fuel-shock',
  SENSOR: '/sensor',
} as const;

/**
 * 본선 시연 순서대로 정렬한 내비게이션 (기획서 V3 7-1).
 * 핵심 시연은 운송계획·취소 재최적화·항공 전환, 출하 입력·운임 쇼크는 보조, 단전 관제는 선택(부록)이다
 */
export const DEMO_NAV = [
  { href: ROUTES.INTAKE, step: '01', label: '출하 입력' },
  { href: ROUTES.PLAN, step: '02', label: '운송계획' },
  { href: ROUTES.REPLAN, step: '03', label: '취소 재최적화' },
  { href: ROUTES.MODE_SWITCH, step: '04', label: '항공 전환' },
  { href: ROUTES.FUEL_SHOCK, step: '05', label: '운임 쇼크' },
  { href: ROUTES.SENSOR, step: '부록', label: '단전 관제' },
] as const;
