/**
 * NOTE: 백엔드와 확정 전 초안이다. 화면을 그리면서 필드를 정하고 확정되면 백엔드에 넘긴다.
 * - 필드 표기는 camelCase
 * - 금액은 원 단위 정수, 시각은 ISO 8601 문자열
 */

export type CargoItemT = 'strawberry' | 'grape';

export type AllocationT = {
  shipperId: string;
  shipperName: string;
  pallets: number;
};

export type ContainerT = {
  id: string;
  item: CargoItemT;
  destination: string;
  capacityPallets: number;
  allocations: AllocationT[];
};

export type PlanT = {
  id: string;
  port: string;
  departureAt: string;
  containers: ContainerT[];
};
