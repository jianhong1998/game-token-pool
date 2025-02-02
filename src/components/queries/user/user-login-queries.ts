'use client';

import { userLogin, userRegister } from '@/app/actions/user-login';
import { ErrorCode } from '@/constants/error';
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
        toast.success('Login successfully', { position: 'top-right' });

        return;
      }

      const { errorMessage } = data;

      if (ErrorUtil.isUserNotFoundError(errorMessage)) {
        toast.error('User not added to pool. Please register first.', {
          position: 'top-right',
        });

        return;
      }

      toast.error(ErrorCode.SOMETHING_WENT_WRONG, { position: 'top-right' });
      console.error('Error from user login: ', errorMessage);
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
        toast.success('Register successfully', { position: 'top-right' });
        return;
      }

      const { errorMessage } = data;
      toast.error(ErrorCode.SOMETHING_WENT_WRONG, { position: 'top-right' });
      console.error(errorMessage);
    },
    onError: (error) => {
      const { message: errorMessage } = error;
      toast.error(ErrorCode.SOMETHING_WENT_WRONG, { position: 'top-right' });
      console.error(errorMessage);
    },
  });
};
