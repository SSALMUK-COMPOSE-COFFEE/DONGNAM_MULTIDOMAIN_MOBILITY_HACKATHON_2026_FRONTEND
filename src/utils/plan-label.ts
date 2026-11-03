import type { PlanSessionT } from '@/types/api';
import { formatKstMonthDayTime } from '@/utils/kst';

export const NO_VESSEL_LABEL = '배정 선박 없음';

type PlanOptionT = {
  vessel?: string | null;
  departure?: string | null;
  created_at: string;
};

export const planOptionLabel = ({ vessel, departure, created_at }: PlanOptionT) =>
  vessel
    ? `${vessel} · ${formatKstMonthDayTime(departure)} 출항`
    : `${NO_VESSEL_LABEL} · ${formatKstMonthDayTime(created_at)} 생성`;

export const planSessionLabel = ({ plan, scenario, created_at }: PlanSessionT) => {
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
  });
};
