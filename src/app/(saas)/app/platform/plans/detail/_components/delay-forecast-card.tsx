'use client';

import { useState } from 'react';

import {
  TYPHOON_PRESET,
  forecastReplan,
  usePlatformDelayForecast,
} from '@/apis/saas/platform-analysis';
import {
  kstDayTime,
  monthDay,
  productOf,
  productShortName,
  won,
} from '@/app/(saas)/app/platform/_components/m2-format';
import { SegTabs } from '@/app/(saas)/app/platform/_components/seg-tabs';
import { hoursText } from '@/app/(saas)/app/platform/plans/detail/_components/replan-delay-tab';
import { lotNameMap, withLotNames } from '@/components/replan-alternatives/lot-words';
import { Skeleton } from '@/components/ui/skeleton';
import type { ReplanResponseT } from '@/types/api';
import type { SaasPlanSessionT } from '@/types/api-saas';
import type { DelayForecastRequestT, DelayForecastResponseT } from '@/types/saas-analysis';
import { getShipperShortName } from '@/utils/scenario';

type ModeT = 'auto' | 'typhoon';

const MODE_OPTIONS: { value: ModeT; label: string }[] = [
  { value: 'typhoon', label: '태풍 프리셋' },
  { value: 'auto', label: '기상·혼잡 자동' },
];

const REQUEST_OF: Record<ModeT, DelayForecastRequestT> = {
  typhoon: { preset: TYPHOON_PRESET },
  auto: { weather: 'auto', congestion: 'auto' },
};

const CONFIDENCE_LABEL: Record<string, string> = { high: '높음', medium: '보통', low: '낮음' };
const CONGESTION_LABEL: Record<string, string> = {
  normal: '평시',
  elevated: '혼잡',
  high: '심한 혼잡',
};
const WEATHER_LABEL: Record<string, string> = {
  normal: '평온',
  strong_wind: '강풍',
  typhoon: '태풍',
};
const MODE_LABEL: Record<string, string> = { auto: '자동', manual: '수동', preset: '프리셋' };
const FEED_LABEL: Record<string, string> = {
  live: '실시간',
  snapshot: '스냅샷',
  unavailable: '조회 실패',
};
const PROXY_LABEL = '울산항 혼잡을 부산 항차의 대리 지표로 씀(가정)';
const PROXY_SHORT_LABEL = '울산항 대리 지표(가정)';
const WEATHER_UNAVAILABLE_LABEL = '확인 못 함';

const weatherText = (weather: DelayForecastResponseT['weather']) => {
  if (weather.source !== 'unavailable') {
    const source = weather.source ? FEED_LABEL[weather.source] : MODE_LABEL[weather.mode];

    return `${WEATHER_LABEL[weather.level]} · ${source}`;
  }
  if (weather.level === 'normal') return `${WEATHER_UNAVAILABLE_LABEL}(평시로 계산)`;

  return `${WEATHER_UNAVAILABLE_LABEL}(${WEATHER_LABEL[weather.level]} 가정으로 계산)`;
};

type DelayForecastCardPropsT = {
  session: SaasPlanSessionT;
  isReplanning: boolean;
  onLoad: (replan: ReplanResponseT, label: string, focusContainerId: string | null) => void;
};

export function DelayForecastCard({ session, isReplanning, onLoad }: DelayForecastCardPropsT) {
  const [mode, setMode] = useState<ModeT>('typhoon');
  const forecast = usePlatformDelayForecast(session.plan_id);
  const data = forecast.data ?? null;

  return (
    <section className="m2-card flex min-w-0 flex-col gap-3">
      <div>
        <h2 className="m2-h3">지연 예측</h2>
        <p className="m2-sub">
          해수부 출항 실적으로 접안·출항 지연(p50·p90)을 예측하고, 판매기한이 위험한 로트와 공항별
          항공 전환안을 계산합니다.
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <SegTabs<ModeT> label="예측 조건" value={mode} onChange={setMode} options={MODE_OPTIONS} />
        <button
          type="button"
          className="m2-btn m2-btn-sec"
          disabled={forecast.isPending}
          onClick={() => forecast.mutate(REQUEST_OF[mode])}
        >
          {forecast.isPending ? '예측 중' : '지연 예측'}
        </button>
      </div>

      {forecast.isPending && <Skeleton className="h-40 w-full rounded-[14px]" />}
      {forecast.isError && (
        <p className="m2-note m2-note-warn mt-0">
          지연 예측을 계산하지 못했습니다. 잠시 뒤 다시 눌러 주세요.
        </p>
      )}
      {data && !forecast.isPending && (
        <ForecastResult
          data={data}
          session={session}
          isTyphoon={forecast.variables?.preset === TYPHOON_PRESET}
          isReplanning={isReplanning}
          onLoad={onLoad}
        />
      )}
    </section>
  );
}

