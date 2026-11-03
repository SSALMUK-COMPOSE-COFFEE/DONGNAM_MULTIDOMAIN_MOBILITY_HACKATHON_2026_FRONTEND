'use client';

import { useMemo } from 'react';

import { useShowcase } from '@/apis/saas/public';
import { type MapSceneT, type PlanSceneSourceT, buildPlanScene } from '@/components/map-hero/scene';
import { LINK_ALL } from '@/components/map-link';
import { demoShipperPackhouseId } from '@/consts/sandbox-saas';
import type { SchemaT } from '@/types/api';
import type { OrgType } from '@/types/saas';
import type { ShowcaseRouteT, ShowcaseT } from '@/types/saas-public';

const AIR_LOT_PREFIX = 'showcase-air:';

type ShowcaseVoyageT = ShowcaseT['voyages'][number];

const toVoyage = (voyage: ShowcaseVoyageT) => ({ ...voyage, etd: '', cy_cutoff: '' });

const toStop = (packhouseId: string, index: number) => ({
  stop_id: `${packhouseId}:${index}`,
  packhouse_id: packhouseId,
  lot_ids: [],
  sequence: index + 1,
  pallets: 0,
  load_after: 0,
  km_from_prev: 0,
  ready_at: '',
  eta: '',
  latest_arrival: '',
});

const toTruck = (route: ShowcaseRouteT) => ({
  truck_id: route.truck_id,
  trip: route.trip,
  cargo_group: route.cargo_group,
  capacity_pallets: route.load_pallets,
  load_pallets: route.load_pallets,
  stops: route.stops.map(toStop),
  km: 0,
  cost: 0,
  earliest_departure: '',
  latest_departure: '',
  port_eta: '',
  slack_minutes: 0,
  gate_status: 'off_peak' as const,
  gate_delay_minutes: 0,
});

const toVoyagePickups = (showcase: ShowcaseT): SchemaT<'VoyagePickup'>[] => {
  const voyageIds = [...new Set(showcase.routes.map(({ voyage_id }) => voyage_id))];

  return voyageIds.map(voyageId => {
    const routes = showcase.routes.filter(({ voyage_id }) => voyage_id === voyageId);

    return {
      voyage_id: voyageId,
      lot_ids: [],
      pickup: {
        status: 'OPTIMAL',
        deadline: '',
        routes: routes.map(toTruck),
        total_km: 0,
        total_cost: 0,
        dropped_stop_ids: [],
        gate_mode: 'none' as const,
        solve_ms: 0,
        assumptions: [],
      },
    };
  });
};

export const showcaseSceneSource = (showcase: ShowcaseT): PlanSceneSourceT => {
  const airIds = showcase.air.map(({ packhouse_id }) => `${AIR_LOT_PREFIX}${packhouse_id}`);
  const nameOf = new Map(showcase.packhouses.map(({ id, name }) => [id, name]));

  return {
    scenario: {
      packhouses: showcase.packhouses,
      ports: showcase.ports,
      products: showcase.products,
      voyages: showcase.voyages.map(toVoyage),
      shippers: showcase.air.map(({ packhouse_id }, index) => ({
        id: airIds[index],
        name: nameOf.get(packhouse_id) ?? packhouse_id,
        packhouse_id,
      })),
      lots: showcase.air.map(({ pallets }, index) => ({
        id: airIds[index],
        shipper_id: airIds[index],
        product_id: '',
        pallets,
      })),
    },
    plan: {
      assignments: showcase.air.map(({ pallets }, index) => ({
        lot_id: airIds[index],
        mode: 'air' as const,
        pallets,
        container_id: null,
        voyage_id: null,
      })),
      containers: showcase.containers.map(container => ({ ...container, used: true })),
    },
    routes: toVoyagePickups(showcase),
  };
};

export const roleLinkKeys = (
  scene: MapSceneT | null,
  orgType: OrgType,
  shipperOrgId: string
): string[] => {
  if (!scene) return [];
  if (orgType === 'platform') return [LINK_ALL];
  if (orgType === 'shipper')
    return [demoShipperPackhouseId(shipperOrgId), ...(scene.seaLane ? [scene.seaLane.key] : [])];

  return [...scene.runs.map(({ key }) => key), ...(scene.port ? [scene.port.key] : [])];
};

export const useShowcaseScene = () => {
  const { data, isPending, isFetching, refetch } = useShowcase();
  const showcase = data ?? null;
  const scene = useMemo(
    () => (showcase ? buildPlanScene(showcaseSceneSource(showcase)) : null),
    [showcase]
  );

  return { showcase, scene, isPending, isFetching, refetch };
};
