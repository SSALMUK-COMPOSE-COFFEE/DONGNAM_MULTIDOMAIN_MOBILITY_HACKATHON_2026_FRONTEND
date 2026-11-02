import { PageHeader } from '@/app/_components/page-header';

// TODO: 유류할증료 470 → 2,060원 → POST /api/analysis/fuel-shock 로 수단 판단·배정 변화 비교
export default function FuelShockPage() {
  return (
    <PageHeader step="05" title="운임 쇼크" headline="항공 운임이 뛰면" highlight="계획이 바뀐다" />
  );
}
