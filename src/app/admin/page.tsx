'use client';

import AdminLoginForm from '@/components/forms/admin-login-form';
import InitPoolForm from '@/components/forms/init-pool-form/init-pool-form';
import { NextPage } from 'next';
import { useState } from 'react';

const AdminPage: NextPage = () => {
  const [isLogin, setIsLogin] = useState<boolean>(false);

  const updateLoginState = (state: boolean) => {
    setIsLogin(state);
  };

  return isLogin ? (
    <InitPoolForm />
  ) : (
    <AdminLoginForm updateLoginStateFn={updateLoginState} />
  );
};

export default AdminPage;
