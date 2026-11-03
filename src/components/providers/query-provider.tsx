'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { type ReactNode, useEffect, useState } from 'react';

import { bindSaasQueryClient, configureSaasQueryClient } from '@/apis/saas/retry';

export function QueryProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() =>
    configureSaasQueryClient(
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
            retry: 1,
            refetchOnWindowFocus: false,
          },
        },
      })
    )
  );

  useEffect(() => bindSaasQueryClient(queryClient), [queryClient]);

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
