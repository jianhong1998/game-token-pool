'use client';

import { deleteGame } from '@/app/game/actions/delete-game';
import { ErrorCode } from '@/constants/error';
import { NotificationUtil } from '@/util/client/notification.util';
import { useMutation, useQueryClient } from '@tanstack/react-query';

export const useDeleteGame = (poolPublicKey: string, username: string) => {
  const queryClient = useQueryClient();

  return useMutation<void, Error, { gameName: string }>({
    mutationKey: ['game', 'delete', { poolPublicKey }],
    mutationFn: async ({ gameName }) => {
      await deleteGame(gameName);
    },
    onSuccess: async (_m, { gameName }) => {
      NotificationUtil.success(`Game "${gameName}" is deleted successfully.`);
      await queryClient.invalidateQueries({
        queryKey: ['game', 'all', { username }],
      });
    },
    onError: (error) => {
      NotificationUtil.error(ErrorCode.SOMETHING_WENT_WRONG);
      console.error(error);
    },
    onMutate: ({ gameName }) => {
      NotificationUtil.loading(`Deleting ${gameName}`);
    },
  });
};
