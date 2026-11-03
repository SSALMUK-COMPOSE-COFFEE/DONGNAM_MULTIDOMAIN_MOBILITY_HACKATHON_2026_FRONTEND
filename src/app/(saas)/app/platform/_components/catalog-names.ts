import type { ScenarioT } from '@/types/api';

export const productNameOf = (catalog: ScenarioT | undefined, productId: string) =>
  catalog?.products.find(({ id }) => id === productId)?.name ?? productId;

export const portNameOf = (catalog: ScenarioT | undefined, portId: string) =>
  catalog?.ports.find(({ id }) => id === portId)?.name ?? portId;
