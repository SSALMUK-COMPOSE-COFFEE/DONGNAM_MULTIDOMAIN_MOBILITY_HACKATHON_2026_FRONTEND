'use client';

import { useMe } from '@/apis/saas/auth';
import { useForwarderConfirmation, useForwarderPlan } from '@/apis/saas/forwarder';
import type { ReplanResponseT } from '@/types/api';
import type { SaasPlanSessionT } from '@/types/api-saas';

export const AWAITING_APPLY_REASON = '화주 확인이 끝난 뒤 바꿀 수 있습니다';
export const FORWARDER_UNKNOWN_REASON = '계획과 화주 확인 상태를 확인한 뒤 적용할 수 있습니다';
export const REPLAN_CANDIDATES_ID = 'replan-candidates';

export const scrollToReplanCandidates = () => {
  const target = document.getElementById(REPLAN_CANDIDATES_ID);
  if (!target) return;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  target.scrollIntoView({ block: 'start', behavior: reduced ? 'auto' : 'smooth' });
};

export const useReplanGate = (session: SaasPlanSessionT) => {
  const me = useMe();
  const plan = useForwarderPlan(session.plan_id);
  const confirmation = useForwarderConfirmation(session.plan_id);
  const state = confirmation.data ?? null;
  const currentRows = state?.confirmations.filter(({ round }) => round === state.round) ?? [];
  const present = new Set(session.scenario.lots.map(({ shipper_id }) => shipper_id));
  const rejected = new Set(
    currentRows.filter(row => row.status === 'rejected').map(row => row.shipper_id)
  );
  const isAwaiting =
    (state?.status ?? session.status) === 'pending_shipper_confirmation' ||
    currentRows.some(row => present.has(row.shipper_id) && row.status !== 'accepted');
  const canOperate = me.data?.active_org.org_type === 'forwarder' && plan.isSuccess;
  const isUnknown =
    plan.isPending || plan.isError || confirmation.isPending || confirmation.isError;
  const applyBlockReason = (replan: ReplanResponseT): string | null => {
    if (!canOperate || isUnknown) return FORWARDER_UNKNOWN_REASON;
    const event = replan.event;
    const cancelled =
      event.type === 'cancel' ? session.scenario.lots.find(({ id }) => id === event.lot_id) : null;
    if (isAwaiting && !(cancelled && rejected.has(cancelled.shipper_id)))
      return AWAITING_APPLY_REASON;
    return null;
  };
  return { isAwaiting, canOperate, isUnknown, applyBlockReason };
};
