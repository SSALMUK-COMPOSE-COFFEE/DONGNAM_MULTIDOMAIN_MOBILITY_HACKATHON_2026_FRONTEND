'use client';

import { cn } from 'cn';
import { type MouseEvent, useRef, useState } from 'react';
import { toast } from 'sonner';

import { useDeleteShipperLot, useShipperLots, useUpdateShipperLot } from '@/apis/saas/shipper';
import {
  LOCKED_LOT_STATUSES,
  LOT_STATUS_LABEL,
  SELL_WINDOW_LABEL,
} from '@/app/(saas)/app/shipper/_components/labels';
import {
  LossBasisChip,
  lossRateText,
} from '@/app/(saas)/app/shipper/_components/loss-disclosure-card';
import { LotEditDialog } from '@/app/(saas)/app/shipper/_components/lot-edit-dialog';
import { lotLabel } from '@/app/(saas)/app/shipper/_components/lot-label';
import { LotStatusChip } from '@/app/(saas)/app/shipper/_components/lot-status-chip';
import {
  CARD_HIDE,
  CARD_MAIN,
  CARD_PUSH,
  CARD_TABLE,
  MOBILE_ONLY,
} from '@/app/(saas)/app/shipper/_components/mobile';
import {
  EmptyState,
  QueryError,
  errorDetail,
} from '@/app/(saas)/app/shipper/_components/query-state';
import { fmtDay, fmtMonthDay } from '@/app/(saas)/app/shipper/_components/shipper-format';
import { SHIPPER_PATHS } from '@/app/(saas)/app/shipper/_components/shipper-paths';
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
import { getPortName } from '@/utils/scenario';

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
  const headingRef = useRef<HTMLHeadingElement>(null);
  const openerRef = useRef<HTMLButtonElement | null>(null);

  const rememberOpener = (event: MouseEvent<HTMLButtonElement>) => {
    openerRef.current = event.currentTarget;
  };

  const restoreFocus = (event: Event) => {
    event.preventDefault();
    const opener = openerRef.current;
    openerRef.current = null;
    if (opener?.isConnected && !opener.disabled) {
      opener.focus();

      return;
    }
    headingRef.current?.focus();
  };

  const visible = (lots.data ?? [])
    .filter(({ status }) => filter === 'all' || status === filter)
    .sort((a, b) => a.ready_date.localeCompare(b.ready_date) || a.id.localeCompare(b.id));

  const portName = (portId: string) => (catalog ? getPortName(catalog, portId) : portId);
  const packhouseName = (packhouseId: string | null | undefined) =>
    catalog?.packhouses.find(({ id }) => id === packhouseId)?.name ?? '';

  const needsPackhouse = !!catalog && catalog.shippers.length === 0;
  const emptyDescription = () => {
    if (filter !== 'all') return '';

    return needsPackhouse
      ? '선과장을 먼저 등록하면 출하를 올릴 수 있어요.'
      : '위 양식으로 첫 출하를 등록하세요.';
  };

  const setStatus = (lot: ShipperLotT, status: 'registered' | 'cancelled') =>
    updateLot.mutate(
      { lotId: lot.id, patch: { status } },
      {
        onSuccess: () =>
          toast.success(
            `${lotLabel(lot, catalog)} 출하를 ${status === 'cancelled' ? '취소했습니다' : '되살렸습니다'}.`
          ),
        onError: error => toast.error(errorDetail(error, '출하 상태를 바꾸지 못했습니다.')),
      }
    );

  return (
    <section className="m2-card" aria-label="내 출하 목록">
      <div className="m2-card-h flex-wrap">
        <h2 ref={headingRef} tabIndex={-1} className="m2-h2 outline-none">
          내 출하
          {lots.data && (
            <span className="m2-sub mt-0 ml-2 inline font-medium">
              <span className="m2-num">{lots.data.length}</span>건
            </span>
          )}
        </h2>
        {lots.isCapped ? (
          <span className="m2-chip m2-chip-warn">
            최근 {lots.limit.toLocaleString('ko-KR')}건만 표시
          </span>
        ) : null}
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
          description={emptyDescription()}
          {...(filter === 'all' && needsPackhouse
            ? { action: { href: SHIPPER_PATHS.ONBOARDING, label: '선과장 등록하기' } }
            : {})}
        />
      )}
      {visible.length > 0 && (
        <div className="overflow-x-auto">
          <table className={cn('m2-table', CARD_TABLE)}>
            <thead>
              <tr>
                <th>출하</th>
                <th className="r">파렛트</th>
                <th>준비일</th>
                <th>판매기한</th>
                <th>판매 기간</th>
                <th>목적지</th>
                <th>
                  예상 손실률
                  <span className="sr-only"> (해상)</span>
                </th>
                <th>상태</th>
                <th className="r">관리</th>
              </tr>
            </thead>
            <tbody>
              {visible.map(lot => {
                const isLocked = LOCKED_LOT_STATUSES.includes(lot.status);
                const label = lotLabel(lot, catalog);
                const isBusy =
                  (updateLot.isPending && updateLot.variables?.lotId === lot.id) ||
                  (deleteLot.isPending && deleteLot.variables === lot.id);

                return (
                  <tr
                    key={lot.id}
                    title={lot.id}
                    className={lot.status === 'cancelled' ? 'is-dis' : ''}
                  >
                    <td className={CARD_MAIN}>
                      <div className="m2-who">
                        {label}
                        <small>
                          {packhouseName(lot.packhouse)}
                          <span className={MOBILE_ONLY}>
                            {packhouseName(lot.packhouse) ? ' · ' : ''}
                            {portName(lot.destination)} · 판매기한 {fmtMonthDay(lot.sell_by_date)} ·
                            판매 기간 {SELL_WINDOW_LABEL[lot.sell_window]}
                          </span>
                        </small>
                      </div>
                    </td>
                    <td className={cn('r m2-num', CARD_HIDE)}>{lot.pallets}</td>
                    <td className={cn('m2-num', CARD_HIDE)}>{fmtDay(lot.ready_date)}</td>
                    <td className={cn('m2-num', CARD_HIDE)}>{fmtMonthDay(lot.sell_by_date)}</td>
                    <td className={CARD_HIDE}>{SELL_WINDOW_LABEL[lot.sell_window]}</td>
                    <td className={CARD_HIDE}>{portName(lot.destination)}</td>
                    <td>
                      <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
                        <span className={cn('text-[12px] text-m2-muted', MOBILE_ONLY)}>
                          예상 손실
                        </span>
                        <span className="m2-num font-semibold">
                          {lossRateText(lot.expected_loss)}
                        </span>
                        <LossBasisChip loss={lot.expected_loss} />
                      </span>
                    </td>
                    <td>
                      <LotStatusChip status={lot.status} />
                    </td>
                    <td className={cn('r', CARD_PUSH)}>
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
                                aria-label={`${label} 수정`}
                                onClick={event => {
                                  rememberOpener(event);
                                  setEditing(lot);
                                }}
                              >
                                수정
                              </button>
                              <button
                                type="button"
                                className="m2-btn m2-btn-sec m2-btn-sm"
                                disabled={isBusy}
                                aria-label={`${label} 취소`}
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
                              aria-label={`${label} 되살리기`}
                              onClick={() => setStatus(lot, 'registered')}
                            >
                              되살리기
                            </button>
                          )}
                          <button
                            type="button"
                            className="m2-btn m2-btn-sm bg-m2-berry-soft text-m2-berry-ink"
                            disabled={isBusy}
                            aria-label={`${label} 삭제`}
                            onClick={event => {
                              rememberOpener(event);
                              setDeleting(lot);
                            }}
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
        <LotEditDialog
          lot={editing}
          catalog={catalog}
          onClose={() => setEditing(null)}
          onCloseAutoFocus={restoreFocus}
        />
      )}

      <AlertDialog open={!!deleting} onOpenChange={open => !open && setDeleting(null)}>
        <AlertDialogContent onCloseAutoFocus={restoreFocus}>
          <AlertDialogHeader>
            <AlertDialogTitle>출하를 삭제할까요?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleting ? lotLabel(deleting, catalog) : ''} 출하를 목록에서 지웁니다. 되돌릴 수
              없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>닫기</AlertDialogCancel>
            <AlertDialogAction
              className="bg-m2-berry-ink! text-white! hover:bg-m2-berry-ink/90!"
              onClick={() => {
                if (!deleting) return;
                openerRef.current = null;
                const deletedLabel = lotLabel(deleting, catalog);
                deleteLot.mutate(deleting.id, {
                  onSuccess: () => toast.success(`${deletedLabel} 출하를 삭제했습니다.`),
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
