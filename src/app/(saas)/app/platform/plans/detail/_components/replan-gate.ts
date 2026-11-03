'use client';

import { useIsSandbox } from '@/apis/saas/auth';
import { usePlatformPlans } from '@/apis/saas/platform';
import {
  AWAITING_SHIPPERS_STATUS,
  type PlanConfirmationStateT,
  usePlatformConfirmation,
} from '@/apis/saas/platform-confirm';
import type { ReplanResponseT } from '@/types/api';
import type { SaasPlanSessionT } from '@/types/api-saas';

export const AWAITING_APPLY_REASON = '화주 확인이 끝난 뒤 바꿀 수 있습니다';
export const ADD_LOT_APPLY_REASON =
  '포워더 배정을 해제하고 이 화주가 계획을 수락한 뒤에 넣을 수 있습니다';
export const FORWARDER_UNKNOWN_REASON = '포워더 배정 여부를 확인한 뒤 적용할 수 있습니다';
export const REPLAN_CANDIDATES_ID = 'replan-candidates';

export type AddLotBlockT = 'unaccepted' | 'new' | null;

const roundRows = (state: PlanConfirmationStateT | null) =>
  state ? state.confirmations.filter(({ round }) => round === state.round) : [];

const shippersWith = (
  state: PlanConfirmationStateT | null,
  test: (status: PlanConfirmationStateT['confirmations'][number]['status']) => boolean
) =>
  new Set(
    roundRows(state)
      .filter(({ status }) => test(status))
      .map(({ shipper_id: id }) => id)
  );

export const scrollToReplanCandidates = () => {
  const target = document.getElementById(REPLAN_CANDIDATES_ID);
  if (!target) return;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  target.scrollIntoView({ block: 'start', behavior: reduced ? 'auto' : 'smooth' });
};

export const useReplanGate = (session: SaasPlanSessionT) => {
  const isSandbox = useIsSandbox();
  const confirmation = usePlatformConfirmation(session.plan_id);
  const plansQuery = usePlatformPlans();
  const state = confirmation.data ?? null;
  const forwarder =
    plansQuery.data?.find(({ plan_id: id }) => id === session.plan_id)?.forwarder ?? null;
  const isForwarderUnknown = !isSandbox && (plansQuery.isPending || plansQuery.isError);
  const present = new Set(session.scenario.lots.map(({ shipper_id: id }) => id));
  const waiting = shippersWith(state, status => status !== 'accepted');
  const accepted = shippersWith(state, status => status === 'accepted');
  const rejected = shippersWith(state, status => status === 'rejected');
  const hasRound = !!state && state.round > 0;
  const isWaitingRow = [...waiting].some(id => present.has(id));
  const isAwaiting =
    !isSandbox && ((state?.status ?? session.status) === AWAITING_SHIPPERS_STATUS || isWaitingRow);

  const shipperBlock = (shipperId: string): AddLotBlockT => {
    if (isSandbox) return null;
    if (!present.has(shipperId)) return 'new';
    if (hasRound && !accepted.has(shipperId)) return 'unaccepted';

    return null;
  };

  const addLotBlock = (shipperId: string): AddLotBlockT =>
    forwarder ? shipperBlock(shipperId) : null;

  const isRejectedCancel = ({ event }: ReplanResponseT) => {
    if (event.type !== 'cancel') return false;
    const lot = session.scenario.lots.find(({ id }) => id === event.lot_id);

    return !!lot && rejected.has(lot.shipper_id);
  };

  const applyBlockReason = (replan: ReplanResponseT): string | null => {
    if (isSandbox) return null;
    if (isAwaiting && !isRejectedCancel(replan)) return AWAITING_APPLY_REASON;
    if (replan.event.type !== 'add_lot' || !shipperBlock(replan.event.lot.shipper_id)) return null;
    if (isForwarderUnknown) return FORWARDER_UNKNOWN_REASON;
    if (forwarder) return ADD_LOT_APPLY_REASON;

    return null;
  };

  return {
    isSandbox,
    isAwaiting,
    forwarderName: forwarder?.org_name ?? null,
    addLotBlock,
    applyBlockReason,
  };
};
