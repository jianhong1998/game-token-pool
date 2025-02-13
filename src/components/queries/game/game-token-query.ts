'use client';

import { takeTokenFromGame } from '@/app/game/actions/take-token-from-game';
import { ErrorCode } from '@/constants/error';
import { NotificationUtil } from '@/util/client/notification.util';
import { useMutation, useQueryClient } from '@tanstack/react-query';

export interface IUseTakeTokenFromGameParams {
  username: string;
  gameName: string;
  cashAmount: number;
}

export const useTakeTokenFromGame = (poolPublicKey: string) => {
  const queryClient = useQueryClient();

  return useMutation<void, Error, IUseTakeTokenFromGameParams>({
    mutationKey: ['game', 'take-token', { poolPublicKey }],
    mutationFn: async ({ cashAmount, gameName, username }) => {
      await takeTokenFromGame({ cashAmount, gameName, username });
    },
    onSuccess: async (_, { cashAmount, gameName, username }) => {
      NotificationUtil.success(`Successfully take ${cashAmount} from game`);
      await queryClient.invalidateQueries({
        queryKey: ['game', 'one', { poolPublicKey, gameName }],
      });
      await queryClient.invalidateQueries({
        queryKey: ['user', 'self', { username }],
      });
    },
    onError: (error) => {
      NotificationUtil.error(ErrorCode.SOMETHING_WENT_WRONG);
      console.error(error);
    },
  });
};
