import { transfer, transferToGame } from '@/app/actions/user-fund';
import { ErrorCode } from '@/constants/error';
import { NotificationUtil } from '@/util/client/notification.util';
import { ErrorUtil } from '@/util/shared/error.util';
import { NumberUtil } from '@/util/shared/number.util';
import { useMutation, useQueryClient } from '@tanstack/react-query';

export const useTransfer = (fromUsername: string) => {
  const queryClient = useQueryClient();

  return useMutation<void, Error, { toUsername: string; cashAmount: number }>({
    mutationKey: ['user', 'transfer', { fromUsername }],
    mutationFn: async ({ cashAmount, toUsername }) => {
      await transfer({
        fromUsername,
        toUsername,
        cashAmount,
      });
    },
    onSuccess: async (_data, { cashAmount, toUsername }) => {
      const { displayString: displayAmount } = NumberUtil.getDisplayAmount(
        cashAmount * 100,
        {
          withComma: true,
        }
      );

      NotificationUtil.success(
        `Transfer ${displayAmount} to "${toUsername}" successfully.`
      );
      await queryClient.invalidateQueries({
        queryKey: ['user', 'all'],
      });
      await queryClient.invalidateQueries({
        queryKey: ['user', 'self', { username: fromUsername }],
      });
    },
    onError: (error) => {
      const errorMessage = error.message;

      if (ErrorUtil.isUserNotFoundError(errorMessage)) {
        NotificationUtil.error(
          'User is not added to pool. Please register first.'
        );
        return;
      }

      NotificationUtil.error(ErrorCode.SOMETHING_WENT_WRONG);
      console.error(errorMessage);
    },
  });
};

type IUseTransferToGameParams = {
  gameName: string;
  username: string;
  cashAmount: number;
};

export const useTransferToGame = (poolPublicKey: string) => {
  const queryClient = useQueryClient();

  return useMutation<void, Error, IUseTransferToGameParams>({
    mutationKey: ['user', 'transfer', 'game', {}],
    mutationFn: async ({ cashAmount, gameName, username }) => {
      const tokenAmount = cashAmount * 100;
      await transferToGame({
        gameName,
        username,
        amount: tokenAmount,
      });
    },
    onSuccess: async (_, { cashAmount, gameName, username }) => {
      NotificationUtil.success(`Transfered ${cashAmount} to game`);

      await queryClient.invalidateQueries({
        queryKey: ['user', 'self', { username }],
      });
      await queryClient.invalidateQueries({
        queryKey: ['game', 'one', { poolPublicKey, gameName }],
      });
    },
  });
};
