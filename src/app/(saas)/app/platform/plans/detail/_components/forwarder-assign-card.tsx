'use client';

import { useState } from 'react';

import { useAssignForwarder, useForwarderOrgs, usePlatformPlans } from '@/apis/saas/platform';
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
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';

export function ForwarderAssignCard({ planId }: { planId: string }) {
  const forwardersQuery = useForwarderOrgs();
  const plansQuery = usePlatformPlans();
  const { assign, unassign } = useAssignForwarder(planId);
  const planItem = plansQuery.data?.find(item => item.plan_id === planId);
  const current = planItem?.forwarder ?? null;
  const isKnown = !!planItem;
  const [picked, setPicked] = useState('');
  const forwarderId = picked || current?.org_id || '';
  const isBusy = assign.isPending || unassign.isPending;
  const assignLabel = (assign.isPending && '배정 중') || (current ? '포워더 바꾸기' : '배정하기');

  return (
    <Card>
      <CardHeader>
        <CardTitle>포워더 배정</CardTitle>
        <CardDescription>
          <AssignmentDescription
            isPending={plansQuery.isPending}
            isKnown={isKnown}
            forwarderName={current?.org_name ?? null}
          />
        </CardDescription>
      </CardHeader>
      <CardContent className="flex items-center gap-3">
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
        {forwardersQuery.isPending && <Skeleton className="h-9 w-80" />}
        {forwardersQuery.data?.length === 0 && (
          <p className="text-muted-foreground">가입한 포워더 조직이 없습니다.</p>
        )}
        {!!forwardersQuery.data?.length && plansQuery.isSuccess && (
          <>
            <Select value={forwarderId} onValueChange={setPicked}>
              <SelectTrigger className="w-80">
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
            <Button
              disabled={!forwarderId || forwarderId === current?.org_id || isBusy}
              onClick={() => assign.mutate(forwarderId, { onSuccess: () => setPicked('') })}
            >
              {assignLabel}
            </Button>
          </>
        )}
        {current && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" disabled={isBusy}>
                배정 해제
              </Button>
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
      </CardContent>
    </Card>
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
      지금 <span className="font-bold text-navy">{forwarderName}</span>가 이 항차의 실행 지시를
      확정합니다.
    </>
  );
}
