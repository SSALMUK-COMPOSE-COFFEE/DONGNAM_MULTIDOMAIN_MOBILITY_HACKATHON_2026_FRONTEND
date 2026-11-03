'use client';

import { cn } from 'cn';
import { useState } from 'react';

import { usePlatformFuelShock } from '@/apis/saas/platform-analysis';
import { EmptyState } from '@/app/(saas)/app/platform/_components/empty-state';
import { won } from '@/app/(saas)/app/platform/_components/m2-format';
import { QueryError } from '@/app/(saas)/app/platform/_components/query-error';
import { SegTabs } from '@/app/(saas)/app/platform/_components/seg-tabs';
import { CompareBars } from '@/components/map-hero';
import { Skeleton } from '@/components/ui/skeleton';
import type { SaasPlanSessionT } from '@/types/api-saas';
import type { PlatformFuelShockRequestT, PlatformFuelShockResultT } from '@/types/saas-analysis';
import { getShipperName } from '@/utils/scenario';

type ShockCaseT = PlatformFuelShockResultT['cases'][number];
type ModeSwitchT = ShockCaseT['switches'][number];
type ThresholdT = PlatformFuelShockResultT['thresholds'][number];

const FUEL_SHOCK_REQUEST: PlatformFuelShockRequestT = { surcharges: [470, 2060] };

const LOCATION_LABEL: Record<string, string> = {
  AIR: '항공',
  UNASSIGNED: '미배정',
};

const DIRECTION_LABEL: Record<ModeSwitchT['direction'], string> = {
  air_to_sea: '항공 → 해상',
  sea_to_air: '해상 → 항공',
  sea_to_sea: '컨테이너 이동',
  to_unassigned: '배정 제외',
  from_unassigned: '새로 배정',
};

const locationLabel = (location: string) => LOCATION_LABEL[location] ?? location;

const perKg = (value: number) => `${Math.round(value).toLocaleString('ko-KR')}원/kg`;

const signedWon = (value: number) => (value > 0 ? `+${won(value)}` : won(value));

const caseKey = (shockCase: ShockCaseT) => String(shockCase.surcharge_per_kg);

const thresholdText = (threshold: ThresholdT) => {
  const range = `${perKg(Math.min(threshold.searched_from, threshold.searched_to))}~${perKg(
    Math.max(threshold.searched_from, threshold.searched_to)
  )}`;
  if (threshold.surcharge_per_kg === null) {
    return `${range} 사이에서는 배정이 바뀌지 않습니다.`;
  }
  const side = threshold.direction === 'up' ? '이상으로 오르면' : '이하로 내리면';

  return `${perKg(threshold.surcharge_per_kg)} ${side} 배정이 바뀝니다 (로트 ${threshold.switches.length}건).`;
};

export function FuelShockSection({ session }: { session: SaasPlanSessionT }) {
  const { data, isPending, isError, error, refetch, isFetching } = usePlatformFuelShock(
    session.plan_id,
    FUEL_SHOCK_REQUEST
  );

  return (
    <section className="m2-card" aria-busy={isPending}>
      <div className="m2-card-h">
        <div>
          <h2 className="m2-h2">운임 쇼크 · 항공 유류할증료</h2>
          <p className="m2-sub">
            할증료가 kg당 470원에서 2,060원으로 오르면 같은 출하의 배정과 절감이 어떻게 바뀌는지 두
            할증료로 각각 다시 풀어 비교합니다. 분석 결과이며 이 계획을 바꾸지 않습니다.
          </p>
        </div>
        <div className="flex flex-wrap justify-end gap-1.5">
          <span className="m2-chip">분석 전용</span>
          {data ? (
            <span className="m2-chip m2-num">
              {data.solve_count}회 계산 · {data.solve_ms.toLocaleString('ko-KR')}ms
            </span>
          ) : null}
        </div>
      </div>
      {isPending ? <Skeleton className="h-80 rounded-[14px]" /> : null}
      {isError ? (
        <QueryError
          error={error}
          subject="운임 쇼크 분석을"
          onRetry={() => refetch()}
          isRetrying={isFetching}
        />
      ) : null}
      {data && data.cases.length === 0 ? (
        <EmptyState compact title="비교할 할증료 경우가 없습니다" />
      ) : null}
      {data && data.cases.length > 0 ? <FuelShockBody session={session} result={data} /> : null}
    </section>
  );
}

