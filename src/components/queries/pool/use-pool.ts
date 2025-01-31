'use client';

import { getPools, initPool } from '@/app/admin/actions/pool';
import { ErrorCode } from '@/constants/error';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';

export const useGetPools = () => {
  return useQuery({
    queryKey: ['pool', 'all'],
    queryFn: async () => {
      return await getPools();
    },
    refetchOnReconnect: true,
  });
};

export const useInitPool = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ['pool', 'init'],
    mutationFn: async (poolName: string) => {
      return await initPool({ poolName });
    },
    onSuccess: async (data) => {
      toast.success(`Pool initialization request sent`, {
        position: 'top-right',
      });

      await queryClient.invalidateQueries({ queryKey: ['pool', 'all'] });
    },
    onError: (error) => {
      toast.error(ErrorCode.SOMETHING_WENT_WRONG, { position: 'top-right' });
    },
  });
};
