'use client';

import { useState } from 'react';

import { usePlatformLots } from '@/apis/saas/platform';
import { EmptyState } from '@/app/(saas)/app/platform/_components/empty-state';
import {
  monthDay,
  portName,
  productOf,
  productShortName,
} from '@/app/(saas)/app/platform/_components/m2-format';
import { QueryError } from '@/app/(saas)/app/platform/_components/query-error';
import type { AddLotBlockT } from '@/app/(saas)/app/platform/plans/detail/_components/replan-gate';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import type { SaasPlanSessionT } from '@/types/api-saas';
import type { PlatformLotT } from '@/types/saas-platform';

type ReplanAddLotTabPropsT = {
  session: SaasPlanSessionT;
  isReplanning: boolean;
  onAddLot: (lotId: string, label: string) => void;
  addLotBlock: (shipperId: string) => AddLotBlockT;
  forwarderName: string | null;
};

const BLOCK_CAUSE: Record<NonNullable<AddLotBlockT>, string> = {
  unaccepted: '이 화주가 지금 계획을 아직 수락하지 않아',
  new: '이 화주가 계획에 처음 들어오는 화주라',
};

const WORKAROUND_STEPS = ['포워더 배정 해제', '이 출하 넣고 적용', '화주 수락', '포워더 재배정'];

export function ReplanAddLotTab({
  session,
  isReplanning,
  onAddLot,
  addLotBlock,
  forwarderName,
}: ReplanAddLotTabPropsT) {
  const { scenario } = session;
  const lotsQuery = usePlatformLots('registered');
  const [pickedId, setPickedId] = useState('');

  if (lotsQuery.isPending) return <Skeleton className="h-40 w-full rounded-[14px]" />;
  if (lotsQuery.isError) {
    return (
      <QueryError
        error={lotsQuery.error}
        subject="등록 출하를"
        onRetry={() => lotsQuery.refetch()}
        isRetrying={lotsQuery.isFetching}
      />
    );
  }

  const inPlan = new Set(scenario.lots.map(({ id }) => id));
  const shipperIds = new Set(scenario.shippers.map(({ id }) => id));
  const productIds = new Set(scenario.products.map(({ id }) => id));
  const portIds = new Set(scenario.ports.map(({ id }) => id));
  const fits = (lot: PlatformLotT) =>
    lot.scenario_id === session.scenario_id &&
    shipperIds.has(lot.shipper_id) &&
    productIds.has(lot.product_id) &&
    portIds.has(lot.destination);
  const candidates = lotsQuery.data.filter(
    lot => lot.status === 'registered' && !inPlan.has(lot.id)
  );
  const addable = candidates.filter(fits);
  const blockedCount = candidates.length - addable.length;
  const lot = addable.find(({ id }) => id === pickedId) ?? addable[0] ?? null;
  const productLabel = (target: PlatformLotT) =>
    productShortName(productOf(scenario, target.product_id), target.product_id);
  const lotLabel = (target: PlatformLotT) =>
    `${target.shipper_org_name} · ${productLabel(target)} ${monthDay(target.ready_date)} · ${target.pallets}파렛트`;

  if (!lot) {
    return (
      <EmptyState
        compact
        title="더 넣을 등록 출하가 없습니다"
        description={
          blockedCount > 0
            ? `등록 출하 ${blockedCount}건은 이 계획을 만든 뒤 가입한 화주이거나 시나리오에 없는 품목·항구라 새 계획으로 묶어야 합니다.`
            : '화주가 출하를 새로 등록하면 여기서 이 계획에 넣어 다시 짤 수 있습니다.'
        }
      />
    );
  }

  const run = () => onAddLot(lot.id, `출하 추가 · ${lotLabel(lot)}`);
  const block = addLotBlock(lot.shipper_id);

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <div className="m2-lbl">넣을 등록 출하</div>
      <Select value={lot.id} onValueChange={setPickedId}>
        <SelectTrigger
          aria-label="넣을 등록 출하"
          className="h-10 w-full min-w-0 rounded-[12px] bg-white *:data-[slot=select-value]:truncate"
        >
          <SelectValue placeholder="출하 선택" />
        </SelectTrigger>
        <SelectContent>
          {addable.map(item => (
            <SelectItem key={item.id} value={item.id}>
              {lotLabel(item)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <div className="m2-lines mt-0">
        <div>
          <span>화주</span>
          <b>{lot.shipper_org_name}</b>
        </div>
        <div>
          <span>품목 · 수량</span>
          <b>
            {productLabel(lot)} {lot.pallets}파렛트
          </b>
        </div>
        <div>
          <span>출하 가능일 · 판매기한</span>
          <b>
            {monthDay(lot.ready_date)} · {monthDay(lot.sell_by_date)}
            {lot.sell_window === 'short' ? ' (짧은 판매 기간)' : ''}
          </b>
        </div>
        <div>
          <span>목적항</span>
          <b>{portName(scenario, lot.destination)}</b>
        </div>
      </div>

      {blockedCount > 0 && (
        <p className="m2-sub mt-0">
          등록 출하 {blockedCount}건은 이 계획 시나리오에 없는 화주·품목·항구라 목록에서 뺐습니다.
        </p>
      )}

      {block && (
        <div className="m2-note m2-note-warn mt-0 flex-col items-start gap-1.5 text-[12.5px]">
          <p className="font-semibold">
            포워더{forwarderName ? ` ${forwarderName}` : ''}에게 배정된 계획이라{' '}
            {BLOCK_CAUSE[block]} 이 출하를 넣어 적용할 수 없습니다.
          </p>
          <p>
            세 가지 안은 계산해 볼 수 있지만 적용 버튼은 막힙니다. 넣으려면 아래 순서로 진행하세요.
          </p>
          <ol className="flex flex-wrap items-center gap-1.5">
            {WORKAROUND_STEPS.map((step, index) => (
              <li key={step} className="flex items-center gap-1.5">
                {index > 0 && <span aria-hidden>→</span>}
                <span className="m2-chip">
                  <span className="m2-num">{index + 1}</span> {step}
                </span>
              </li>
            ))}
          </ol>
        </div>
      )}

      <button
        type="button"
        className="m2-btn m2-btn-pri m2-btn-lg w-full"
        disabled={isReplanning}
        onClick={run}
      >
        {isReplanning ? '다시 짜는 중' : `${lot.shipper_org_name} 출하 넣고 다시 짜기`}
      </button>
    </div>
  );
}
