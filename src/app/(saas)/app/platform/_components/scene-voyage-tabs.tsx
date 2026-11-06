'use client';

import { cn } from 'cn';

import { kstDayTime } from '@/app/(saas)/app/platform/_components/m2-format';
import {
  type MapSceneT,
  type PlanSceneOptionsT,
  type PlanSceneSourceT,
  buildPlanScene,
} from '@/components/map-hero';

export const buildPickedScene = (
  source: PlanSceneSourceT,
  options: PlanSceneOptionsT,
  pickedVoyageId: string | null
): MapSceneT => {
  const base = buildPlanScene(source, options);
  const picked = base.voyages.some(({ key }) => key === pickedVoyageId) ? pickedVoyageId : null;

  return picked && picked !== base.voyageId
    ? buildPlanScene(source, { ...options, voyageId: picked })
    : base;
};

type SceneVoyageTabsPropsT = {
  scene: MapSceneT | null;
  onPick: (voyageId: string) => void;
  className?: string;
};

export function SceneVoyageTabs({ scene, onPick, className }: SceneVoyageTabsPropsT) {
  if (!scene || scene.voyages.length < 2) return null;

  return (
    <div role="group" aria-label="항차" className={cn('mb-3 flex flex-wrap gap-1.5', className)}>
      {scene.voyages.map(item => {
        const isActive = item.key === scene.voyageId;

        return (
          <button
            key={item.key}
            type="button"
            aria-pressed={isActive}
            onClick={() => onPick(item.key)}
            className={cn('m2-btn m2-btn-sm', isActive ? 'm2-btn-pri' : 'm2-btn-sec')}
          >
            <span className="m2-mono">{item.key}</span> {item.vesselName} · ETD{' '}
            {kstDayTime(item.etd)}
          </button>
        );
      })}
    </div>
  );
}
