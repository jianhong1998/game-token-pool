'use client';

import { FC, useEffect } from 'react';
import { useUserLogin } from '../queries/user/user-login-queries';
import { useRouter } from 'next/navigation';

type GameDashboardProps = {
  username: string;
};

const GameDashboard: FC<GameDashboardProps> = ({ username }) => {
  const router = useRouter();

  const { mutate: userLoginFn, data: userData } = useUserLogin();

  useEffect(() => {
    userLoginFn(username);
  }, [username, userLoginFn]);

  useEffect(() => {
    if (userData && !userData.isLoginSuccess) {
      router.replace('/game');
    }
  }, [userData, router]);

  return (
    <>
      {!userData && (
        <div className='h-full'>
          <h1 className='text-center'>Loading user data...</h1>
        </div>
      )}
      {userData?.isLoginSuccess && (
        <div>
          <h1 className='font-bold'>{username}</h1>
        </div>
      )}
    </>
  );
};

export default GameDashboard;
