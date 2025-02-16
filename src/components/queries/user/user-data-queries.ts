'use client';

import { getAllUserData, getUserData } from '@/app/actions/user-data';
import { useQuery } from '@tanstack/react-query';

export const useGetUser = (username: string | null) => {
  return useQuery({
    enabled: Boolean(username),
    queryKey: ['user', 'self', { username }],
    queryFn: async () => {
      const res = await getUserData(username?.trim() ?? '');

      if (!res.isSuccess) {
        throw res.error;
      }

      return res.data;
    },
    refetchInterval: 5000,
  });
};

export const useGetAllUsers = () => {
  return useQuery({
    queryKey: ['user', 'all'],
    queryFn: async () => {
      return await getAllUserData();
    },
    refetchInterval: 5000,
    staleTime: 5000,
  });
};
