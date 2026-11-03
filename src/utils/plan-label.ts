import type { PlanSessionT } from '@/types/api';
import { formatKstMonthDayTime } from '@/utils/kst';

export const NO_VESSEL_LABEL = '배정 선박 없음';

const PLAN_ID_PREFIX_LENGTH = 6;

type PlanOptionT = {
  vessel?: string | null;
  departure?: string | null;
  created_at: string;
  plan_id?: string;
  version?: number;
};

export const planOptionLabel = ({ vessel, departure, created_at, plan_id, version }: PlanOptionT) =>
  [
    vessel ? `${vessel} · ${formatKstMonthDayTime(departure)} 출항` : NO_VESSEL_LABEL,
    `${formatKstMonthDayTime(created_at)} 생성`,
    typeof version === 'number' ? `v${version}` : '',
    plan_id ? plan_id.slice(0, PLAN_ID_PREFIX_LENGTH) : '',
  ]
    .filter(Boolean)
    .join(' · ');

export const planSessionLabel = ({ plan, scenario, created_at, plan_id }: PlanSessionT) => {
  const usedVoyageIds = new Set(
    plan.containers.filter(({ used }) => used).map(({ voyage_id }) => voyage_id)
  );
  const voyage = scenario.voyages
    .filter(({ id }) => usedVoyageIds.has(id))
    .sort((a, b) => a.etd.localeCompare(b.etd))[0];

  return planOptionLabel({
    vessel: voyage?.vessel_name,
    departure: voyage?.etd,
    created_at,
    plan_id,
  });
};
