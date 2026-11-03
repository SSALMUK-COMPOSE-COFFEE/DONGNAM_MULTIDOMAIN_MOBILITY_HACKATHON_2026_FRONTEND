'use client';

import { useId, useState } from 'react';

import { useIsSandbox } from '@/apis/saas/auth';
import { useAssignForwarder, useForwarderOrgs, usePlatformPlans } from '@/apis/saas/platform';
import {
  AWAITING_SHIPPERS_STATUS,
  confirmationCounts,
  usePlatformConfirmation,
} from '@/apis/saas/platform-confirm';
import { QueryError } from '@/app/(saas)/app/platform/_components/query-error';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { subjectParticle } from '@/utils/josa';

const isFlaggedBeforeConfirmation = (value: unknown) =>
  typeof value === 'object' &&
  value !== null &&
  'before_shipper_confirmation' in value &&
  value.before_shipper_confirmation === true;

type ForwarderAssignCardPropsT = {
  planId: string;
  planStatus: string;
};

export function ForwarderAssignCard({ planId, planStatus }: ForwarderAssignCardPropsT) {
  const forwardersQuery = useForwarderOrgs();
  const isSandbox = useIsSandbox();
  const confirmation = usePlatformConfirmation(planId);
  const counts = confirmationCounts(confirmation.data);
  const isAwaiting = (confirmation.data?.status ?? planStatus) === AWAITING_SHIPPERS_STATUS;
  const isBlocked = isAwaiting && !isSandbox;
  const blockedId = useId();
  const plansQuery = usePlatformPlans();
  const { assign, unassign } = useAssignForwarder(planId);
  const planItem = plansQuery.data?.find(item => item.plan_id === planId);
  const current = planItem?.forwarder ?? null;
  const isKnown = !!planItem;
  const [picked, setPicked] = useState('');
  const forwarderId = picked || current?.org_id || '';
  const isBusy = assign.isPending || unassign.isPending;
  const assignLabel = (assign.isPending && '배정 중') || (current ? '포워더 바꾸기' : '배정하기');
  const isBeforeConfirmation =
    isSandbox &&
    !!current &&
    (isAwaiting ||
      isFlaggedBeforeConfirmation(current) ||
      (assign.data?.before_shipper_confirmation === true &&
        assign.data.forwarder.org_id === current.org_id));
  const waitText = counts.total > 0 ? ` (${counts.accepted}/${counts.total} 수락)` : '';

  return (
    <section className="m2-card">
      <div className="mb-3.5">
        <h2 className="m2-h2">포워더 배정</h2>
        <p className="m2-sub">
          <AssignmentDescription
            isPending={plansQuery.isPending}
            isKnown={isKnown}
            forwarderName={current?.org_name ?? null}
          />
        </p>
      </div>
      <div className="flex min-w-0 flex-col gap-2">
        {plansQuery.isError && (
          <QueryError
            error={plansQuery.error}
            subject="배정 현황을"
            onRetry={() => plansQuery.refetch()}
            isRetrying={plansQuery.isFetching}
          />
        )}
        {forwardersQuery.isError && (
          <QueryError
            error={forwardersQuery.error}
            subject="포워더 목록을"
            onRetry={() => forwardersQuery.refetch()}
            isRetrying={forwardersQuery.isFetching}
          />
        )}
        {forwardersQuery.isPending && <Skeleton className="h-10 w-full rounded-[12px]" />}
        {forwardersQuery.data?.length === 0 && (
          <p className="m2-sub mt-0">가입한 포워더 조직이 없습니다.</p>
        )}
        {!!forwardersQuery.data?.length && plansQuery.isSuccess && (
          <Select value={forwarderId} onValueChange={setPicked}>
            <SelectTrigger
              aria-label="포워더"
              className="h-10 w-full min-w-0 rounded-[12px] bg-white *:data-[slot=select-value]:truncate"
            >
              <SelectValue placeholder="포워더 선택" />
            </SelectTrigger>
            <SelectContent>
              {forwardersQuery.data.map(({ org_id, org_name }) => (
                <SelectItem key={org_id} value={org_id}>
                  {org_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <div className="flex flex-wrap items-center gap-2">
          {!!forwardersQuery.data?.length && plansQuery.isSuccess && (
            <button
              type="button"
              className="m2-btn m2-btn-pri"
              disabled={!forwarderId || forwarderId === current?.org_id || isBusy || isBlocked}
              aria-describedby={isBlocked ? blockedId : ''}
              onClick={() => assign.mutate(forwarderId, { onSuccess: () => setPicked('') })}
            >
              {assignLabel}
            </button>
          )}
          {isBeforeConfirmation && <span className="m2-chip m2-chip-warn">화주 확인 전 배정</span>}
          {current && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <button type="button" className="m2-btn m2-btn-sec" disabled={isBusy}>
                  배정 해제
                </button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>포워더 배정을 해제할까요?</AlertDialogTitle>
                  <AlertDialogDescription>
                    {current.org_name}의 화면에서 이 계획이 사라지고, 실행 지시를 확정할 수 없게
                    됩니다.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>취소</AlertDialogCancel>
                  <AlertDialogAction onClick={() => unassign.mutate()}>해제</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
        {isBlocked && (
          <p id={blockedId} className="m2-note mt-1 text-[12.5px]">
            참여 화주가 모두 수락해야 포워더를 배정할 수 있습니다{waitText}.
          </p>
        )}
        {isAwaiting && isSandbox && !current && (
          <p className="m2-note mt-1 text-[12.5px]">
            데모 환경이라 화주 확인 전에도 배정할 수 있습니다. 배정하면 &lsquo;화주 확인 전
            배정&rsquo;으로 표시됩니다.
          </p>
        )}
      </div>
    </section>
  );
}

type AssignmentDescriptionPropsT = {
  isPending: boolean;
  isKnown: boolean;
  forwarderName: string | null;
};

function AssignmentDescription({ isPending, isKnown, forwarderName }: AssignmentDescriptionPropsT) {
  if (isPending) return '배정 현황을 불러오는 중입니다.';
  if (!isKnown) return '지금 배정 현황을 확인할 수 없습니다.';
  if (!forwarderName) {
    return '아직 배정된 포워더가 없습니다. 배정하면 포워더 화면에 이 계획이 보입니다.';
  }

  return (
    <>
      지금 <span className="font-semibold text-m2-ink">{forwarderName}</span>
      {subjectParticle(forwarderName)} 이 항차의 실행 지시를 확정합니다.
    </>
  );
}
