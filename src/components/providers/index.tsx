'use client';

import { type ReactNode, useEffect } from 'react';

import { MswProvider } from '@/components/providers/msw-provider';
import { QueryProvider } from '@/components/providers/query-provider';
import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { usePlanStore } from '@/stores/usePlanStore';

export function Providers({ children }: { children: ReactNode }) {
  // 저장된 계획 ID는 마운트 뒤에 읽는다 (서버 렌더링 결과와 어긋나지 않게)
  useEffect(() => {
    usePlanStore.persist.rehydrate();
  }, []);

  return (
    <MswProvider>
      <QueryProvider>
        <TooltipProvider>
          {children}
          <Toaster position="top-right" richColors />
        </TooltipProvider>
      </QueryProvider>
    </MswProvider>
  );
}
