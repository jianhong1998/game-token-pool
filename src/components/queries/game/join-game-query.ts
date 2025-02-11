import { joinGame } from '@/app/game/actions/join-game';
import { ErrorCode } from '@/constants/error';
import { NotificationUtil } from '@/util/client/notification.util';
import { useMutation, useQueryClient } from '@tanstack/react-query';

export const useJoinGame = () => {
  const queryClient = useQueryClient();

  return useMutation<void, Error, { username: string; gameName: string }>({
    mutationKey: ['game', 'join'],
    mutationFn: async ({ gameName, username }) => {
      await joinGame({
        username,
        gameName,
      });
    },
    throwOnError: false,
    onError: (error) => {
      const message = error.message;

      if (message === ErrorCode.USER_ALREADY_JOINED_GAME) {
        NotificationUtil.error('You already join this game');
        return;
      }

      NotificationUtil.error(ErrorCode.SOMETHING_WENT_WRONG);
      console.error(error);
    },
    onSuccess: async (_, { username }) => {
      NotificationUtil.success('Join game successfully');
      await queryClient.invalidateQueries({
        queryKey: ['game', 'all', { username }],
      });
    },
  });
};
