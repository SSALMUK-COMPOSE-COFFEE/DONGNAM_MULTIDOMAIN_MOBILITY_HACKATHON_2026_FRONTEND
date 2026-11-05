'use client';

import Link from 'next/link';
import { Select as SelectPrimitive } from 'radix-ui';
import { type ReactNode, useState } from 'react';

import { useForwarderPlan, useForwarderPlans } from '@/apis/saas/forwarder';
import { useForwarderQuantityPolicies } from '@/apis/saas/quantity-reservations';
import { ForwarderPageHeader } from '@/app/(saas)/app/forwarder/_components/forwarder-page-header';
import { FORWARDER_PATHS } from '@/app/(saas)/app/forwarder/_components/forwarder-paths';
import {
  quantityPercent,
  quantityTimestamp,
} from '@/app/(saas)/app/forwarder/voyages/_components/quantity-display';
import { VoyageDepartureConfirmation } from '@/app/(saas)/app/forwarder/voyages/_components/voyage-departure-confirmation';
import { VoyageOfferLog } from '@/app/(saas)/app/forwarder/voyages/_components/voyage-offer-log';
import { VoyagePolicyEditor } from '@/app/(saas)/app/forwarder/voyages/_components/voyage-policy-editor';
import {
  CardSkeleton,
  EmptyState,
  QueryError,
} from '@/app/(saas)/app/shipper/_components/query-state';
import { fmtWon } from '@/app/(saas)/app/shipper/_components/shipper-format';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Select, SelectContent, SelectTrigger } from '@/components/ui/select';
import type { VoyageQuantityStateT } from '@/types/saas-quantity';

const stateKey = (state: VoyageQuantityStateT) => `${state.plan_id}:${state.voyage_id}`;

