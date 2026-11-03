'use client';

import { useShowcaseScene } from '@/app/(auth)/_components/use-showcase-scene';
import { HeroPanel, MapHero, MapLegend, type MapLegendItemT } from '@/components/map-hero';
import { M2_COLORS, type MapSceneT, shortPlaceName } from '@/components/map-hero/scene';
import { Skeleton } from '@/components/ui/skeleton';
import type { ShowcaseT } from '@/types/saas-public';

const HERO_HEIGHT = 400;

const BASIS_LABEL: Record<ShowcaseT['basis'], string> = {
  default_scenario: '기본 시나리오 기준',
};

const rateParts = (rate: number) => {
  const percent = Math.abs(rate * 100).toFixed(1);
  if (percent === '0.0') return { sign: '', percent };

  return { sign: rate > 0 ? '−' : '+', percent };
};

const legendItems = (scene: MapSceneT): MapLegendItemT[] => {
  const tones = new Set(scene.runs.map(({ tone }) => tone));

  return [
    ...(tones.has('berry') ? [{ label: '딸기', color: M2_COLORS.berry }] : []),
    ...(tones.has('grape') ? [{ label: 'SO₂ 포도', color: M2_COLORS.grape }] : []),
    ...(scene.seaLane ? [{ label: '해상 항로', color: M2_COLORS.brand, dash: true }] : []),
    ...(scene.air.length > 0 ? [{ label: '항공 전환', color: M2_COLORS.warn, dash: true }] : []),
  ];
};

const nameOf = (showcase: ShowcaseT, packhouseId: string) =>
  showcase.packhouses.find(({ id }) => id === packhouseId)?.name ?? packhouseId;

const panelRows = (showcase: ShowcaseT) => [
  {
    k: '선과장',
    v: `${showcase.packhouse_count.toLocaleString('ko-KR')}곳 · ${showcase.total_pallets.toLocaleString('ko-KR')}팔레트`,
  },
  ...(showcase.containers.length > 0
    ? [
        {
          k: '공동적재',
          v: showcase.containers
            .map(({ container_id, pallets }) => `${container_id} ${pallets}`)
            .join(' · '),
        },
      ]
    : []),
  ...(showcase.air.length > 0
    ? [
        {
          k: '항공 전환',
          v: showcase.air
            .map(
              ({ packhouse_id, pallets }) =>
                `${shortPlaceName(nameOf(showcase, packhouse_id))} ${pallets}팔레트`
            )
            .join(' · '),
        },
      ]
    : []),
];

export function LoginShowcase() {
  const { showcase, scene, isPending, isFetching, refetch } = useShowcaseScene();

  if (isPending) {
    return (
      <section className="m2-card m2-hero" aria-busy>
        <Skeleton className="w-full rounded-none" style={{ height: HERO_HEIGHT }} />
      </section>
    );
  }

  if (!showcase || !scene) {
    return (
      <section className="m2-card mb-4 flex items-center justify-between gap-3 px-5 py-4">
        <p className="m2-sub mt-0">
          공동적재 예시 지도를 불러오지 못했습니다. 로그인은 그대로 할 수 있습니다.
        </p>
        <button
          type="button"
          className="m2-btn m2-btn-sec m2-btn-sm"
          disabled={isFetching}
          onClick={() => refetch()}
        >
          다시 시도
        </button>
      </section>
    );
  }

  const { sign, percent } = rateParts(showcase.saving_rate);
  const seaLaneLabel = scene.seaLane
    ? `${scene.seaLane.label} · ${scene.seaLane.transitDays}일`
    : null;

  return (
    <MapHero
      scene={scene}
      height={HERO_HEIGHT}
      mapId="m2-login-map"
      seaLaneLabel={seaLaneLabel}
      interactive={false}
      placeKeys={place => [place.key]}
      placeSublabel={place => (place.airPallets > 0 ? `항공 전환 ${place.airPallets} 팔레트` : '')}
      panel={
        <HeroPanel
          label={
            scene.seaLane && showcase.voyages.length === 1
              ? `${scene.seaLane.vesselName} 항차 · 단독 발송 대비 총비용`
              : '단독 발송 대비 총비용'
          }
          value={
            <span className="m2-num">
              {sign}
              {percent}
              <small>%</small>
            </span>
          }
          sub="공동적재 계획 한 건을 화주별 단독 발송과 비교한 값"
          rows={panelRows(showcase)}
        />
      }
      legend={<MapLegend items={legendItems(scene)} note={BASIS_LABEL[showcase.basis]} />}
      hint="역할을 가리키면 그 역할이 보는 범위가 지도에 표시됩니다"
    />
  );
}