type ForecastResultPropsT = {
  data: DelayForecastResponseT;
  session: SaasPlanSessionT;
  isTyphoon: boolean;
  isReplanning: boolean;
  onLoad: DelayForecastCardPropsT['onLoad'];
};

function ForecastResult({ data, session, isTyphoon, isReplanning, onLoad }: ForecastResultPropsT) {
  const { scenario } = session;
  const replan = forecastReplan(data);
  const recommended = replan?.alternatives.find(({ id }) => id === replan.recommended_id) ?? null;
  const riskLots = data.voyages.flatMap(({ lots }) => lots).filter(({ at_risk }) => at_risk);
  const congestion = data.port_congestion;
  const isProxy =
    congestion.proxy_indicator ||
    !!congestion.indicator ||
    data.voyages.some(({ congestion_scope }) => congestion_scope === 'ulsan_proxy');
  const congestionSource = congestion.indicator
    ? `${congestion.indicator.port} ${FEED_LABEL[congestion.indicator.source]}`
    : MODE_LABEL[congestion.mode];
  const weather = data.weather;
  const weatherReason = weather.fallback_reason ?? weather.note;
  const proxyTitle = congestion.proxy_label ?? PROXY_LABEL;
  const lotLabel = (shipperId: string, productId: string, pallets: number) =>
    `${getShipperShortName(scenario, shipperId)} ${productShortName(productOf(scenario, productId), productId)} ${pallets}파렛트`;
  const headVoyage = data.voyages[0] ?? null;
  const loadLabel = `지연 예측 · ${isTyphoon ? '태풍 프리셋' : '자동'}${
    headVoyage
      ? ` · ${headVoyage.vessel_name} p90 ${hoursText(headVoyage.forecast.p90_hours)}시간`
      : ''
  }`;
  const focusContainerId = riskLots[0]?.container_id ?? null;

  return (
    <div className="flex min-w-0 flex-col gap-3">
      <p className="m2-sub mt-0">{withLotNames(data.summary, lotNameMap(scenario))}</p>

      {data.voyages.map(voyage => (
        <div key={voyage.voyage_id} className="m2-block mt-0 flex flex-col gap-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <b>
              {voyage.vessel_name} · {voyage.voyage_id}
            </b>
            <span className="m2-chip">
              신뢰도 {CONFIDENCE_LABEL[voyage.forecast.confidence]} · 표본{' '}
              {voyage.forecast.sample_size}건
            </span>
          </div>
          <div className="m2-lines mt-0 border-t-0 pt-0">
            <div>
              <span>p50 / p90 지연</span>
              <b>
                {hoursText(voyage.forecast.p50_hours)}시간 / {hoursText(voyage.forecast.p90_hours)}
                시간
              </b>
            </div>
            <div>
              <span>예정 ETD</span>
              <b>{kstDayTime(voyage.planned_etd)}</b>
            </div>
            <div>
              <span>예측 ETD ({voyage.quantile})</span>
              <b>{kstDayTime(voyage.predicted_etd)}</b>
            </div>
          </div>
        </div>
      ))}

      <div className="m2-lines mt-0">
        <div>
          <span className="shrink-0">항만 혼잡</span>
          <b className="min-w-0">
            {CONGESTION_LABEL[congestion.level]} · {congestionSource}
          </b>
        </div>
        {isProxy && (
          <div>
            <em
              className="m2-chip m2-chip-warn max-w-full whitespace-normal not-italic"
              title={proxyTitle}
            >
              {PROXY_SHORT_LABEL}
              <span className="sr-only"> · {proxyTitle}</span>
            </em>
          </div>
        )}
        <div>
          <span className="shrink-0">기상</span>
          <b className="min-w-0" title={weatherReason}>
            {weatherText(weather)}
            {weatherReason ? <span className="sr-only"> · {weatherReason}</span> : null}
          </b>
        </div>
        <div>
          <span>표본</span>
          <b>
            해수부 출항 신고 {data.history.record_count.toLocaleString('ko-KR')}건
            {data.history.start && data.history.end
              ? ` (${monthDay(data.history.start)}~${monthDay(data.history.end)})`
              : ''}
          </b>
        </div>
      </div>
      {congestion.note && <p className="m2-sub mt-0">{congestion.note}</p>}

      <div className="m2-lbl">위험 로트 {riskLots.length}건</div>
      {riskLots.length === 0 ? (
        <p className="m2-sub mt-0">예측대로 늦어져도 판매기한 안에 도착합니다.</p>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {riskLots.map(lot => (
            <li key={lot.lot_id} className="flex flex-wrap justify-between gap-2 text-[12.5px]">
              <span>
                {lotLabel(lot.shipper_id, lot.product_id, lot.pallets)} · {lot.container_id}
              </span>
              <span className="text-m2-muted">
                판매 여유 {lot.sell_days_left_planned}일 → {lot.sell_days_left_predicted}일
                {lot.reason ? ` · ${lot.reason}` : ''}
              </span>
            </li>
          ))}
        </ul>
      )}

      {data.air_switch.length > 0 && (
        <>
          <div className="m2-lbl">공항별 항공 전환안</div>
          {data.air_switch.map(proposal => (
            <div key={proposal.lot_id} className="m2-block mt-0 flex flex-col gap-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <b>
                  {lotLabel(
                    proposal.shipper_id,
                    productIdOf(session, proposal.lot_id),
                    proposal.pallets
                  )}
                </b>
                <span className="text-[12px] text-m2-muted">
                  해상 위험 금액 {won(proposal.sea_value_at_risk)}
                </span>
              </div>
              {proposal.options.map(option => (
                <div
                  key={option.airport}
                  className="flex flex-wrap items-center justify-between gap-2 text-[12.5px]"
                >
                  <span className="flex items-center gap-1.5">
                    {option.name}
                    {proposal.recommended_airport === option.airport && (
                      <span className="m2-chip m2-chip-ok">추천</span>
                    )}
                    {!option.feasible && <span className="m2-chip">불가</span>}
                  </span>
                  <span className="text-m2-muted">
                    {option.feasible
                      ? `${monthDay(option.arrival_date)} 도착 · 판매 여유 ${option.sell_days_left}일 · ${won(option.total)}`
                      : (option.reason ?? '조건이 맞지 않습니다')}
                  </span>
                </div>
              ))}
            </div>
          ))}
        </>
      )}

      {data.remaining_risk_voyages.length > 0 && (
        <p className="m2-note m2-note-warn mt-0">
          재계획 뒤에도 위험이 남는 항차:{' '}
          {data.remaining_risk_voyages
            .map(
              ({ vessel_name: vesselName, delay_hours: delayHours, at_risk_pallets: pallets }) =>
                `${vesselName} ${hoursText(delayHours)}시간 지연 · ${pallets}파렛트`
            )
            .join(', ')}
        </p>
      )}

      {replan ? (
        <div className="m2-cfoot">
          <span className="text-[12.5px]">
            추천 대안 <b>{recommended?.label ?? '없음'}</b>
          </span>
          <button
            type="button"
            className="m2-btn m2-btn-pri"
            disabled={isReplanning}
            onClick={() => onLoad(replan, loadLabel, focusContainerId)}
          >
            이 예측으로 3안 보기
          </button>
        </div>
      ) : (
        <p className="m2-sub mt-0">
          {data.triggered
            ? '지연은 예상되지만 다시 짤 대안이 나오지 않았습니다.'
            : '재계획이 필요한 지연 위험이 없습니다.'}
        </p>
      )}
    </div>
  );
}

const productIdOf = (session: SaasPlanSessionT, lotId: string) =>
  session.scenario.lots.find(({ id }) => id === lotId)?.product_id ?? '';
