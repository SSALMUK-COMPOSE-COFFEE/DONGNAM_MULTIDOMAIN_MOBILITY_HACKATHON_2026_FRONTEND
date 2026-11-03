'use client';

import { cn } from 'cn';
import { type FormEvent, useState } from 'react';

import { useColdchainTwin } from '@/apis/saas/coldchain';
import { useArrivalInspection } from '@/apis/saas/platform-analysis';
import { EmptyState } from '@/app/(saas)/app/platform/_components/empty-state';
import { so2Text, won } from '@/app/(saas)/app/platform/_components/m2-format';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { SaasPlanSessionT } from '@/types/api-saas';
import type { ArrivalSettlementResultT } from '@/types/saas-analysis';
import { formatKstMonthDayTime } from '@/utils/kst';
import { getProductName, getShipperName, getShipperShortName } from '@/utils/scenario';

type AssignmentT = SaasPlanSessionT['plan']['assignments'][number];
type InspectionT = NonNullable<SaasPlanSessionT['arrival_inspections']>[number];

const MODE_LABEL: Record<AssignmentT['mode'], string> = { sea: '해상', air: '항공' };

const pct = (rate: number | null | undefined, digits = 1) =>
  typeof rate === 'number' && Number.isFinite(rate) ? `${(rate * 100).toFixed(digits)}%` : '–';

const pointGap = (from: number, to: number) => {
  const gap = (to - from) * 100;
  const sign = gap > 0 ? '+' : '';

  return `${sign}${gap.toFixed(1)}%p`;
};

const parsePct = (text: string) => {
  if (text.trim() === '') return null;
  const value = Number(text);

  return Number.isFinite(value) && value >= 0 && value <= 100 ? value : null;
};