function FuelShockBody({
  session,
  result,
}: {
  session: SaasPlanSessionT;
  result: PlatformFuelShockResultT;
}) {
  const baseline = result.cases.find(({ is_baseline }) => is_baseline) ?? result.cases[0];
  const others = result.cases.filter(shockCase => shockCase !== baseline);
  const [pickedKey, setPickedKey] = useState('');
  const selected =
    others.find(shockCase => caseKey(shockCase) === pickedKey) ?? others.at(-1) ?? baseline;
  const maxSavings = Math.max(...result.cases.map(({ total_savings }) => total_savings), 0);
  const thresholds = [...result.thresholds].sort((a, b) =>
    a.direction === b.direction
      ? 0
      : Number(a.direction === 'down') - Number(b.direction === 'down')
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-3 min-[900px]:grid-cols-2">
        {result.cases.map(shockCase => (
          <CaseBlock
            key={caseKey(shockCase)}
            shockCase={shockCase}
            isSelected={shockCase === selected}
          />
        ))}
      </div>

      <CompareBars
        className="m2-num [grid-template-columns:110px_minmax(0,1fr)_auto]"
        rows={result.cases.map(shockCase => ({
          label: `할증 ${perKg(shockCase.surcharge_per_kg)}`,
          value: won(shockCase.total_savings),
          ratio: maxSavings > 0 ? Math.max(shockCase.total_savings, 0) / maxSavings : 0,
          tone: shockCase.is_baseline ? 'base' : 'ok',
        }))}
      />

      {others.length > 1 ? (
        <SegTabs<string>
          label="비교할 할증료"
          value={caseKey(selected)}
          onChange={setPickedKey}
          options={others.map(shockCase => ({
            value: caseKey(shockCase),
            label: perKg(shockCase.surcharge_per_kg),
          }))}
          className="self-start"
        />
      ) : null}

      {selected !== baseline ? (
        <CaseDetail session={session} baseline={baseline} shockCase={selected} />
      ) : null}

      <div className="m2-lines mt-0">
        {thresholds.map(threshold => (
          <div key={threshold.direction}>
            <span>전환점 · {threshold.direction === 'up' ? '오를 때' : '내릴 때'}</span>
            <b className="whitespace-normal">{thresholdText(threshold)}</b>
          </div>
        ))}
        <div>
          <span>기준</span>
          <b className="whitespace-normal">
            현재 할증료 {perKg(result.baseline_surcharge_per_kg)}로 같은 출하를 다시 푼 결과와 비교
            · 기본 항공 운임 {perKg(result.base_freight_per_kg)} · 파렛트{' '}
            {result.pallet_kg.toLocaleString('ko-KR')}
            kg
          </b>
        </div>
      </div>
      <SourceNote sources={result.sources} />
    </div>
  );
}

function CaseBlock({ shockCase, isSelected }: { shockCase: ShockCaseT; isSelected: boolean }) {
  return (
    <div className={cn('m2-block', isSelected && 'shadow-[0_0_0_1.5px_var(--m2-brand)]')}>
      <div className="flex items-center justify-between gap-2">
        <span className="m2-h3 m2-num">유류할증 {perKg(shockCase.surcharge_per_kg)}</span>
        {shockCase.is_baseline ? <span className="m2-chip">현재 할증료 재계산</span> : null}
        {!shockCase.is_baseline && shockCase.plan_changed ? (
          <span className="m2-chip m2-chip-warn">배정 바뀜</span>
        ) : null}
        {!shockCase.is_baseline && !shockCase.plan_changed ? (
          <span className="m2-chip m2-chip-ok">배정 그대로</span>
        ) : null}
      </div>
      <div className="m2-lines">
        <div>
          <span>항공 운임 (파렛트당)</span>
          <b>{won(shockCase.air_freight_per_pallet)}</b>
        </div>
        <div>
          <span>해상 · 항공 · 미배정</span>
          <b>
            {shockCase.sea_pallets} · {shockCase.air_pallets} · {shockCase.unassigned_pallets}
            파렛트
          </b>
        </div>
        <div>
          <span>총 절감</span>
          <b className="text-m2-ok-ink">{won(shockCase.total_savings)}</b>
        </div>
        <div>
          <span>성과보수</span>
          <b>{won(shockCase.total_fee)}</b>
        </div>
      </div>
    </div>
  );
}

