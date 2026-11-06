'use client';

import { useMemo } from 'react';

import { usedVoyages, voyageSlice } from '@/app/(saas)/app/forwarder/_components/voyage-model';
import { buildPlanScene, timelineFromScene } from '@/components/map-hero';
import type { ForwarderPlanSessionT } from '@/types/saas-forwarder';

export function useVoyageScene(session: ForwarderPlanSessionT, pickedVoyageId: string | null) {
  return useMemo(() => {
    const voyages = usedVoyages(session);
    const voyage = voyages.find(({ id }) => id === pickedVoyageId) ?? voyages[0] ?? null;
    const slice = voyageSlice(session, voyage?.id ?? null);
    const scene = buildPlanScene(slice, { voyageId: voyage?.id ?? null });

    return { voyages, voyage, slice, scene, timeline: timelineFromScene(slice, scene) };
  }, [session, pickedVoyageId]);
}
