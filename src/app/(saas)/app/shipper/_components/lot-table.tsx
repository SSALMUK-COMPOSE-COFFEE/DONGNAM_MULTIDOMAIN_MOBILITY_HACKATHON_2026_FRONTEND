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
import { LotStatusChip } from '@/app/(saas)/app/shipper/_components/lot-status-chip';
import {
  EmptyState,
  QueryError,
  errorDetail,
} from '@/app/(saas)/app/shipper/_components/query-state';
import { fmtDay, fmtMonthDay } from '@/app/(saas)/app/shipper/_components/shipper-format';
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
import { Skeleton } from '@/components/ui/skeleton';
import type { ShipperCatalogT, ShipperLotStatusT, ShipperLotT } from '@/types/saas-shipper';
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
  const packhouseName = (packhouseId: string | null | undefined) =>
    catalog?.packhouses.find(({ id }) => id === packhouseId)?.name ?? '';

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
    <section className="m2-card" aria-label="내 출하 목록">
      <div className="m2-card-h flex-wrap">
        <h2 className="m2-h2">
          내 출하
          {lots.data && (
            <span className="m2-sub mt-0 ml-2 inline font-medium">
              <span className="m2-num">{lots.data.length}</span>건
            </span>
          )}
        </h2>
        <div
          role="tablist"
          aria-label="출하 상태"
          className="flex flex-wrap gap-1 rounded-[12px] bg-[rgba(15,27,51,.05)] p-1"
        >
          {FILTERS.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={filter === value}
              onClick={() => setFilter(value)}
              className="h-8 rounded-[9px] border-0 bg-transparent px-3 text-[12.5px] font-semibold text-m2-muted transition-colors duration-200 ease-[cubic-bezier(.2,.8,.2,1)] aria-selected:bg-white aria-selected:text-m2-ink aria-selected:shadow-[0_1px_2px_rgba(15,27,51,.08)] motion-reduce:transition-none"
            >
              {label}
            </button>
          ))}
        </div>
      </div>
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
          description={
            filter === 'all' && !!catalog?.shippers.length
              ? '위 양식으로 첫 출하를 등록하세요.'
              : ''
          }
        />
      )}
      {visible.length > 0 && (
        <div className="overflow-x-auto">
          <table className="m2-table">
            <thead>
              <tr>
                <th>출하</th>
                <th className="r">팔레트</th>
                <th>준비일</th>
                <th>판매기한</th>
                <th>판매 기간</th>
                <th>목적지</th>
                <th>상태</th>
                <th className="r">관리</th>
              </tr>
            </thead>
            <tbody>
              {visible.map(lot => {
                const isLocked = LOCKED_LOT_STATUSES.includes(lot.status);
                const isBusy =
                  (updateLot.isPending && updateLot.variables?.lotId === lot.id) ||
                  (deleteLot.isPending && deleteLot.variables === lot.id);

                return (
                  <tr key={lot.id} className={lot.status === 'cancelled' ? 'is-dis' : ''}>
                    <td>
                      <div className="m2-who">
                        {productName(lot.product_id)}
                        <small>
                          <span className="m2-mono">{lot.id}</span>
                          {packhouseName(lot.packhouse) ? ` · ${packhouseName(lot.packhouse)}` : ''}
                        </small>
                      </div>
                    </td>
                    <td className="r m2-num">{lot.pallets}</td>
                    <td className="m2-num">{fmtDay(lot.ready_date)}</td>
                    <td className="m2-num">{fmtMonthDay(lot.sell_by_date)}</td>
                    <td>{SELL_WINDOW_LABEL[lot.sell_window]}</td>
                    <td>{portName(lot.destination)}</td>
                    <td>
                      <LotStatusChip status={lot.status} />
                    </td>
                    <td className="r">
                      {isLocked ? (
                        <span className="text-[12px] text-m2-muted">계획 확정 후 변경 불가</span>
                      ) : (
                        <div className="flex justify-end gap-1.5">
                          {lot.status === 'registered' && (
                            <>
                              <button
                                type="button"
                                className="m2-btn m2-btn-sec m2-btn-sm"
                                disabled={isBusy || !catalog}
                                onClick={() => setEditing(lot)}
                              >
                                수정
                              </button>
                              <button
                                type="button"
                                className="m2-btn m2-btn-sec m2-btn-sm"
                                disabled={isBusy}
                                onClick={() => setStatus(lot, 'cancelled')}
                              >
                                취소
                              </button>
                            </>
                          )}
                          {lot.status === 'cancelled' && (
                            <button
                              type="button"
                              className="m2-btn m2-btn-sec m2-btn-sm"
                              disabled={isBusy}
                              onClick={() => setStatus(lot, 'registered')}
                            >
                              되살리기
                            </button>
                          )}
                          <button
                            type="button"
                            className="m2-btn m2-btn-sm bg-m2-berry-soft text-m2-berry-ink"
                            disabled={isBusy}
                            onClick={() => setDeleting(lot)}
                          >
                            삭제
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

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
    </section>
  );
}
