'use client';

import { useMutation, useQuery } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import { ArrowRightIcon } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import { scenarioQueryOptions } from '@/apis/getScenario';
import { postIntakeLot } from '@/apis/postIntakeLot';
import { type IntakeFieldErrorT, IntakeForm } from '@/app/intake/_components/intake-form';
import { IntakePreview } from '@/app/intake/_components/intake-preview';
import { ShipmentList } from '@/app/intake/_components/shipment-list';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { DEMO_SCENARIO_ID } from '@/consts/demo';
import { ROUTES } from '@/consts/route';
import { useCreatePlan } from '@/hooks/useCreatePlan';

/** 422 응답의 detail: [{ field, message }] */
const toFieldErrors = (error: unknown): IntakeFieldErrorT[] => {
  const detail = isAxiosError(error) ? error.response?.data?.detail : null;

  return Array.isArray(detail) ? detail : [];
};

export function IntakeView() {
  const router = useRouter();
  const { data: scenario, isError, refetch } = useQuery(scenarioQueryOptions(DEMO_SCENARIO_ID));

  const intake = useMutation({
    mutationFn: postIntakeLot,
    onError: error => {
      if (toFieldErrors(error).length === 0) toast.error('출하를 확인하지 못했습니다.');
    },
  });

  const createPlan = useCreatePlan();

  if (isError) {
    return (
      <Button variant="outline" onClick={() => refetch()}>
        시나리오를 불러오지 못했습니다. 다시 시도
      </Button>
    );
  }
  if (!scenario) return <Skeleton className="h-96" />;

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-[480px_1fr] gap-6">
        <IntakeForm
          scenario={scenario}
          isPending={intake.isPending}
          fieldErrors={toFieldErrors(intake.error)}
          onSubmit={request => intake.mutate(request)}
        />
        <IntakePreview preview={intake.data ?? null} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            이번 주 등록된 출하 <span className="num text-brand">{scenario.lots.length}</span>건
          </CardTitle>
          <CardDescription>
            화주{' '}
            <span className="num">
              {new Set(scenario.lots.map(({ shipper_id }) => shipper_id)).size}
            </span>
            곳의 출하를 한 계획으로 묶는다 · 딸기와 SO2 처리 포도는 컨테이너를 나눈다
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          <ShipmentList scenario={scenario} />
          <Button
            size="lg"
            className="self-end"
            disabled={createPlan.isPending}
            onClick={() =>
              createPlan
                .mutateAsync()
                .then(() => router.push(ROUTES.PLAN))
                .catch(() => toast.error('계획을 만들지 못했습니다.'))
            }
          >
            {createPlan.isPending ? 'AI가 최적화하는 중' : '이 출하들로 공동적재 계획 만들기'}
            <ArrowRightIcon />
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
