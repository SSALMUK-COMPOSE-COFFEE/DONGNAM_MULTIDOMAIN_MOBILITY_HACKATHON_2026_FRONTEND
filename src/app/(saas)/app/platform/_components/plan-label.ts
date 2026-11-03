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