function CaseDetail({
  session,
  baseline,
  shockCase,
}: {
  session: SaasPlanSessionT;
  baseline: ShockCaseT;
  shockCase: ShockCaseT;
}) {
  const { scenario } = session;
  const baseShippers = new Map(baseline.shippers.map(row => [row.shipper_id, row]));

  return (
    <div className="flex flex-col gap-4">
      <div className="m2-note">
        <span>{shockCase.summary}</span>
      </div>
      <div className="m2-kv m2-num text-[12.5px]">
        <span>
          절감 변화 <b className="text-m2-ok-ink">{signedWon(shockCase.savings_delta)}</b>
        </span>
        <span>
          성과보수 변화 <b className="text-m2-ink">{signedWon(shockCase.fee_delta)}</b>
        </span>
        <span>
          공동적재 비용 변화 <b className="text-m2-ink">{signedWon(shockCase.shared_cost_delta)}</b>
        </span>
      </div>

      <SwitchList scenario={scenario} shockCase={shockCase} />

      <div className="-mx-2.5 overflow-x-auto px-2.5">
        <table className="m2-table">
          <thead>
            <tr>
              <th>화주</th>
              <th className="r">절감 (현재 할증료 → 할증 후)</th>
              <th className="r">절감 변화</th>
              <th className="r">성과보수 변화</th>
              <th className="r">화주 몫</th>
            </tr>
          </thead>
          <tbody>
            {shockCase.shippers.map(row => {
              const base = baseShippers.get(row.shipper_id);
              return (
                <tr key={row.shipper_id}>
                  <td>
                    <div className="m2-who">
                      {getShipperName(scenario, row.shipper_id)}
                      <small className="m2-num">
                        해상 {row.sea_pallets} · 항공 {row.air_pallets}파렛트
                      </small>
                    </div>
                  </td>
                  <td className="r m2-num">
                    <div className="text-[12px] text-m2-muted">{won(base?.savings ?? null)}</div>
                    <div>{won(row.savings)}</div>
                  </td>
                  <td className="r m2-num font-bold text-m2-ok-ink">
                    {signedWon(row.savings_delta)}
                  </td>
                  <td className="r m2-num">{signedWon(row.fee - (base?.fee ?? 0))}</td>
                  <td className="r m2-num">{won(row.shipper_gain)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SwitchList({
  scenario,
  shockCase,
}: {
  scenario: SaasPlanSessionT['scenario'];
  shockCase: ShockCaseT;
}) {
  if (shockCase.switches.length === 0) {
    return <p className="m2-sub mt-0">이 할증료에서는 바뀌는 로트가 없습니다.</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="m2-lbl">바뀌는 로트 {shockCase.switches.length}건</div>
      <div className="flex flex-col gap-2">
        {shockCase.switches.map(item => (
          <div key={item.lot_id} className="m2-block">
            <div className="m2-who">
              {getShipperName(scenario, item.shipper_id)} · {item.pallets}파렛트
              <small className="m2-mono break-all whitespace-normal">{item.lot_id}</small>
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[12.5px]">
              <span className="m2-chip m2-num">{locationLabel(item.base)}</span>
              <span className="text-m2-muted">→</span>
              <span className="m2-chip m2-chip-brand m2-num">{locationLabel(item.case)}</span>
              <span className="text-m2-muted">{DIRECTION_LABEL[item.direction]}</span>
            </div>
          </div>
        ))}
      </div>
      <p className="text-[12px] leading-snug text-m2-muted">
        할증료 변경은 아직 재최적화 이벤트로 넘길 수 없습니다. 할증료가 실제로 바뀌면 계획을 새로
        만드세요.
      </p>
    </div>
  );
}

function SourceNote({ sources }: { sources: PlatformFuelShockResultT['sources'] }) {
  const text = sources.surcharge_values ?? sources.air_fuel_surcharge_per_kg_krw ?? '';
  if (!text) return null;

  return <p className="text-[11.5px] leading-snug text-m2-muted">출처 · {text}</p>;
}
