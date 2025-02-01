'use client';

import { getUserData } from '@/app/actions/user-data';
import { useQuery } from '@tanstack/react-query';

export const useGetUser = (username: string) => {
  return useQuery({
    queryKey: ['user', 'self', username],
    queryFn: async () => {
      return await getUserData(username.trim());
    },
    staleTime: 5000,
    retry: 3,
    refetchOnReconnect: true,
    refetchOnMount: true,
  });
};
