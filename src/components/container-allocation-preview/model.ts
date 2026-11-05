import type { PlanT, ScenarioT } from '@/types/api';

export type AllocationGroupT = {
  key: string;
  shipper: string;
  product: string;
  pallets: number;
  color: string;
  private: boolean;
};

export type AllocationContainerT = {
  id: string;
  capacity: number;
  assigned: number;
  reported: number;
  occupied: number;
  empty: number;
  overflow: number;
  groups: AllocationGroupT[];
  issues: string[];
};

export type AllocationPlanT = Pick<PlanT, 'containers' | 'assignments'>;
export type AllocationScenarioT = Pick<ScenarioT, 'shippers' | 'products'>;

const PALETTE = [
  '#205ca1',
  '#16796c',
  '#80509b',
  '#ad5d25',
  '#ad4561',
  '#586d2b',
  '#477b94',
  '#6557ad',
];
const whole = (value: number) => Number.isSafeInteger(value) && value >= 0;

export const buildAllocationPreview = (
  plan: AllocationPlanT,
  scenario: AllocationScenarioT,
  viewerShipperId?: string
): AllocationContainerT[] => {
  const shippers = [
    ...new Set(plan.assignments.filter(item => item.mode === 'sea').map(item => item.shipper_id)),
  ].sort();
  const colorOf = (id: string) => PALETTE[Math.max(shippers.indexOf(id), 0) % PALETTE.length];

  return plan.containers
    .filter(
      container =>
        container.used ||
        container.pallets > 0 ||
        plan.assignments.some(
          item =>
            item.mode === 'sea' && item.container_id === container.container_id && item.pallets > 0
        )
    )
    .map(container => {
      const issues: string[] = [];
      const capacity = whole(container.capacity_pallets) ? container.capacity_pallets : 0;
      const reported = whole(container.pallets) ? container.pallets : 0;
      if (!whole(container.capacity_pallets))
        issues.push('컨테이너 정원 정보가 올바르지 않습니다.');
      if (!whole(container.pallets)) issues.push('컨테이너 집계 수량이 올바르지 않습니다.');
      const grouped = new Map<string, AllocationGroupT>();
      plan.assignments
        .filter(item => item.mode === 'sea' && item.container_id === container.container_id)
        .forEach(item => {
          if (!whole(item.pallets)) {
            issues.push('정수가 아닌 배정 수량은 칸으로 표시할 수 없습니다.');
            return;
          }
          if (item.pallets === 0) return;
          const privateGroup =
            typeof viewerShipperId === 'string' && item.shipper_id !== viewerShipperId;
          const key = privateGroup ? 'other' : JSON.stringify([item.shipper_id, item.product_id]);
          const existing = grouped.get(key);
          if (existing) {
            existing.pallets += item.pallets;
            return;
          }
          grouped.set(key, {
            key: `group-${grouped.size}`,
            shipper: privateGroup
              ? '다른 화주'
              : (scenario.shippers.find(shipper => shipper.id === item.shipper_id)?.name ??
                '화주 정보 없음'),
            product: privateGroup
              ? '상세 비공개'
              : (scenario.products.find(product => product.id === item.product_id)?.name ??
                '품목 정보 없음'),
            pallets: item.pallets,
            color: privateGroup ? '#586b83' : colorOf(item.shipper_id),
            private: privateGroup,
          });
        });
      const groups = [...grouped.values()];
      const assigned = groups.reduce((sum, group) => sum + group.pallets, 0);
      if (reported !== assigned)
        issues.push(`컨테이너 집계 ${reported}파렛트와 세부 배정 ${assigned}파렛트가 다릅니다.`);
      if (reported > assigned)
        groups.push({
          key: 'unavailable',
          shipper: '세부 정보 없음',
          product: '미제공 배정',
          pallets: reported - assigned,
          color: '#586b83',
          private: true,
        });
      const occupied = Math.max(assigned, reported);
      return {
        id: container.container_id,
        capacity,
        assigned,
        reported,
        occupied,
        empty: Math.max(capacity - occupied, 0),
        overflow: Math.max(occupied - capacity, 0),
        groups,
        issues: [...new Set(issues)],
      };
    });
};

export const allocationGroupAt = (container: AllocationContainerT, index: number) => {
  if (index < 0 || index >= container.occupied) return null;
  let offset = 0;
  for (const group of container.groups) {
    offset += group.pallets;
    if (index < offset) return group;
  }
  return null;
};

export const allocationGroupStart = (container: AllocationContainerT, key: string) => {
  let offset = 0;
  for (const group of container.groups) {
    if (group.key === key) return offset;
    offset += group.pallets;
  }
  return 0;
};
