'use client';

import { useRouter } from 'next/navigation';
import { FC, KeyboardEventHandler, useState } from 'react';
import {
  useUserLogin,
  useUserRegister,
} from '../queries/user/user-login-queries';

const GameLoginForm: FC = () => {
  const [username, setUsername] = useState<string>('');

  const router = useRouter();

  const { mutateAsync: userLoginFn, isPending: isLoginPending } =
    useUserLogin();
  const { mutateAsync: userRegisterFn, isPending: isRegisterPending } =
    useUserRegister();

  const isProcessing = isLoginPending || isRegisterPending;

  const handleLogin = async () => {
    if (username.trim().length === 0) {
      return;
    }

    const result = await userLoginFn(username);

    if (result.isLoginSuccess) {
      router.replace(`/game/${result.username}`);
    }
  };

  const handleRegister = async () => {
    const result = await userRegisterFn(username);

    if (result.isLoginSuccess) {
      router.replace(`/game/${result.username}`);
    }
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
          disabled={username.trim().length === 0 || isProcessing}
        >
          Login
        </button>
        <button
          className='btn btn-outline btn-primary w-full'
          onClick={handleRegister}
          disabled={username.trim().length === 0 || isProcessing}
        >
          Register
        </button>
      </div>
    </>
  );
};

export default GameLoginForm;
