'use client';

import { getPools, initPool } from '@/app/admin/actions/pool';
import { ErrorCode } from '@/constants/error';
import { NotificationUtil } from '@/util/client/notification.util';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

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
      NotificationUtil.success(`Pool initialization request sent`);

      await queryClient.invalidateQueries({ queryKey: ['pool', 'all'] });
    },
    onError: (error) => {
      NotificationUtil.error(ErrorCode.SOMETHING_WENT_WRONG);
    },
  });
};
