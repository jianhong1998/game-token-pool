import { transfer } from '@/app/actions/user-fund';
import { NotificationUtil } from '@/util/client/notification.util';
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

      NotificationUtil.error(errorMessage);
    },
  });
};
