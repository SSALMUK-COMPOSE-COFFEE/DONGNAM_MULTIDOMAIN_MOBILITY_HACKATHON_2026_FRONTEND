'use client';

import { useDeleteDevice, useDevices } from '@/apis/saas/platform';
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
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { DeviceT } from '@/types/saas-platform';
import { formatMonthDayTime } from '@/utils/format';

export function DeviceListCard() {
  const { data: devices, isPending, isError, error, refetch, isFetching } = useDevices();

  return (
    <Card>
      <CardHeader>
        <CardTitle>등록한 기기</CardTitle>
      </CardHeader>
      <CardContent>
        {isError && (
          <QueryError
            error={error}
            subject="기기 목록을"
            onRetry={() => refetch()}
            isRetrying={isFetching}
          />
        )}
        {isPending && <Skeleton className="h-48" />}
        {devices?.length === 0 && (
          <EmptyState
            title="등록한 기기가 없습니다"
            description="위에서 센서 기기를 등록하고 계획의 컨테이너에 연결하세요."
          />
        )}
        {!!devices?.length && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>기기 ID</TableHead>
                <TableHead>이름</TableHead>
                <TableHead>연결</TableHead>
                <TableHead>마지막 수신</TableHead>
                <TableHead>등록</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {devices.map(device => (
                <DeviceRow key={device.device_id} device={device} />
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

function DeviceRow({ device }: { device: DeviceT }) {
  const remove = useDeleteDevice();
  const { binding } = device;

  return (
    <TableRow>
      <TableCell className="font-bold">{device.device_id}</TableCell>
      <TableCell>{device.name ?? '–'}</TableCell>
      <TableCell>
        {binding ? (
          <span>
            <span className="font-bold">{binding.container_id}</span>
            <span className="ml-1 text-sm text-muted-foreground">
              {binding.plan_id ?? '계획 없음'}
            </span>
          </span>
        ) : (
          <span className="text-muted-foreground">연결 안 됨</span>
        )}
      </TableCell>
      <TableCell className="num">{formatMonthDayTime(device.last_seen_at)}</TableCell>
      <TableCell className="num text-muted-foreground">
        {formatMonthDayTime(device.created_at)}
      </TableCell>
      <TableCell>
        <div className="flex justify-end gap-2">
          <BindDeviceDialog device={device} />
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button size="sm" variant="outline" disabled={remove.isPending}>
                삭제
              </Button>
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
      </TableCell>
    </TableRow>
  );
}
