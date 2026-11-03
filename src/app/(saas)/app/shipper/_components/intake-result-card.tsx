import { cn } from 'cn';
import { CheckIcon, PlaneIcon, TriangleAlertIcon, XIcon } from 'lucide-react';

import { previewExpectedLossOf } from '@/apis/saas/shipper';
import {
  lossBasisText,
  lossRateText,
} from '@/app/(saas)/app/shipper/_components/loss-disclosure-card';
import { lotLabelFrom } from '@/app/(saas)/app/shipper/_components/lot-label';
import { plainWords, so2Text } from '@/app/(saas)/app/shipper/_components/plain-words';
import { fmtDay, fmtMonthDay } from '@/app/(saas)/app/shipper/_components/shipper-format';
import type { ShipperLotPreviewT } from '@/types/saas-shipper';

export function IntakeResultCard({ preview }: { preview: ShipperLotPreviewT | null }) {
  if (!preview) {
    return (
      <section className="m2-card" aria-label="등록 결과">
        <h2 className="m2-h2">등록 결과</h2>
        <div className="m2-sub">
          출하를 등록하면 자동으로 채운 판매기한과 실을 수 있는 배, 항공 가능 여부가 여기에
          나옵니다.
        </div>
      </section>
    );
  }

  const { lot, resolved, defaults_applied, hints } = preview;
  const earliestId = hints.earliest_feasible?.container_id ?? null;
  const expectedLoss = previewExpectedLossOf(preview);

  return (
    <section className="m2-card" aria-label="등록 결과">
      <div className="m2-card-h">
        <h2 className="m2-h2">{resolved.shipper_name}</h2>
        <span className="m2-chip m2-chip-ok">등록됨</span>
      </div>
      <div className="m2-sub mt-0">
        {so2Text(resolved.product_name)} <span className="m2-num">{lot.pallets}</span>파렛트 ·{' '}
        {resolved.packhouse_name} → {resolved.destination_name} · 출하{' '}
        <span className="m2-num">{fmtDay(lot.ready_date)}</span>
      </div>

      <div className="m2-lines">
        <div>
          <span>판매기한 (자동)</span>
          <b>{fmtMonthDay(lot.sell_by_date)}</b>
        </div>
        <div>
          <span>출하 이름</span>
          <b title={lot.id}>{lotLabelFrom(resolved.product_name, lot.ready_date, lot.pallets)}</b>
        </div>
        {expectedLoss && (
          <div>
            <span>예상 손실률 ({expectedLoss.mode === 'air' ? '항공' : '해상'})</span>
            <b>
              {lossRateText(expectedLoss)} · {lossBasisText(expectedLoss)}
            </b>
          </div>
        )}
      </div>

      <h3 className="m2-h3 mt-4 mb-2">해상</h3>
      {hints.sea_options.length === 0 && <div className="m2-sub">실을 수 있는 배가 없습니다.</div>}
      {hints.sea_options.map(option => (
        <div
          key={option.container_id}
          className="m2-block flex items-center gap-3 max-[767.98px]:flex-wrap"
          style={
            option.container_id === earliestId ? { boxShadow: '0 0 0 1.5px var(--m2-brand)' } : {}
          }
        >
          {option.feasible ? (
            <CheckIcon size={16} className="flex-none text-m2-ok" />
          ) : (
            <XIcon size={16} className="flex-none text-m2-crit" />
          )}
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <b className="text-[13.5px]">{option.container_id}</b>
              <span className="m2-sub mt-0">{option.vessel_name}</span>
              {option.container_id === earliestId && (
                <span className="m2-chip m2-chip-brand">가장 빠른 배</span>
              )}
            </div>
            {!option.feasible && option.reasons.length > 0 && (
              <div className="m2-sub mt-0.5 text-[12px]">
                {plainWords(option.reasons.join(' · '))}
              </div>
            )}
          </div>
          <span className="m2-num flex-none text-right text-[12.5px] text-m2-ink-2 max-[767.98px]:basis-full max-[767.98px]:pl-7 max-[767.98px]:text-left">
            출항 {fmtDay(option.etd)} · 도착 {fmtDay(option.arrival_date)}
            {option.pull_forward_days > 0 ? ` · ${option.pull_forward_days}일 당김` : ''}
          </span>
        </div>
      ))}

      <div className={cn('m2-note', !hints.air.feasible && 'm2-note-warn')}>
        <PlaneIcon size={14} />
        <div>
          항공{' '}
          {hints.air.feasible
            ? `가능 · ${fmtDay(hints.air.arrival_date)} 도착`
            : `불가${hints.air.reason ? ` · ${plainWords(hints.air.reason)}` : ''}`}
        </div>
      </div>
      {hints.warnings.length > 0 && (
        <div className="m2-note m2-note-warn">
          <TriangleAlertIcon size={14} />
          <div>{plainWords(hints.warnings.join(' · '))}</div>
        </div>
      )}
      {defaults_applied.length > 0 && (
        <ul className="m2-sub mt-3 list-disc pl-4 text-[12px]">
          {defaults_applied.map(item => (
            <li key={item}>{plainWords(item)}</li>
          ))}
        </ul>
      )}
    </section>
  );
}
