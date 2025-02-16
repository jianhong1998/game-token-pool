'use client';

import { useLocalStorage } from '@/components/custom-hooks/use-local-storage';
import { useUsername } from '@/components/custom-hooks/use-user';
import DealerDashboard from '@/components/dashboard/dealer-dashboard';
import { useGetUser } from '@/components/queries/user/user-data-queries';
import { ErrorCode } from '@/constants/error';
import { LocalStorageKey } from '@/enums/local-storage-key.enum';
import { NotificationUtil } from '@/util/client/notification.util';
import { NextPage } from 'next';
import { useParams, useRouter } from 'next/navigation';
import { useEffect } from 'react';

const DealerPage: NextPage = () => {
  const { username: encodedUsername } = useParams();
  const username = useUsername();

  const router = useRouter();

  const { removeValue: removeUsername } = useLocalStorage(
    LocalStorageKey.USER,
    ''
  );
  const { removeValue: removePublicKey } = useLocalStorage(
    LocalStorageKey.USER_PUBLIC_KEY,
    ''
  );

  const { data: userData, error: getUserError } = useGetUser(username);

  useEffect(() => {
    if (
      typeof encodedUsername === 'string' &&
      username !== decodeURI(encodedUsername)
    ) {
      removePublicKey();
      removeUsername();
      router.replace('/');
    }
  }, [encodedUsername, username, removePublicKey, removeUsername, router]);

  useEffect(() => {
    if (!getUserError) return;

    if (getUserError.message.includes(ErrorCode.USER_NOT_EXIST)) {
      NotificationUtil.error('User is not found');
      router.replace('/');
      return;
    }

    NotificationUtil.error(ErrorCode.SOMETHING_WENT_WRONG);
  }, [getUserError, router]);

  if (!userData) {
    return (
      <h1 className='text-wrap font-bold text-xl text-center'>
        Loading user data...
      </h1>
    );
  }

  return <DealerDashboard userData={userData} />;
};

export default DealerPage;
