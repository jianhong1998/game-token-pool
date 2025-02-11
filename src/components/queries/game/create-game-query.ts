import { createGame } from '@/app/game/actions/create-game';
import { ErrorCode } from '@/constants/error';
import { NotificationUtil } from '@/util/client/notification.util';
import { useMutation, useQueryClient } from '@tanstack/react-query';

export const useCreateGame = () => {
  const queryClient = useQueryClient();

  return useMutation<void, Error, { gameName: string; username: string }>({
    mutationKey: ['game', 'create'],
    mutationFn: async ({ gameName }) => {
      await createGame({ gameName });
    },
    onError: (error) => {
      NotificationUtil.error(ErrorCode.SOMETHING_WENT_WRONG);
      console.error(error);
    },
    onSuccess: async (_, { username }) => {
      NotificationUtil.success('Created game successfully');
      await queryClient.invalidateQueries({
        queryKey: ['game', 'all', { username }],
      });
    },
  });
};
