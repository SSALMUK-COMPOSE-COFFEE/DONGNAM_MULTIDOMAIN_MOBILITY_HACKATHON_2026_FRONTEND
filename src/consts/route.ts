export const ROUTES = {
  INTAKE: '/intake',
  PLAN: '/plan',
  REPLAN: '/replan',
  MODE_SWITCH: '/mode-switch',
  FUEL_SHOCK: '/fuel-shock',
  SENSOR: '/sensor',
} as const;

export const DEMO_NAV = [
  { href: ROUTES.INTAKE, step: '01', label: '출하 입력' },
  { href: ROUTES.PLAN, step: '02', label: '운송계획' },
  { href: ROUTES.REPLAN, step: '03', label: '취소 재최적화' },
] as const;

export const DEMO_APPENDIX_NAV = [
  { href: ROUTES.MODE_SWITCH, label: '항공 전환' },
  { href: ROUTES.FUEL_SHOCK, label: '운임 쇼크' },
  { href: ROUTES.SENSOR, label: '단전 관제' },
] as const;
