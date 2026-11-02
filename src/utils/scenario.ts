import type { ScenarioT } from '@/types/api';

export const getShipperName = (scenario: ScenarioT, shipperId: string) =>
  scenario.shippers.find(({ id }) => id === shipperId)?.name ?? shipperId;

/** '진주 딸기 수출농가 A' → '진주' */
export const getShipperShortName = (scenario: ScenarioT, shipperId: string) =>
  getShipperName(scenario, shipperId).split(' ')[0];

export const getProductName = (scenario: ScenarioT, productId: string) =>
  scenario.products.find(({ id }) => id === productId)?.name ?? productId;

/** 'HKHKG' → '홍콩항' */
export const getPortName = (scenario: ScenarioT, portId: string) =>
  scenario.ports.find(({ id }) => id === portId)?.name ?? portId;
