import { deposit } from '@/app/actions/user-fund';
import { ErrorCode } from '@/constants/error';
import { ErrorUtil } from '@/util/shared/error.util';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';

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
        toast.success(`Deposited ${cashAmount} to account successfully`, {
          position: 'top-right',
        });
        await queryClient.invalidateQueries({
          queryKey: ['user', 'self', { username }],
        });
      },
      onError: (error) => {
        const errorMessage = error.message;

        if (ErrorUtil.isUserNotFoundError(errorMessage)) {
          toast.error('User not added to pool. Please register first.', {
            position: 'top-right',
          });
          return;
        }

        toast.error(ErrorCode.SOMETHING_WENT_WRONG, { position: 'top-right' });
        console.error(errorMessage);
      },
    },
    queryClient
  );
};
