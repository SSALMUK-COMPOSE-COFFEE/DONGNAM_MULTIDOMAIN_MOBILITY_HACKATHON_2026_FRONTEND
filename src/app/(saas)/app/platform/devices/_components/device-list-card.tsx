'use client';

import { useDeleteDevice, useDevices, usePlatformPlans } from '@/apis/saas/platform';
import { EmptyState } from '@/app/(saas)/app/platform/_components/empty-state';
import { QueryError } from '@/app/(saas)/app/platform/_components/query-error';
import { BindDeviceDialog } from '@/app/(saas)/app/platform/devices/_components/bind-device-dialog';
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
import { Skeleton } from '@/components/ui/skeleton';
import type { DeviceT } from '@/types/saas-platform';
import { formatKstMonthDayTime } from '@/utils/kst';
import { planOptionLabel } from '@/utils/plan-label';

export function DeviceListCard() {
  const { data: devices, isPending, isError, error, refetch, isFetching } = useDevices();
  const { data: plans } = usePlatformPlans();
  const planLabels = new Map(plans?.map(plan => [plan.plan_id, planOptionLabel(plan)]));

  return (
    <section className="m2-card">
      <div className="m2-card-h">
        <h2 className="m2-h2">등록한 기기</h2>
        {devices ? <span className="m2-chip m2-num">{devices.length}대</span> : null}
      </div>
      <div>
        {isError && (
          <QueryError
            error={error}
            subject="기기 목록을"
            onRetry={() => refetch()}
            isRetrying={isFetching}
          />
        )}
        {isPending && <Skeleton className="h-48 rounded-[14px]" />}
        {devices?.length === 0 && (
          <EmptyState
            title="등록한 기기가 없습니다"
            description="위에서 센서 기기를 등록하고 계획의 컨테이너에 연결하세요."
          />
        )}
        {!!devices?.length && (
          <div className="-mx-2.5 overflow-x-auto px-2.5">
            <table className="m2-table">
              <thead>
                <tr>
                  <th>기기 ID</th>
                  <th>이름</th>
                  <th>연결</th>
                  <th>마지막 수신</th>
                  <th>등록</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {devices.map(device => (
                  <DeviceRow key={device.device_id} device={device} planLabels={planLabels} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}

function DeviceRow({ device, planLabels }: { device: DeviceT; planLabels: Map<string, string> }) {
  const remove = useDeleteDevice();
  const { binding } = device;

  return (
    <tr>
      <td className="m2-mono font-semibold">{device.device_id}</td>
      <td>{device.name ?? '–'}</td>
      <td>
        {binding ? (
          <span>
            <span className="font-semibold">{binding.container_id}</span>
            <span className="ml-1.5 text-[12px] text-m2-muted">
              {binding.plan_id ? (planLabels.get(binding.plan_id) ?? binding.plan_id) : '계획 없음'}
            </span>
          </span>
        ) : (
          <span className="text-m2-muted">연결 안 됨</span>
        )}
      </td>
      <td className="m2-num">{formatKstMonthDayTime(device.last_seen_at)}</td>
      <td className="m2-num text-m2-muted">{formatKstMonthDayTime(device.created_at)}</td>
      <td>
        <div className="flex justify-end gap-2">
          <BindDeviceDialog device={device} />
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <button
                type="button"
                className="m2-btn m2-btn-sec m2-btn-sm"
                disabled={remove.isPending}
              >
                삭제
              </button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{device.device_id} 기기를 삭제할까요?</AlertDialogTitle>
                <AlertDialogDescription>
                  발급한 토큰이 더는 통하지 않고, 컨테이너 연결도 끊깁니다.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>취소</AlertDialogCancel>
                <AlertDialogAction
                  variant="destructive"
                  onClick={() => remove.mutate(device.device_id)}
                >
                  삭제
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </td>
    </tr>
  );
}
