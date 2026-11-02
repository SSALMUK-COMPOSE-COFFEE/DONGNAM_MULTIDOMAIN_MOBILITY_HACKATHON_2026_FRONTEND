import { PageHeader } from '@/app/_components/page-header';

// TODO: 산청 2파렛트 취소 → '당겨 채우기 / 다음 배 이월 / 그대로 출항' 세 안 비용 비교 → 배정·경로 갱신
export default function ReplanPage() {
  return (
    <PageHeader
      step="02"
      title="취소 재최적화"
      description="화주가 빠지면 남은 화주의 배정과 집하 경로를 다시 짠다"
    />
  );
}
