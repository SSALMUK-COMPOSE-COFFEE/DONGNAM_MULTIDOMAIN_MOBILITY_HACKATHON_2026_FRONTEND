'use client';

import { cn } from 'cn';
import { ArrowLeftRightIcon } from 'lucide-react';

import { EmptyState } from '@/app/(saas)/app/platform/_components/empty-state';
import {
  type ContainerViewT,
  type PlanSourceT,
  containerViews,
} from '@/app/(saas)/app/platform/_components/plan-model';
import { SlotBar } from '@/components/map-hero';
import { useMapLinkTarget } from '@/components/map-link';
import { Skeleton } from '@/components/ui/skeleton';

type ContainerPlanCardPropsT = {
  source: PlanSourceT | null;
  isPending?: boolean;
  emptyText: string;
  isStale?: boolean;
};

export function ContainerPlanCard({
  source,
  isPending = false,
  emptyText,
  isStale = false,
}: ContainerPlanCardPropsT) {
  const containers = source ? containerViews(source) : [];
  const kinds = [
    ...new Set(
      containers.flatMap(({ kind, capacity }) => (kind ? [`${kind} · ${capacity}파렛트`] : []))
    ),
  ];

  return (
    <section className="m2-card" aria-busy={isPending || isStale}>
      <div className="m2-card-h">
        <h2 className="m2-h2">컨테이너 적재안</h2>
        <div className="flex flex-wrap justify-end gap-1.5">
          {kinds.map(kind => (
            <span key={kind} className="m2-chip">
              {kind}
            </span>
          ))}
        </div>
      </div>
      <ContainerPlanBody
        source={source}
        containers={containers}
        isPending={isPending}
        emptyText={emptyText}
        isStale={isStale}
      />
    </section>
  );
}

function ContainerPlanBody({
  source,
  containers,
  isPending,
  emptyText,
  isStale,
}: {
  source: PlanSourceT | null;
  containers: ContainerViewT[];
  isPending: boolean;
  emptyText: string;
  isStale: boolean;
}) {
  if (isPending) return <Skeleton className="h-40 rounded-[14px]" />;
  if (!source) return <EmptyState compact title="아직 적재안이 없습니다" description={emptyText} />;
  if (containers.length === 0) {
    return (
      <EmptyState
        compact
        title="해상으로 싣는 출하가 없습니다"
        description="모든 출하가 항공 전환이거나 제외됐습니다."
      />
    );
  }

  return (
    <div className={cn(isStale && 'opacity-60')}>
      {containers.map(container => (
        <ContainerBlock key={container.id} container={container} />
      ))}
      {containers.some(({ so2 }) => so2) ? (
        <div className="m2-note m2-note-grape">
          <ArrowLeftRightIcon size={16} strokeWidth={1.6} aria-hidden />
          <span>SO₂ 처리 품목은 다른 품목과 같은 컨테이너·같은 트럭에 싣지 않습니다.</span>
        </div>
      ) : null}
    </div>
  );
}

function ContainerBlock({ container }: { container: ContainerViewT }) {
  const { className: linkClassName, ...link } = useMapLinkTarget(container.keys);

  return (
    <div {...link} className={cn('m2-block', linkClassName)}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="m2-h3">{container.title}</h3>
          {container.conditions ? <div className="m2-kv mt-0.5">{container.conditions}</div> : null}
        </div>
        <div className="flex-none text-right">
          <div className="m2-num text-[20px] leading-tight font-bold">
            {Math.round(container.utilization * 100)}%
          </div>
          <div className="m2-kv m2-num justify-end">
            {container.pallets} / {container.capacity} 파렛트
          </div>
        </div>
      </div>
      <SlotBar
        capacity={container.capacity}
        segments={container.segments.map(segment => ({
          key: segment.key,
          pallets: segment.pallets,
          color: segment.color,
          label: segment.label,
        }))}
      />
    </div>
  );
}
