'use client';

import { userLogin, userRegister } from '@/app/actions/user-login';
import { ErrorCode } from '@/constants/error';
import { NotificationUtil } from '@/util/client/notification.util';
import { ErrorUtil } from '@/util/shared/error.util';
import { useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';

type UserLoginResponse = Awaited<ReturnType<typeof userLogin>>;
type UserRegisterResponse = Awaited<ReturnType<typeof userRegister>>;

export const useUserLogin = () => {
  return useMutation<UserLoginResponse, Error, string>({
    mutationKey: ['user', 'login'],
    mutationFn: async (username) => {
      const result = await userLogin({
        username: username.trim(),
      });

      return result;
    },
    onSuccess: (data) => {
      if (data.isLoginSuccess) {
        NotificationUtil.success('Login successfully');

        return;
      }

      const { errorMessage } = data;

      if (ErrorUtil.isUserNotFoundError(errorMessage)) {
        NotificationUtil.error(
          'User not added to pool. Please register first.'
        );

        return;
      }

      NotificationUtil.error(ErrorCode.SOMETHING_WENT_WRONG);
      console.error('Error from user login: ', errorMessage);
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
  });
};

export const useUserRegister = () => {
  return useMutation<UserRegisterResponse, Error, string>({
    mutationKey: [],
    mutationFn: async (username) => {
      return await userRegister({ username: username.trim() });
    },
    onSuccess: (data) => {
      if (data.isLoginSuccess) {
        NotificationUtil.success('Register successfully');
        return;
      }

      const { errorMessage } = data;
      NotificationUtil.error(ErrorCode.SOMETHING_WENT_WRONG);
      console.error(errorMessage);
    },
    onError: (error) => {
      const { message: errorMessage } = error;
      NotificationUtil.error(ErrorCode.SOMETHING_WENT_WRONG);
      console.error(errorMessage);
    },
  });
};