export function VoyageSettingsView() {
  const query = useForwarderQuantityPolicies();
  const plans = useForwarderPlans();
  const [selectedKey, setSelectedKey] = useState('');
  const [editing, setEditing] = useState<VoyageQuantityStateT | null>(null);
  const states = query.data ?? [];
  const selected = states.find(state => stateKey(state) === selectedKey) ?? states[0];
  const planNames = new Map(
    (plans.data ?? []).map(plan => [plan.plan_id, plan.vessel ?? '운송계획'])
  );

  return (
    <>
      <ForwarderPageHeader
        eyebrow="포워더 · 항차 설정"
        title="항차별 수량·보충 관리"
        sub="항차별 수량 변경 마감과 정책, 빈 슬롯과 보충 제안 이력을 확인하세요."
      >
        <Link href={FORWARDER_PATHS.CONTAINERS} className="m2-btn m2-btn-sec">
          컨테이너 관리
        </Link>
      </ForwarderPageHeader>
      {query.isPending ? <CardSkeleton height={300} /> : null}
      {query.isError ? (
        <QueryError
          message="항차 수량 정책을 불러오지 못했습니다."
          onRetry={() => query.refetch()}
          isRetrying={query.isFetching}
        />
      ) : null}
      {query.isSuccess && !states.length ? (
        <EmptyState
          title="수량 정책을 적용한 항차가 없습니다"
          description="새 운송계획의 해상 배정이 생성되면 항차별 정책을 확인할 수 있습니다. 기존 계획에는 새 정책을 자동으로 소급 적용하지 않습니다."
          action={{ href: FORWARDER_PATHS.POOL, label: '출하 풀 보기' }}
        />
      ) : null}
      {selected ? (
        <div className="flex min-w-0 flex-col gap-4">
          <section className="m2-card min-w-0">
            <label className="mb-2 block text-sm font-semibold" id="quantity-voyage-label">
              항차 선택
            </label>
            <Select value={stateKey(selected)} onValueChange={setSelectedKey}>
              <SelectTrigger
                aria-labelledby="quantity-voyage-label"
                className="w-full max-w-full min-w-0"
                style={{ height: 'auto', minHeight: 44, width: '100%', whiteSpace: 'normal' }}
              >
                <span className="min-w-0 text-left" style={{ overflowWrap: 'anywhere' }}>
                  {planNames.get(selected.plan_id) ?? '운송계획'} · {selected.voyage_id}
                  <span className="mt-1 block text-xs text-m2-muted">
                    출항 예정 {quantityTimestamp(selected.policy.departure)}
                  </span>
                </span>
              </SelectTrigger>
              <SelectContent>
                {states.map(state => (
                  <SelectPrimitive.Item
                    key={stateKey(state)}
                    value={stateKey(state)}
                    className="min-w-0 cursor-default rounded-md px-3 py-3 text-sm outline-none data-highlighted:bg-accent"
                  >
                    <SelectPrimitive.ItemText>
                      <span
                        style={{ display: 'block', whiteSpace: 'normal', overflowWrap: 'anywhere' }}
                      >
                        {planNames.get(state.plan_id) ?? '운송계획'} · {state.voyage_id}
                        <span className="mt-1 block text-xs text-m2-muted">
                          출항 예정 {quantityTimestamp(state.policy.departure)}
                        </span>
                      </span>
                    </SelectPrimitive.ItemText>
                  </SelectPrimitive.Item>
                ))}
              </SelectContent>
            </Select>
          </section>
          <VoyageSummary
            key={stateKey(selected)}
            state={selected}
            onEdit={() => setEditing(selected)}
          />
          <VoyageOfferLog
            key={`offers:${stateKey(selected)}`}
            planId={selected.plan_id}
            voyageId={selected.voyage_id}
          />
          <VoyageDepartureConfirmation key={`departure:${stateKey(selected)}`} state={selected} />
        </div>
      ) : null}
      <Dialog
        open={editing !== null}
        onOpenChange={open => {
          if (!open) setEditing(null);
        }}
      >
        <DialogContent
          data-ui="m2"
          className="max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] overflow-y-auto sm:max-w-[760px]"
        >
          {editing ? (
            <VoyagePolicyEditor
              key={stateKey(editing)}
              state={editing}
              onDone={() => setEditing(null)}
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}

function VoyageSummary({ state, onEdit }: { state: VoyageQuantityStateT; onEdit: () => void }) {
  const plan = useForwarderPlan(state.plan_id);
  const voyage = plan.data?.scenario.voyages.find(item => item.id === state.voyage_id);

  return (
    <>
      <div className="grid min-w-0 grid-cols-1 gap-3 min-[600px]:grid-cols-3">
        {[
          { label: '총 슬롯', value: state.capacity_quantity },
          { label: '배정 수량', value: state.occupied_quantity },
          { label: '빈 슬롯', value: state.vacant_quantity },
        ].map(item => (
          <section key={item.label} className="m2-card min-w-0" aria-label={item.label}>
            <p className="m2-sub mt-0">{item.label}</p>
            <p className="m2-num mt-2 text-2xl font-bold">
              {item.value.toLocaleString('ko-KR')}
              <span className="ml-1 text-sm font-normal text-m2-muted">파렛트</span>
            </p>
          </section>
        ))}
      </div>
      <section className="m2-card min-w-0">
        <div className="m2-card-h flex-wrap gap-3">
          <div className="min-w-0">
            <h2 className="m2-h2 break-words">{voyage?.vessel_name ?? state.voyage_id}</h2>
            <p className="m2-sub break-all">
              {state.voyage_id} · 설정 버전 {state.revision}
            </p>
          </div>
          <button
            type="button"
            className="m2-btn m2-btn-sec"
            onClick={onEdit}
            disabled={state.policy_locked}
          >
            {state.policy_locked ? '수량 확정 · 설정 잠김' : '항차 정책 수정'}
          </button>
        </div>
        <dl className="grid min-w-0 gap-4 text-sm min-[600px]:grid-cols-2">
          <PolicyLine label="수량 변경 마감 (KST)">
            {quantityTimestamp(state.policy.cutoff)}
          </PolicyLine>
          <PolicyLine label="출항 예정 (KST)">
            {quantityTimestamp(state.policy.departure)}
          </PolicyLine>
          <PolicyLine label="취소 정산 기준 단가">
            {fmtWon(state.policy.slot_rate_krw)} / 파렛트
          </PolicyLine>
          <PolicyLine label="예약 시작 / 수량 확정 / 임박 구간">
            마감 {state.policy.hold_days}일 / {state.policy.confirm_days}일 /{' '}
            {state.policy.late_days}일 전
          </PolicyLine>
          <PolicyLine label="확정 후 무료 감축 수량">{state.policy.free_adjust}파렛트</PolicyLine>
          <PolicyLine label="확정 / 임박 구간 요율">
            {quantityPercent(state.policy.rate_mid)} / {quantityPercent(state.policy.rate_late)}
          </PolicyLine>
          <PolicyLine label="제안 응답 기한">{state.policy.offer_timeout_minutes}분</PolicyLine>
          <PolicyLine label="집하 경로 추가 소요 한도">
            {state.policy.detour_max_minutes}분
          </PolicyLine>
        </dl>
        <p className="m2-sub mt-4">
          {state.policy.pilot
            ? '시범 항차 · 수량 조정 부담금 면제 정책입니다.'
            : '이 항차에 저장된 수량 조정 정책입니다.'}{' '}
          같은 항차의 컨테이너에 공통으로 적용됩니다.
        </p>
        {state.policy_locked ? (
          <p className="m2-sub mt-2">확정된 수량의 정책은 변경할 수 없습니다.</p>
        ) : null}
      </section>
    </>
  );
}

function PolicyLine({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-m2-muted">{label}</dt>
      <dd className="mt-1 font-semibold break-words">{children}</dd>
    </div>
  );
}
