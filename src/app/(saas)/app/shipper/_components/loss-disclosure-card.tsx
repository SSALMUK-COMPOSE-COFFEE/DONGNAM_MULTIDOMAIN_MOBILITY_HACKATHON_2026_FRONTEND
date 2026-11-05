'use client';

import { ArrowRightIcon } from 'lucide-react';
import Link from 'next/link';

import { so2Text } from '@/app/(saas)/app/shipper/_components/plain-words';
import { CardSkeleton } from '@/app/(saas)/app/shipper/_components/query-state';
import { fmtCount } from '@/app/(saas)/app/shipper/_components/shipper-format';
import { SHIPPER_PATHS } from '@/app/(saas)/app/shipper/_components/shipper-paths';
import type { ExpectedLossT, ShipperCatalogT, ShipperLotT } from '@/types/saas-shipper';
import { formatPercent } from '@/utils/format';
import { getPortName, getProductName } from '@/utils/scenario';

const LEARNED_BASIS = '도착 검수 학습';
const TITLE_ID = 'loss-disclosure-title';

export const isLearnedLoss = (loss: ExpectedLossT) =>
  loss.basis === LEARNED_BASIS && loss.n_observations > 0;

export const lossBasisText = (loss: ExpectedLossT) =>
  isLearnedLoss(loss) ? `${LEARNED_BASIS} ${fmtCount(loss.n_observations)}건` : '기본값(가정)';

export const lossRateText = (loss: ExpectedLossT) => formatPercent(loss.rate);

export function LossBasisChip({ loss }: { loss: ExpectedLossT }) {
  if (isLearnedLoss(loss)) {
    return (
      <span className="m2-chip m2-chip-ok">
        <span className="sr-only">근거: 도착 검수 </span>학습 {fmtCount(loss.n_observations)}건
      </span>
    );
  }

  return (
    <span className="m2-chip m2-chip-warn">
      <span className="sr-only">근거: 기본값 </span>가정
    </span>
  );
}

type LossGroupT = {
  key: string;
  productName: string;
  portName: string;
  pallets: number;
  loss: ExpectedLossT;
};

const groupsOf = (lots: ShipperLotT[], catalog: ShipperCatalogT | null): LossGroupT[] => {
  const groups = new Map<string, LossGroupT>();
  lots.forEach(lot => {
    const key = `${lot.product_id}|${lot.destination}`;
    const found = groups.get(key);
    if (found) {
      found.pallets += lot.pallets;

      return;
    }
    groups.set(key, {
      key,
      productName: so2Text(catalog ? getProductName(catalog, lot.product_id) : lot.product_id),
      portName: catalog ? getPortName(catalog, lot.destination) : lot.destination,
      pallets: lot.pallets,
      loss: lot.expected_loss,
    });
  });

  return [...groups.values()].sort((a, b) => b.pallets - a.pallets);
};

type LossDisclosureCardPropsT = {
  lots: ShipperLotT[] | undefined;
  isError: boolean;
  catalog: ShipperCatalogT | null;
};

export function LossDisclosureCard({ lots, isError, catalog }: LossDisclosureCardPropsT) {
  if (!lots && !isError) return <CardSkeleton height={180} />;

  const active = (lots ?? []).filter(
    ({ status, expected_loss }) => status !== 'cancelled' && expected_loss.mode === 'sea'
  );
  const groups = groupsOf(active, catalog);
  const totalPallets = groups.reduce((sum, { pallets }) => sum + pallets, 0);
  const overall =
    totalPallets > 0
      ? groups.reduce((sum, { pallets, loss }) => sum + loss.rate * pallets, 0) / totalPallets
      : null;
  const hasAssumed = groups.some(({ loss }) => !isLearnedLoss(loss));

  return (
    <section className="m2-card" aria-labelledby={TITLE_ID}>
      <div className="m2-card-h flex-wrap">
        <h2 id={TITLE_ID} className="m2-h2">
          내 출하 예상 손실률 (해상)
        </h2>
        <Link href={SHIPPER_PATHS.LOTS} className="m2-btn m2-btn-sec m2-btn-sm">
          출하별로 보기
          <ArrowRightIcon size={14} aria-hidden />
        </Link>
      </div>

      {isError && (
        <p className="m2-sub mt-0">
          출하를 불러오지 못해 예상 손실률을 보여드리지 못했습니다. 위 내 출하에서 다시 시도해
          주세요.
        </p>
      )}
      {!isError && overall === null && (
        <p className="m2-sub mt-0">
          출하 등록 후 품목·목적지별 예상 해상 운송 손실률을 확인할 수 있습니다.
        </p>
      )}
      {!isError && overall !== null && (
        <>
          <dl className="flex flex-wrap items-end gap-x-3 gap-y-1">
            <dt className="m2-lbl basis-full">
              {groups.length > 1 ? '내 출하 전체 (파렛트 가중 평균)' : groups[0]?.productName}
            </dt>
            <dd className="m2-num text-[24px] leading-tight font-bold tracking-[-0.02em] max-[767.98px]:text-[20px]">
              {formatPercent(overall)}
            </dd>
          </dl>
          <p className="m2-sub mt-2">
            해상으로 보내면 도착했을 때 내 물량의 약 {formatPercent(overall)}가 상품성을 잃을 수
            있다는 뜻이고, 운송계획은 이 손실 위험까지 비용에 넣어 배와 항공을 고릅니다.
          </p>
          <ul className="mt-3 border-t border-m2-line pt-2" aria-label="품목·목적지별 예상 손실률">
            {groups.map(({ key, productName, portName, pallets, loss }) => (
              <li
                key={key}
                className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 py-1 text-[12.5px]"
              >
                <span className="min-w-0 text-m2-ink-2">
                  {productName} → {portName} · <span className="m2-num">{fmtCount(pallets)}</span>
                  파렛트
                </span>
                <span className="flex items-center gap-2">
                  <b className="m2-num">{lossRateText(loss)}</b>
                  <LossBasisChip loss={loss} />
                </span>
              </li>
            ))}
          </ul>
          {hasAssumed && (
            <p className="m2-sub mt-2 text-[12px]">
              가정: 아직 도착 검수 기록이 없어 정한 기본값입니다. 검수 기록이 쌓이면 학습 값으로
              바뀝니다.
            </p>
          )}
        </>
      )}
    </section>
  );
}
