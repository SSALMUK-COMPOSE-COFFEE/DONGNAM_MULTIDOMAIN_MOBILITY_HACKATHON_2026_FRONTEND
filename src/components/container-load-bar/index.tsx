import { PalletBar, type PalletSegmentT } from '@/components/pallet-bar';
import type { ContainerLoadT, PlanT, ScenarioT } from '@/types/api';
import { getPortName, getProductName, getShipperShortName } from '@/utils/scenario';

/** 화주 색. 딸기는 파랑 계열, SO2 처리 포도는 보라 계열 */
const SHIPPER_COLORS = ['bg-navy', 'bg-brand', 'bg-cyan'];
const SO2_SHIPPER_COLORS = ['bg-grape', 'bg-grape-soft'];
const OTHER_SHIPPERS_KEY = 'other-shippers';
const OTHER_SHIPPERS_LABEL = '다른 화주';
const OTHER_SHIPPERS_COLOR = 'bg-slate';

type ContainerLoadBarPropsT = {
  container: Pick<ContainerLoadT, 'container_id' | 'voyage_id' | 'capacity_pallets'>;
  /** 계획의 배정. 운임 쇼크 분석처럼 계획이 아닌 응답도 같은 모양으로 넘길 수 있다 */
  plan: {
    assignments: Pick<
      PlanT['assignments'][number],
      'container_id' | 'shipper_id' | 'product_id' | 'pallets'
    >[];
  };
  scenario: ScenarioT;
  viewerShipperId?: string;
};

/**
 * 컨테이너 한 대의 적재를 화주별 파렛트 칸으로 그린다.
 * 재최적화 전후를 나란히 볼 때 색이 바뀌지 않도록 화주 색은 시나리오 순서로 고정한다
 */
export function ContainerLoadBar({
  container,
  plan,
  scenario,
  viewerShipperId,
}: ContainerLoadBarPropsT) {
  const loads = plan.assignments.filter(
    ({ container_id }) => container_id === container.container_id
  );
  const voyage = scenario.voyages.find(({ id }) => id === container.voyage_id);
  const productIds = [...new Set(loads.map(({ product_id }) => product_id))];
  const isSo2 = productIds.some(
    productId => scenario.products.find(({ id }) => id === productId)?.so2_treated
  );

  // 같은 화주의 로트 여러 개는 한 칸 묶음으로 합친다 (밀양 1차 + 당겨 실은 2차)
  const palletsByShipper = new Map<string, number>();
  loads.forEach(({ shipper_id, pallets }) =>
    palletsByShipper.set(shipper_id, (palletsByShipper.get(shipper_id) ?? 0) + pallets)
  );

  const shipperSegments = [...palletsByShipper].map(([shipperId, pallets]) => ({
    key: shipperId,
    label: getShipperShortName(scenario, shipperId),
    pallets,
    colorClassName: getShipperColor(scenario, shipperId, isSo2),
  }));
  const segments = viewerShipperId
    ? anonymizeSegments(shipperSegments, viewerShipperId)
    : shipperSegments;

  return (
    <PalletBar
      title={[
        ...productIds.map(productId => getProductName(scenario, productId)),
        voyage && getPortName(scenario, voyage.destination),
        container.container_id,
      ]
        .filter(Boolean)
        .join(' · ')}
      description={voyage?.vessel_name}
      capacity={container.capacity_pallets}
      segments={segments}
    />
  );
}

/** 같은 계열(SO2 처리 여부) 품목을 내는 화주 중 몇 번째인지로 색을 고른다 */
export const getShipperColor = (scenario: ScenarioT, shipperId: string, isSo2: boolean) => {
  const colors = isSo2 ? SO2_SHIPPER_COLORS : SHIPPER_COLORS;
  const sameGroupShipperIds = [
    ...new Set(
      scenario.lots
        .filter(
          ({ product_id }) =>
            !!scenario.products.find(({ id }) => id === product_id)?.so2_treated === isSo2
        )
        .map(({ shipper_id }) => shipper_id)
    ),
  ];
  const index = Math.max(sameGroupShipperIds.indexOf(shipperId), 0);

  return colors[index % colors.length];
};

const anonymizeSegments = (segments: PalletSegmentT[], viewerShipperId: string) => {
  const own = segments.filter(({ key }) => key === viewerShipperId);
  const otherPallets = segments
    .filter(({ key }) => key !== viewerShipperId)
    .reduce((sum, { pallets }) => sum + pallets, 0);

  return otherPallets > 0
    ? [
        ...own,
        {
          key: OTHER_SHIPPERS_KEY,
          label: OTHER_SHIPPERS_LABEL,
          pallets: otherPallets,
          colorClassName: OTHER_SHIPPERS_COLOR,
        },
      ]
    : own;
};
