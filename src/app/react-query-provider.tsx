'use client';

import React, { ReactNode, useState } from 'react';
import { ReactQueryStreamedHydration } from '@tanstack/react-query-next-experimental';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';

const makeQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        refetchOnMount: true,
        refetchOnReconnect: true,
        refetchOnWindowFocus: true,
        refetchIntervalInBackground: true,
        retry: 0,
        staleTime: 5000,
      },
      mutations: {
        retry: 0,
      },
    },
  });

export function ReactQueryProvider({ children }: { children: ReactNode }) {
  const [client] = useState(makeQueryClient);

  return (
    <QueryClientProvider client={client}>
      <ReactQueryStreamedHydration>{children}</ReactQueryStreamedHydration>
    </QueryClientProvider>
  );
}