export function ArrivalInspectionCard({ session }: { session: SaasPlanSessionT }) {
  const { plan_id: planId, plan, scenario } = session;
  const lots = plan.assignments;
  const inspections = session.arrival_inspections ?? [];
  const inspectionOf = new Map(inspections.map(item => [item.lot_id, item]));
  const [pickedLotId, setPickedLotId] = useState('');
  const lot = lots.find(({ lot_id }) => lot_id === pickedLotId) ?? lots[0] ?? null;
  const [draft, setDraft] = useState<{ lotId: string; text: string } | null>(null);
  const text = draft && lot && draft.lotId === lot.lot_id ? draft.text : '';
  const value = parsePct(text);
  const isInvalid = text.trim() !== '' && value === null;
  const inspection = useArrivalInspection(planId);
  const twin = useColdchainTwin(planId, lot?.mode === 'sea' ? (lot.container_id ?? '') : '');
  const twinLot = twin.data?.loss.lots?.find(({ lot_id }) => lot_id === lot?.lot_id) ?? null;
  const recorded = lot ? (inspectionOf.get(lot.lot_id) ?? null) : null;
  const result = inspection.data && inspection.data.lot_id === lot?.lot_id ? inspection.data : null;

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!lot || value === null) return;
    inspection.mutate({ lot_id: lot.lot_id, inspected_loss_pct: value });
  };

  return (
    <section className="m2-card" aria-busy={inspection.isPending}>
      <div className="m2-card-h">
        <div>
          <h2 className="m2-h2">도착 검수</h2>
          <p className="m2-sub">
            로트별 실측 손실률을 넣으면 예측을 넘은 손실만큼 그 화주의 성과보수를 돌려줍니다.
          </p>
        </div>
        {inspections.length > 0 ? (
          <span className="m2-chip m2-chip-ok m2-num">검수 {inspections.length}건</span>
        ) : null}
      </div>
      {!lot ? (
        <EmptyState compact title="검수할 배정 로트가 없습니다" />
      ) : (
        <>
          <form onSubmit={submit} noValidate className="flex flex-col gap-3">
            <div className="m2-field mb-0">
              <span className="m2-lbl">로트</span>
              <Select
                value={lot.lot_id}
                onValueChange={next => {
                  setPickedLotId(next);
                  inspection.reset();
                }}
              >
                <SelectTrigger
                  aria-label="검수할 로트"
                  className="h-10 w-full min-w-0 rounded-[12px] bg-white *:data-[slot=select-value]:truncate"
                >
                  <SelectValue placeholder="로트 선택" />
                </SelectTrigger>
                <SelectContent>
                  {lots.map(item => (
                    <SelectItem key={item.lot_id} value={item.lot_id}>
                      {getShipperShortName(scenario, item.shipper_id)}{' '}
                      {so2Text(getProductName(scenario, item.product_id))} {item.pallets}파렛트 ·{' '}
                      {item.mode === 'sea' ? (item.container_id ?? '해상') : '항공'}
                      {inspectionOf.has(item.lot_id) ? ' · 검수됨' : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end gap-2">
              <label className="m2-field mb-0 min-w-0 flex-1">
                <span className="m2-lbl">실측 손실률 (%)</span>
                <input
                  type="number"
                  inputMode="decimal"
                  min={0}
                  max={100}
                  step="any"
                  className="m2-inp m2-num w-full"
                  aria-invalid={isInvalid}
                  aria-describedby={isInvalid ? 'arrival-loss-error' : ''}
                  placeholder={
                    recorded ? pct(recorded.inspected_loss_rate).replace('%', '') : '예: 6.5'
                  }
                  value={text}
                  onChange={event => setDraft({ lotId: lot.lot_id, text: event.target.value })}
                />
              </label>
              <button
                type="submit"
                className="m2-btn m2-btn-pri"
                disabled={value === null || inspection.isPending}
              >
                {inspection.isPending ? '반영 중' : '검수 반영'}
              </button>
            </div>
            {isInvalid ? (
              <p id="arrival-loss-error" className="text-[12px] text-m2-crit">
                0~100 사이 숫자를 넣으세요.
              </p>
            ) : null}
          </form>

          <LotFacts
            lot={lot}
            recorded={recorded}
            twinPredicted={twinLot?.predicted_loss_rate ?? null}
            twinPlanned={twinLot?.planned_loss_rate ?? null}
            inspected={result?.inspected_loss_rate ?? recorded?.inspected_loss_rate ?? null}
          />

          {result ? (
            <ArrivalResult result={result} shipper={getShipperName(scenario, result.shipper_id)} />
          ) : null}

          {inspections.length > 0 ? <InspectionList session={session} items={inspections} /> : null}
        </>
      )}
    </section>
  );
}

function LotFacts({
  lot,
  recorded,
  twinPredicted,
  twinPlanned,
  inspected,
}: {
  lot: AssignmentT;
  recorded: InspectionT | null;
  twinPredicted: number | null;
  twinPlanned: number | null;
  inspected: number | null;
}) {
  const planned = recorded?.planned_loss_rate ?? twinPlanned;

  return (
    <div className="m2-lines">
      <div>
        <span>운송</span>
        <b>
          {MODE_LABEL[lot.mode]}
          {lot.container_id ? ` · ${lot.container_id}` : ''} · {lot.pallets}파렛트
        </b>
      </div>
      <div>
        <span>계획 손실률 (정산 기준)</span>
        <b>{planned === null ? '검수하면 표시' : pct(planned, 2)}</b>
      </div>
      <div>
        <span>트윈 예상 (센서 반영)</span>
        <b>{twinPredicted === null ? '센서 기록 없음' : pct(twinPredicted, 2)}</b>
      </div>
      {twinPredicted !== null && inspected !== null ? (
        <div>
          <span>트윈 예상 → 검수 차이</span>
          <b className={cn(inspected > twinPredicted ? 'text-m2-warn-ink' : 'text-m2-ok-ink')}>
            {pointGap(twinPredicted, inspected)}
          </b>
        </div>
      ) : null}
    </div>
  );
}

function ArrivalResult({ result, shipper }: { result: ArrivalSettlementResultT; shipper: string }) {
  const isUnder = result.excess_loss_rate <= 0;

  return (
    <div className="m2-block mt-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="m2-h3 m2-num">
          예측 {pct(result.planned_loss_rate, 2)} → 실제 {pct(result.inspected_loss_rate, 2)}
        </span>
        <span className={cn('m2-chip', isUnder ? 'm2-chip-ok' : 'm2-chip-warn')}>
          {isUnder ? '예측 이하' : `초과 ${pct(result.excess_loss_rate, 2)}`}
        </span>
      </div>
      <div className="m2-lines">
        <div>
          <span>초과 손실액</span>
          <b>{won(result.excess_loss_value)}</b>
        </div>
        <div>
          <span>{shipper} 환급</span>
          <b className="text-m2-ok-ink">
            {won(result.refund_before)} → {won(result.refund_after)}
          </b>
        </div>
        <div>
          <span>환급 한도 (낸 성과보수)</span>
          <b>
            {won(result.refund_cap)}
            {result.capped ? ' · 한도 도달' : ''}
          </b>
        </div>
        {result.uncovered_loss > 0 ? (
          <div>
            <span>한도 밖 손실 (적하보험 영역)</span>
            <b>{won(result.uncovered_loss)}</b>
          </div>
        ) : null}
        <div>
          <span>{shipper} 성과보수</span>
          <b>
            {won(result.settlement_before.fee)} → {won(result.settlement_after.fee)}
          </b>
        </div>
        <div>
          <span>플랫폼 보수 합계</span>
          <b>
            {won(result.platform_fee_before)} → {won(result.platform_fee_after)}
          </b>
        </div>
      </div>
      <p className="m2-sub text-[12px]">
        {isUnder ? '실측이 예측 이하라 초과 손실을 0으로 보고 환급하지 않습니다. ' : ''}
        환급 뒤 성과보수는 0원 아래로 내려가지 않습니다(하한 0).
      </p>
      <p className="mt-2 text-[11.5px] leading-snug text-m2-muted">{result.rule}</p>
    </div>
  );
}

function InspectionList({ session, items }: { session: SaasPlanSessionT; items: InspectionT[] }) {
  const { scenario } = session;

  return (
    <div className="mt-4">
      <div className="m2-lbl mb-1.5">검수 기록</div>
      <div className="-mx-2.5 overflow-x-auto px-2.5">
        <table className="m2-table">
          <thead>
            <tr>
              <th>화주 · 로트</th>
              <th className="r">예측 → 실제</th>
              <th className="r">초과 손실액</th>
              <th className="r">검수 시각</th>
            </tr>
          </thead>
          <tbody>
            {items.map(item => (
              <tr key={item.lot_id}>
                <td className="whitespace-normal">
                  <div className="m2-who">
                    {getShipperName(scenario, item.shipper_id)}
                    <small className="m2-mono break-all whitespace-normal">{item.lot_id}</small>
                  </div>
                </td>
                <td className="r m2-num">
                  {pct(item.planned_loss_rate)} → {pct(item.inspected_loss_rate)}
                </td>
                <td className="r m2-num">{won(item.excess_loss_value)}</td>
                <td className="r m2-num">{formatKstMonthDayTime(item.inspected_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
