import { userEndGame } from '@/app/actions/end-game';
import { ErrorCode } from '@/constants/error';
import { NotificationUtil } from '@/util/client/notification.util';
import { ErrorUtil } from '@/util/shared/error.util';
import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';

export const useUserEndGame = () => {
  const router = useRouter();

  return useMutation<void, Error, { username: string }>({
    mutationKey: ['user', 'end'],
    mutationFn: async ({ username }) => {
      await userEndGame({ username });
    },
    onMutate: () => {
      NotificationUtil.loading(
        `Proceeding end game request. Do NOT leave this page or close the window before it is successful.`
      );
    },
    onSuccess: (_data, { username }) => {
      NotificationUtil.success(
        `End game request completed. User account for "${username}" is deleted.`
      );
    },
    onError: (error) => {
      const errorMessage = error.message;

      if (ErrorUtil.isUserNotFoundError(errorMessage)) {
        NotificationUtil.error('User is never be added to pool.');
        router.replace('/game');
        return;
      }

      NotificationUtil.error(ErrorCode.SOMETHING_WENT_WRONG);
      console.error(errorMessage);
    },
  });
};
