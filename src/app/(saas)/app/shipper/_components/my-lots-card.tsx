'use client';

import { cn } from 'cn';
import Link from 'next/link';

import { lotLabel } from '@/app/(saas)/app/shipper/_components/lot-label';
import { LotStatusChip } from '@/app/(saas)/app/shipper/_components/lot-status-chip';
import {
  CARD_HIDE,
  CARD_MAIN,
  CARD_PUSH,
  CARD_TABLE,
  MOBILE_ONLY,
} from '@/app/(saas)/app/shipper/_components/mobile';
import type { MyPlanT } from '@/app/(saas)/app/shipper/_components/my-plan';
import { EmptyState, QueryError } from '@/app/(saas)/app/shipper/_components/query-state';
import { fmtDay, fmtMonthDay } from '@/app/(saas)/app/shipper/_components/shipper-format';
import { SHIPPER_PATHS } from '@/app/(saas)/app/shipper/_components/shipper-paths';
import { useMapLinkTarget } from '@/components/map-link';
import { Skeleton } from '@/components/ui/skeleton';
import type { ShipperCatalogT, ShipperLotT } from '@/types/saas-shipper';
import { getPortName } from '@/utils/scenario';

const HOME_LOT_LIMIT = 6;

function LotRow({
  lot,
  catalog,
  keys,
  awaitingConfirm,
}: {
  lot: ShipperLotT;
  catalog: ShipperCatalogT | null;
  keys: string[];
  awaitingConfirm: boolean;
}) {
  const { className: linkClassName, ...link } = useMapLinkTarget(keys);
  const packhouse = catalog?.packhouses.find(({ id }) => id === lot.packhouse);
  const portName = catalog ? getPortName(catalog, lot.destination) : lot.destination;

  return (
    <tr
      {...link}
      tabIndex={0}
      title={lot.id}
      className={cn(lot.status === 'cancelled' && 'is-dis', linkClassName)}
    >
      <td className={CARD_MAIN}>
        <div className="m2-who">
          {lotLabel(lot, catalog)}
          <small>
            {packhouse?.name ?? ''}
            <span className={MOBILE_ONLY}>
              {packhouse ? ' · ' : ''}
              {portName} · 판매기한 {fmtMonthDay(lot.sell_by_date)}
            </span>
          </small>
        </div>
      </td>
      <td className={cn('r m2-num', CARD_HIDE)}>{lot.pallets}</td>
      <td className={cn('m2-num', CARD_HIDE)}>{fmtDay(lot.ready_date)}</td>
      <td className={CARD_HIDE}>{portName}</td>
      <td className={cn('m2-num', CARD_HIDE)}>{fmtMonthDay(lot.sell_by_date)}</td>
      <td className={CARD_PUSH}>
        <LotStatusChip status={lot.status} awaitingConfirm={awaitingConfirm} />
      </td>
    </tr>
  );
}

type MyLotsCardPropsT = {
  lots: ShipperLotT[] | undefined;
  isError: boolean;
  isRetrying: boolean;
  onRetry: () => void;
  catalog: ShipperCatalogT | null;
  myPlan: MyPlanT | null;
  awaitingLotIds: ReadonlySet<string>;
};

export function MyLotsCard({
  lots,
  isError,
  isRetrying,
  onRetry,
  catalog,
  myPlan,
  awaitingLotIds,
}: MyLotsCardPropsT) {
  if (isError) {
    return (
      <QueryError message="출하를 불러오지 못했습니다." onRetry={onRetry} isRetrying={isRetrying} />
    );
  }

  const visible = [...(lots ?? [])]
    .filter(({ status }) => status !== 'cancelled')
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .slice(0, HOME_LOT_LIMIT);
  const inPlan = new Set(myPlan?.assignments.map(({ lot_id }) => lot_id) ?? []);
  const total = (lots ?? []).filter(({ status }) => status !== 'cancelled').length;

  return (
    <section className="m2-card" aria-label="내 출하">
      <div className="m2-card-h">
        <h2 className="m2-h2">내 출하</h2>
        <div className="flex items-center gap-3">
          {myPlan && (
            <span className="m2-sub mt-0 max-[720px]:hidden">행을 고르면 지도에 표시</span>
          )}
          <Link href={SHIPPER_PATHS.LOTS} className="m2-btn m2-btn-sec m2-btn-sm">
            {total > visible.length ? `전체 ${total}건` : '출하 관리'}
          </Link>
        </div>
      </div>
      {!lots && <Skeleton className="h-40" />}
      {lots && visible.length === 0 && (
        <EmptyState
          title="등록한 출하가 없습니다"
          description="품목·수량·목적지·출하 가능일·선과장만 넣으면 됩니다."
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
                <th>목적지</th>
                <th>판매기한</th>
                <th>상태</th>
              </tr>
            </thead>
            <tbody>
              {visible.map(lot => (
                <LotRow
                  key={lot.id}
                  lot={lot}
                  catalog={catalog}
                  awaitingConfirm={awaitingLotIds.has(lot.id)}
                  keys={
                    myPlan && inPlan.has(lot.id)
                      ? myPlan.lotKeys(lot.id, lot.packhouse ?? null)
                      : []
                  }
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
