'use client';

import { useState } from 'react';
import { toast } from 'sonner';

import { useDeleteShipperLot, useShipperLots, useUpdateShipperLot } from '@/apis/saas/shipper';
import {
  LOCKED_LOT_STATUSES,
  LOT_STATUS_LABEL,
  SELL_WINDOW_LABEL,
} from '@/app/(saas)/app/shipper/_components/labels';
import { LotEditDialog } from '@/app/(saas)/app/shipper/_components/lot-edit-dialog';
import {
  EmptyState,
  QueryError,
  errorDetail,
} from '@/app/(saas)/app/shipper/_components/query-state';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
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
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { ShipperCatalogT, ShipperLotStatusT, ShipperLotT } from '@/types/saas-shipper';
import { formatMonthDay } from '@/utils/format';
import { getPortName, getProductName } from '@/utils/scenario';

type FilterT = 'all' | ShipperLotStatusT;

const FILTERS: { value: FilterT; label: string }[] = [
  { value: 'all', label: '전체' },
  { value: 'registered', label: LOT_STATUS_LABEL.registered },
  { value: 'planned', label: LOT_STATUS_LABEL.planned },
  { value: 'shipped', label: LOT_STATUS_LABEL.shipped },
  { value: 'cancelled', label: LOT_STATUS_LABEL.cancelled },
];

export function LotTable({ catalog }: { catalog: ShipperCatalogT | null }) {
  const [filter, setFilter] = useState<FilterT>('all');
  const [editing, setEditing] = useState<ShipperLotT | null>(null);
  const [deleting, setDeleting] = useState<ShipperLotT | null>(null);
  const lots = useShipperLots();
  const updateLot = useUpdateShipperLot();
  const deleteLot = useDeleteShipperLot();

  const visible = (lots.data ?? [])
    .filter(({ status }) => filter === 'all' || status === filter)
    .sort((a, b) => a.ready_date.localeCompare(b.ready_date) || a.id.localeCompare(b.id));

  const productName = (productId: string) =>
    catalog ? getProductName(catalog, productId) : productId;
  const portName = (portId: string) => (catalog ? getPortName(catalog, portId) : portId);

  const setStatus = (lot: ShipperLotT, status: 'registered' | 'cancelled') =>
    updateLot.mutate(
      { lotId: lot.id, patch: { status } },
      {
        onSuccess: () =>
          toast.success(status === 'cancelled' ? '출하를 취소했습니다.' : '출하를 되살렸습니다.'),
        onError: error => toast.error(errorDetail(error, '출하 상태를 바꾸지 못했습니다.')),
      }
    );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-4">
          내 출하
          {lots.data && (
            <span className="text-base font-medium text-muted-foreground">
              <span className="num">{lots.data.length}</span>건
            </span>
          )}
          <Tabs
            value={filter}
            onValueChange={value => setFilter(value as FilterT)}
            className="ml-auto"
          >
            <TabsList>
              {FILTERS.map(({ value, label }) => (
                <TabsTrigger key={value} value={value}>
                  {label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {lots.isError && (
          <QueryError
            message="출하 목록을 불러오지 못했습니다."
            onRetry={() => lots.refetch()}
            isRetrying={lots.isFetching}
          />
        )}
        {lots.isPending && <Skeleton className="h-48" />}
        {lots.data && visible.length === 0 && (
          <EmptyState
            title={filter === 'all' ? '등록한 출하가 없습니다' : '이 상태의 출하가 없습니다'}
            description={filter === 'all' ? '위 양식으로 첫 출하를 등록하세요.' : ''}
          />
        )}
        {visible.length > 0 && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>로트</TableHead>
                <TableHead>품목</TableHead>
                <TableHead className="text-right">파렛트</TableHead>
                <TableHead className="text-right">출하일</TableHead>
                <TableHead className="text-right">판매기한</TableHead>
                <TableHead>판매 기간</TableHead>
                <TableHead>목적지</TableHead>
                <TableHead>상태</TableHead>
                <TableHead className="text-right">관리</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visible.map(lot => {
                const isLocked = LOCKED_LOT_STATUSES.includes(lot.status);
                const isBusy =
                  (updateLot.isPending && updateLot.variables?.lotId === lot.id) ||
                  (deleteLot.isPending && deleteLot.variables === lot.id);

                return (
                  <TableRow key={lot.id}>
                    <TableCell className="font-bold num">{lot.id}</TableCell>
                    <TableCell>{productName(lot.product_id)}</TableCell>
                    <TableCell className="text-right num">{lot.pallets}</TableCell>
                    <TableCell className="text-right num">
                      {formatMonthDay(lot.ready_date)}
                    </TableCell>
                    <TableCell className="text-right num">
                      {formatMonthDay(lot.sell_by_date)}
                    </TableCell>
                    <TableCell>{SELL_WINDOW_LABEL[lot.sell_window]}</TableCell>
                    <TableCell>{portName(lot.destination)}</TableCell>
                    <TableCell>
                      <Badge variant={lot.status === 'cancelled' ? 'outline' : 'secondary'}>
                        {LOT_STATUS_LABEL[lot.status]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {isLocked ? (
                        <span className="text-sm text-muted-foreground">
                          계획 확정 후 변경 불가
                        </span>
                      ) : (
                        <div className="flex justify-end gap-2">
                          {lot.status === 'registered' && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={isBusy || !catalog}
                                onClick={() => setEditing(lot)}
                              >
                                수정
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={isBusy}
                                onClick={() => setStatus(lot, 'cancelled')}
                              >
                                취소
                              </Button>
                            </>
                          )}
                          {lot.status === 'cancelled' && (
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={isBusy}
                              onClick={() => setStatus(lot, 'registered')}
                            >
                              되살리기
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="destructive"
                            disabled={isBusy}
                            onClick={() => setDeleting(lot)}
                          >
                            삭제
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>

      {editing && catalog && (
        <LotEditDialog lot={editing} catalog={catalog} onClose={() => setEditing(null)} />
      )}

      <AlertDialog open={!!deleting} onOpenChange={open => !open && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>출하를 삭제할까요?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleting?.id} 출하를 목록에서 지웁니다. 되돌릴 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>닫기</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                if (!deleting) return;
                deleteLot.mutate(deleting.id, {
                  onSuccess: () => toast.success('출하를 삭제했습니다.'),
                  onError: error => toast.error(errorDetail(error, '출하를 삭제하지 못했습니다.')),
                });
                setDeleting(null);
              }}
            >
              삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
