import type { ColdchainTwinT } from '@/apis/saas/coldchain';
import { won } from '@/app/(saas)/app/platform/_components/m2-format';
import type { SettlementPreviewT } from '@/types/saas-analysis';
import { formatPercent, formatSignedManwon } from '@/utils/format';

const SPARK_WIDTH = 220;
const SPARK_HEIGHT = 44;

type ColdchainLossBannerPropsT = {
  twin: ColdchainTwinT;
  preview: SettlementPreviewT | null;
};

export function ColdchainLossBanner({ twin, preview }: ColdchainLossBannerPropsT) {
  const { loss, outage, timeline } = twin;
  const planned = loss.planned_loss_rate ?? null;
  const predicted = loss.predicted_loss_rate ?? loss.sensor_loss_rate;
  const delta = loss.delta_krw ?? null;
  const rates = timeline.map(point => point.sensor_loss_rate);
  const firstRate = rates[0] ?? loss.no_outage_loss_rate;

  return (
    <section className="rounded-[18px] bg-m2-navy px-6 py-5 text-white" aria-label="손실 요약">
      <p className="m2-num text-[19px] leading-snug font-bold tracking-[-0.01em]">
        누적 단전 {Math.round(outage.cumulative_minutes).toLocaleString('ko-KR')}분
        <span className="mx-2.5 opacity-60">→</span>
        예상 손실률{' '}
        {planned === null ? null : (
          <>
            {formatPercent(planned)}
            <span className="mx-1.5 opacity-60">→</span>
          </>
        )}
        <span className="text-[#8fd3ff]">{formatPercent(predicted)}</span>
        {delta === null ? null : (
          <>
            <span className="mx-2.5 opacity-60">·</span>
            추가 손실 <span className="text-[#8fd3ff]">{formatSignedManwon(delta)}만 원</span>
          </>
        )}
      </p>
      <div className="mt-3 flex flex-wrap items-end gap-x-6 gap-y-3">
        <div className="flex flex-col gap-1">
          <span className="text-[12px] opacity-70">
            센서 손실률 단전 전 {formatPercent(loss.no_outage_loss_rate)} → 현재{' '}
            {formatPercent(loss.sensor_loss_rate)}
          </span>
          <LossSparkline rates={rates} />
          <span className="m2-num text-[11.5px] opacity-60">
            측정 구간 {formatPercent(firstRate)} → {formatPercent(rates.at(-1) ?? firstRate)} · 실증
            노선 단전 시 {formatPercent(loss.reference_outage_loss_rate)}
          </span>
        </div>
        {preview ? (
          <div className="ml-auto flex flex-col items-end gap-0.5 text-right">
            <span className="text-[12px] opacity-70">이대로 도착하면</span>
            <span className="m2-num text-[18px] font-bold">
              성과보수 차감 {won(preview.total_refund_change)}
            </span>
          </div>
        ) : null}
      </div>
    </section>
  );
}

function LossSparkline({ rates }: { rates: readonly number[] }) {
  if (rates.length < 2) return null;

  const min = Math.min(...rates);
  const max = Math.max(...rates);
  const span = max - min || 1;
  const points = rates
    .map((rate, index) => {
      const x = (index / (rates.length - 1)) * SPARK_WIDTH;
      const y = SPARK_HEIGHT - 2 - ((rate - min) / span) * (SPARK_HEIGHT - 4);

      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');

  return (
    <svg
      width={SPARK_WIDTH}
      height={SPARK_HEIGHT}
      viewBox={`0 0 ${SPARK_WIDTH} ${SPARK_HEIGHT}`}
      role="img"
      aria-label="센서 손실률 추이"
    >
      <polyline
        points={points}
        fill="none"
        stroke="#8fd3ff"
        strokeWidth={2}
        strokeLinejoin="round"
      />
    </svg>
  );
}
