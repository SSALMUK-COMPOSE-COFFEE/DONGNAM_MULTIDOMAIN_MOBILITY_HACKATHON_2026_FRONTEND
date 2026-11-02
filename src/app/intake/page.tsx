import { PageHeader } from '@/app/_components/page-header';

// TODO: 품목·수량·선과장·목적지·출하일 5개 입력 → POST /api/intake/lots 미리보기 → 계획 생성
export default function IntakePage() {
  return <PageHeader step="01" title="출하 입력" headline="화주는 다섯 칸만" highlight="채운다" />;
}
