'use client';

import type { ReactNode } from 'react';

import { MswProvider } from '@/components/providers/msw-provider';
import { QueryProvider } from '@/components/providers/query-provider';
import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';

export function Providers({ children }: { children: ReactNode }) {
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
