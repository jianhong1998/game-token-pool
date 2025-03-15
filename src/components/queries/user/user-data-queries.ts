'use client';

import {
  getAllUserData,
  getSpecificUserData,
  getUserData,
} from '@/app/actions/user-data';
import { PublicKey } from '@solana/web3.js';
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

export const useGetSpecificUser = (
  params: Partial<{ username: string; authority: PublicKey }>
) => {
  let key = '';
  const { authority, username } = params;

  if (username) {
    key += username;
  }

  if (authority) {
    if (key.length > 0) key += '-';
    key += authority;
  }

  return useQuery({
    queryKey: ['user', 'specific', key],
    queryFn: async () => {
      const res = await getSpecificUserData({
        authority: authority?.toBase58(),
        name: username,
      });

      if (!res.isSuccess) throw res.error;

      return res.data;
    },
    enabled: Boolean(authority) || Boolean(username),
  });
};
