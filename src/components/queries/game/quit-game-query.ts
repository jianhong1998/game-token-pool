'use client';

import { userQuitGame } from '@/app/game/actions/quit-game';
import { ErrorCode } from '@/constants/error';
import { NotificationUtil } from '@/util/client/notification.util';
import { useMutation } from '@tanstack/react-query';

export const useUserQuitGame = () => {
  return useMutation<void, Error, { username: string; gameName: string }>({
    mutationKey: ['game', 'quit-game'],
    mutationFn: async ({ username, gameName }) => {
      await userQuitGame({ gameName, username });
    },
    onMutate: () => {
      NotificationUtil.loading('Quiting game');
    },
    onSuccess: async (_, { gameName }) => {
      NotificationUtil.success(`Quitted from game ${gameName}`);
    },
    onError: (error) => {
      NotificationUtil.error(ErrorCode.SOMETHING_WENT_WRONG);
      console.error(error);
    },
    throwOnError: false,
  });
};
