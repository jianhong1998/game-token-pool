'use client';

import { getAllUserData, getUserData } from '@/app/actions/user-data';
import { useQuery } from '@tanstack/react-query';

export const useGetUser = (username: string) => {
  return useQuery({
    queryKey: ['user', 'self', { username }],
    queryFn: async () => {
      return await getUserData(username.trim());
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
