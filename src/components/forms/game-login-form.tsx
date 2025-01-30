'use client';

import { FC, KeyboardEventHandler, useState } from 'react';
import {
  useUserLogin,
  useUserRegister,
} from '../queries/user/user-login-queries';
import { useRouter } from 'next/navigation';

const GameLoginForm: FC = () => {
  const [username, setUsername] = useState<string>('');

  const router = useRouter();

  const { mutateAsync: userLoginFn } = useUserLogin();
  const { mutateAsync: userRegisterFn } = useUserRegister();

  const handleLogin = async () => {
    if (username.trim().length === 0) {
      return;
    }

    const result = await userLoginFn(username);

    if (result.isLoginSuccess) {
      router.replace(`/game/${result.username}`);
    }

    // try {
    //   const result = await userLogin({
    //     username,
    //   });

    //   const { isLoginSuccess } = result;

    //   if (isLoginSuccess) {
    //     const { username: resultUsername } = result;

    //     toast.success('Login successfully', { position: 'top-right' });

    // router.replace(`/game/${result.username}`);
    //   } else {
    //     throw new Error(result.errorMessage);
    //   }
    // } catch (error) {
    //   const errorMessage = (error as Error).message;

    //   if (errorMessage === ErrorCode.USER_NOT_EXIST) {
    //     toast.error('User not added to pool. Please register first.', {
    //       position: 'top-right',
    //     });
    //     return;
    //   }

    //   toast.error(ErrorCode.SOMETHING_WENT_WRONG, { position: 'top-right' });
    //   console.error(errorMessage);
    // }
  };

  const handleRegister = async () => {
    const result = await userRegisterFn(username);

    if (result.isLoginSuccess) {
      router.replace(`/game/${result.username}`);
    }

    // try {
    //   const result = await userRegister({
    //     username,
    //   });
    //   if (result.isLoginSuccess) {
    //     toast.success('Register successfully', { position: 'top-right' });
    //     router.replace(`/game/${result.username}`);
    //   } else {
    //     throw new Error(result.errorMessage);
    //   }
    // } catch (error) {
    //   const errorMessage = (error as Error).message;
    //   toast.error(ErrorCode.SOMETHING_WENT_WRONG, { position: 'top-right' });
    //   console.error(errorMessage);
    // }
  };

  const handleKey: KeyboardEventHandler<HTMLInputElement> = (event) => {
    const key = event.key;

    if (key.toLowerCase() === 'enter') {
      handleLogin();
    }
  };

  return (
    <>
      <div className='flex flex-col items-center justify-center gap-5 mt-16 px-5'>
        <h1 className='text-4xl font-bold leading-tight'>User Login</h1>
        <input
          type='text'
          placeholder='User Name'
          className='input input-lg input-bordered w-full'
          onChange={(e) => setUsername(e.target.value)}
          onKeyUp={handleKey}
          value={username}
        />
        <button
          className='btn btn-primary w-full'
          onClick={handleLogin}
          disabled={username.trim().length === 0}
        >
          Login
        </button>
        <button
          className='btn btn-outline btn-primary w-full'
          onClick={handleRegister}
          disabled={username.trim().length === 0}
        >
          Register
        </button>
      </div>
    </>
  );
};

export default GameLoginForm;
