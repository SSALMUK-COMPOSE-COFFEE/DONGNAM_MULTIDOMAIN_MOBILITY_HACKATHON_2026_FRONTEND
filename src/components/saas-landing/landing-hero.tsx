'use client';

import { ArrowDown } from 'lucide-react';
import Link from 'next/link';
import type { MouseEvent } from 'react';

import { useShowcaseScene } from '@/app/(auth)/_components/use-showcase-scene';
import { MapHero, MapLegend, type MapLegendItemT } from '@/components/map-hero';
import { M2_COLORS, type MapSceneT } from '@/components/map-hero/scene';
import { LANDING_IDS } from '@/components/saas-landing/content';
import { Skeleton } from '@/components/ui/skeleton';
import { SAAS_PAGES } from '@/consts/route-saas';
import type { ShowcaseT } from '@/types/saas-public';

const MAP_HEIGHT = 400;

const BASIS_LABEL: Record<ShowcaseT['basis'], string> = {
  default_scenario: '기본 시나리오 기준',
};

const rateParts = (rate: number) => {
  const percent = Math.abs(rate * 100).toFixed(1);
  if (percent === '0.0') return { sign: '', percent, saving: false };

  return { sign: rate > 0 ? '−' : '+', percent, saving: rate > 0 };
};

const legendItems = (scene: MapSceneT): MapLegendItemT[] => {
  const tones = new Set(scene.runs.map(({ tone }) => tone));

  return [
    ...(tones.has('berry') ? [{ label: '딸기 집하', color: M2_COLORS.berry }] : []),
    ...(tones.has('grape') ? [{ label: 'SO₂ 포도 집하', color: M2_COLORS.grape }] : []),
    ...(scene.seaLane ? [{ label: '해상 항로', color: M2_COLORS.brand, dash: true }] : []),
    ...(scene.air.length > 0 ? [{ label: '항공 전환', color: M2_COLORS.warn, dash: true }] : []),
  ];
};

const mapDescription = (showcase: ShowcaseT) =>
  `공동적재 예시 지도. 선과장 ${showcase.packhouse_count}곳에서 ${showcase.total_pallets}파렛트를 모아 컨테이너 ${showcase.containers.length}개로 보내는 집하 경로와 항구를 표시합니다.`;

const scrollToRoles = (event: MouseEvent<HTMLAnchorElement>) => {
  const target = document.getElementById(LANDING_IDS.roles);
  if (!target) return;

  event.preventDefault();
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  target.scrollIntoView({ block: 'start', behavior: reduced ? 'auto' : 'smooth' });
  document.getElementById(LANDING_IDS.rolesTitle)?.focus({ preventScroll: true });
  window.history.replaceState(null, '', `#${LANDING_IDS.roles}`);
};

type StatT = { key: string; label: string; value: string; unit: string };

const statsOf = (showcase: ShowcaseT): StatT[] => {
  const airPallets = showcase.air.reduce((sum, { pallets }) => sum + pallets, 0);

  return [
    {
      key: 'packhouses',
      label: '선과장',
      value: showcase.packhouse_count.toLocaleString('ko-KR'),
      unit: '곳',
    },
    {
      key: 'pallets',
      label: '파렛트',
      value: showcase.total_pallets.toLocaleString('ko-KR'),
      unit: '개',
    },
    {
      key: 'containers',
      label: '공동적재 컨테이너',
      value: showcase.containers.length.toLocaleString('ko-KR'),
      unit: '개',
    },
    ...(airPallets > 0
      ? [
          {
            key: 'air',
            label: '항공 전환',
            value: airPallets.toLocaleString('ko-KR'),
            unit: '파렛트',
          },
        ]
      : []),
  ];
};

