import { deposit } from '@/app/actions/user-fund';
import { ErrorCode } from '@/constants/error';
import { NotificationUtil } from '@/util/client/notification.util';
import { ErrorUtil } from '@/util/shared/error.util';
import { useMutation, useQueryClient } from '@tanstack/react-query';

export interface IUseDepositParams {
  username: string;
  cashAmount: number;
}

export const useDeposit = () => {
  const queryClient = useQueryClient();

  return useMutation<void, Error, IUseDepositParams>(
    {
      mutationKey: ['user', 'deposit'],
      mutationFn: async ({ cashAmount, username }) => {
        await deposit({ cashAmount, username });
      },
      onSuccess: async (_data, { cashAmount, username }) => {
        NotificationUtil.success(
          `Deposited ${cashAmount} to account successfully`
        );
        await queryClient.invalidateQueries({
          queryKey: ['user', 'self', { username }],
        });
      },
      onError: (error) => {
        const errorMessage = error.message;

        if (ErrorUtil.isUserNotFoundError(errorMessage)) {
          NotificationUtil.error(
            'User not added to pool. Please register first.'
          );
          return;
        }

        NotificationUtil.error(ErrorCode.SOMETHING_WENT_WRONG);
        console.error(errorMessage);
      },
    },
    queryClient
  );
};
