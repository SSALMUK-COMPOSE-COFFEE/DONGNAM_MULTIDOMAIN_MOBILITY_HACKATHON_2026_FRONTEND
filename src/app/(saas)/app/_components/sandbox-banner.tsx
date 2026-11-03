'use client';

import { useIsSandbox } from '@/apis/saas/auth';
import { Badge } from '@/components/ui/badge';

export function SandboxBanner() {
  const isSandbox = useIsSandbox();

  if (!isSandbox) return null;

  return (
    <div
      role="status"
      className="flex items-center gap-3 border-b border-line bg-brand-soft/60 px-8 py-2 text-sm text-navy"
    >
      <Badge className="bg-navy text-white">데모 환경</Badge>
      <span className="text-muted-foreground">
        예시 조직 데이터로 둘러보는 중입니다. 실제 거래 데이터와 섞이지 않습니다.
      </span>
    </div>
  );
}