function ShowcaseFigure() {
  const { showcase, scene, isPending, isFetching, refetch } = useShowcaseScene();

  if (isPending) {
    return (
      <div aria-busy className="flex flex-col gap-3">
        <Skeleton className="w-full rounded-[18px]" style={{ height: MAP_HEIGHT }} />
        <Skeleton className="h-16 w-full rounded-[18px]" />
      </div>
    );
  }

  if (!showcase || !scene) {
    return (
      <div className="m2-card flex flex-col items-start gap-3">
        <p className="m2-sub mt-0">공동적재 예시 지도를 불러오지 못했습니다.</p>
        <button
          type="button"
          className="m2-btn m2-btn-sec m2-btn-sm"
          disabled={isFetching}
          onClick={() => refetch()}
        >
          {isFetching ? '다시 불러오는 중' : '다시 시도'}
        </button>
      </div>
    );
  }

  const { sign, percent, saving } = rateParts(showcase.saving_rate);
  const seaLaneLabel = scene.seaLane
    ? `${scene.seaLane.label} · ${scene.seaLane.transitDays}일`
    : null;

  return (
    <figure className="m-0 flex min-w-0 flex-col gap-3" aria-label={mapDescription(showcase)}>
      <MapHero
        scene={scene}
        height={MAP_HEIGHT}
        mapId="m2-landing-map"
        className="mb-0"
        seaLaneLabel={seaLaneLabel}
        interactive={false}
        fitInsetLeft={28}
        placeKeys={place => [place.key]}
        placeSublabel={place =>
          place.airPallets > 0 ? `항공 전환 ${place.airPallets} 파렛트` : ''
        }
      />
      <MapLegend
        items={legendItems(scene)}
        className="mt-0 self-start rounded-xl backdrop-blur-none"
      />
      <figcaption className="m2-card flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col">
          <span className="m2-lbl">단독 발송 대비 총비용</span>
          <span className={`m2-big m2-num ${saving ? 'text-m2-ok-ink' : 'text-m2-ink'}`}>
            {sign}
            {percent}
            <small>%</small>
          </span>
          <span className="m2-sub">{BASIS_LABEL[showcase.basis]} · 공동적재 계획 한 건</span>
        </div>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-4">
          {statsOf(showcase).map(({ key, label, value, unit }) => (
            <div key={key} className="flex flex-col">
              <dt className="m2-lbl">{label}</dt>
              <dd className="m2-num m-0 text-lg font-bold">
                {value}
                <span className="ml-0.5 text-xs font-semibold text-m2-muted">{unit}</span>
              </dd>
            </div>
          ))}
        </dl>
      </figcaption>
    </figure>
  );
}

export function LandingHero() {
  return (
    <section aria-labelledby={LANDING_IDS.title} className="m2-window m2-solo">
      <div className="m2-content grid items-center gap-8 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
        <div className="flex flex-col gap-5">
          <div>
            <p className="m2-eyebrow">부산·울산권 신선 농산물 수출 공동적재</p>
            <h1
              id={LANDING_IDS.title}
              className="m2-h1 text-[32px] font-black break-keep sm:text-[40px] xl:text-[46px]"
            >
              같이 타고,
              <br />
              <span className="text-m2-brand-ink">바뀌면 다시 짠다</span>
            </h1>
            <p className="m2-sub mt-4 max-w-[34rem] text-[15px] leading-relaxed break-keep">
              딸기·샤인머스캣 소량 화주의 화물을 한 컨테이너에 묶고, 취소나 운임 변동이 생기면
              배정과 집하 경로를 다시 짭니다. 화주가 아낀 만큼만 수수료를 받습니다.
            </p>
          </div>
          <div className="flex flex-wrap gap-2.5">
            <a
              href={`#${LANDING_IDS.roles}`}
              onClick={scrollToRoles}
              className="m2-btn m2-btn-pri m2-btn-lg"
            >
              데모로 둘러보기
              <ArrowDown aria-hidden className="size-4" strokeWidth={2} />
            </a>
            <Link href={SAAS_PAGES.LOGIN} className="m2-btn m2-btn-sec m2-btn-lg">
              로그인
            </Link>
          </div>
        </div>
        <ShowcaseFigure />
      </div>
    </section>
  );
}
