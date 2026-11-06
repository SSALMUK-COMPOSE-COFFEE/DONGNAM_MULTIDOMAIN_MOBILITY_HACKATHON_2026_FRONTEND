import type { OrgType } from '@/types/saas';

export const LANDING_IDS = {
  main: 'landing-main',
  title: 'landing-title',
  problem: 'landing-problem',
  roles: 'landing-roles',
  rolesTitle: 'landing-roles-title',
  pricing: 'landing-pricing',
} as const;

export const TEAM_SITE_URL = 'https://freshswitch.ssalhub.xyz';

export const TEAM_NAME = 'Team ACK';

export const PERFORMANCE_FEE_RATE = 0.25;

export const PALLET_FEE_WON = 20000;

export const PROBLEMS = [
  {
    key: 'fuel',
    label: '운임 변동',
    text: '유류할증료가 오르면 기존 운송계획의 비용을 다시 검토해야 합니다.',
  },
  {
    key: 'fill',
    label: '소량 출하의 운송비 부담',
    text: '컨테이너를 채우기 어려운 소량 출하는 빈 공간까지 운송비를 부담할 수 있습니다.',
  },
] as const;

export const SOLUTIONS = [
  {
    key: 'pool',
    step: '01',
    title: '공동적재',
    text: '함께 실을 수 있는 품목과 출하일·선적 마감을 확인해 여러 화주의 화물을 공동 적재하고, 집하 경로를 계산합니다.',
  },
  {
    key: 'replan',
    step: '02',
    title: '자동 재최적화',
    text: '취소·지연·운임 변동이 생기면 남은 화주의 배정과 경로를 다시 짜고, 대안을 비교해 고르게 합니다.',
  },
  {
    key: 'settle',
    step: '03',
    title: '총비용 정산',
    text: '운임만이 아니라 집하·보관·품질 손실 위험까지 더한 총비용으로 화주별 몫을 나눠 정산합니다.',
  },
] as const;

export const LANDING_ROLES = [
  'shipper',
  'platform',
  'forwarder',
] as const satisfies readonly OrgType[];

export const ROLE_COPY: Record<OrgType, { title: string; text: string }> = {
  shipper: {
    title: '화주',
    text: '출하를 등록하고, 공동적재 계획을 확정하고, 내 절감액을 확인합니다.',
  },
  platform: {
    title: '플랫폼',
    text: '출하 풀에서 공동적재 계획을 만들고 포워더를 배정하고 정산합니다.',
  },
  forwarder: {
    title: '포워더',
    text: '배정된 항차의 실행 지시와 집하 경로, 콜드체인 온도를 챙깁니다.',
  },
};
