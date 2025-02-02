'use client';

import { adminLogin } from '@/app/admin/actions/admin-login';
import { NotificationUtil } from '@/util/client/notification.util';
import { FC, KeyboardEventHandler, useState } from 'react';

interface Props {
  updateLoginStateFn: (loginState: boolean) => void;
}

const AdminLoginForm: FC<Props> = ({ updateLoginStateFn }) => {
  const [password, setPassword] = useState<string>('');

  const handleLogin = async () => {
    const isSuccess = await adminLogin(password);

    if (isSuccess) {
      NotificationUtil.success('Login successfully');
    } else {
      NotificationUtil.error('Wrong password');
    }

    updateLoginStateFn(isSuccess);
  };

  const handleKey: KeyboardEventHandler<HTMLInputElement> = (event) => {
    const key = event.key;

    if (key.toLowerCase() === 'enter') {
      handleLogin();
    }
  };

  return (
    <>
      <div className='flex flex-col items-center justify-center gap-5 mt-16'>
        <h1 className='text-4xl font-bold leading-tight'>Admin Login</h1>
        <input
          type='text'
          placeholder='Password'
          className='input input-lg input-bordered'
          onChange={(e) => setPassword(e.target.value)}
          onKeyUp={handleKey}
          value={password}
        />
        <button
          className='btn btn-outline btn-primary'
          onClick={handleLogin}
        >
          Login
        </button>
      </div>
    </>
  );
};

export default AdminLoginForm;
