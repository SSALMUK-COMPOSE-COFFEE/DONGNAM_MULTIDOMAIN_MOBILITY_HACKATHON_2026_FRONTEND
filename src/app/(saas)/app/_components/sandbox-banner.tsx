'use client';

import { useIsSandbox } from '@/apis/saas/auth';

export function SandboxBanner() {
  const isSandbox = useIsSandbox();

  if (!isSandbox) return null;

  return (
    <div role="status" className="m2-banner">
      <span className="m2-chip m2-chip-navy">데모 환경</span>
      <span>예시 조직 데이터로 둘러보는 중입니다. 실제 거래 데이터와 섞이지 않습니다.</span>
    </div>
  );
}
