'use client';

import AdminUserDashboard from '@/components/dashboard/admin-user-dashboard';
import AdminLoginForm from '@/components/forms/admin-login-form';
import InitPoolForm from '@/components/forms/init-pool-form/init-pool-form';
import { useGetPools } from '@/components/queries/pool/use-pool';
import { NextPage } from 'next';
import { useState } from 'react';

const AdminPage: NextPage = () => {
  const [isLogin, setIsLogin] = useState<boolean>(false);

  const { data: pools } = useGetPools();

  const updateLoginState = (state: boolean) => {
    setIsLogin(state);
  };

  if (!isLogin) {
    return <AdminLoginForm updateLoginStateFn={updateLoginState} />;
  }

  return (
    <>
      <InitPoolForm />

      {pools && pools.length > 0 && (
        <>
          <hr className='border-t border-2 border-gray-200 w-full mx-auto my-4' />
          <AdminUserDashboard />
        </>
      )}
    </>
  );
};

export default AdminPage;
