'use client';

import { useLocalStorage } from '@/components/custom-hooks/use-local-storage';
import UserDashboard from '@/components/dashboard/user-dashboard';
import { useGetUser } from '@/components/queries/user/user-data-queries';
import { useUserEndGame } from '@/components/queries/user/user-end-game-queries';
import { ErrorCode } from '@/constants/error';
import { LocalStorageKey } from '@/enums/local-storage-key.enum';
import { PageContext } from '@/types/page-context.type';
import { NextPage } from 'next';
import { useRouter } from 'next/navigation';
import { use, useEffect, useState } from 'react';

type UserPageProps = {
  username: string;
};

const UserPage: NextPage<PageContext<UserPageProps>> = ({ params }) => {
  const { username } = use(params);
  const router = useRouter();
  const [hasMounted, setHasMounted] = useState(false);
  const {
    value: usernameInLocalStorage,
    removeValue: removeUsernameInLocalStorage,
  } = useLocalStorage(LocalStorageKey.USER, '');
  const {
    value: userPublicKeyInLocalStorage,
    removeValue: removeUserPublicKeyInLocalStorage,
  } = useLocalStorage(LocalStorageKey.USER_PUBLIC_KEY, '');

  const { isSuccess: isUserEndGameRequestSuccess } = useUserEndGame();
  const { error: getUserError } = useGetUser(usernameInLocalStorage);

  const decodedUsername = decodeURI(username);

  useEffect(() => {
    // Intentionally forces a second commit after this mount commit's
    // effects (including useLocalStorage's internal useSyncExternalStore
    // resync) have fully flushed, so the destructive logout check below
    // only ever evaluates the real, resynced localStorage value instead of
    // the stale pre-resync value present on the very first render.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHasMounted(true);
  }, []);

  useEffect(() => {
    if (isUserEndGameRequestSuccess) {
      router.replace('/');
    }
  }, [isUserEndGameRequestSuccess, router]);

  useEffect(() => {
    if (
      getUserError &&
      getUserError.message.includes(ErrorCode.USER_NOT_EXIST)
    ) {
      removeUsernameInLocalStorage();
      removeUserPublicKeyInLocalStorage();
      router.replace('/');
    }
  }, [
    getUserError,
    router,
    removeUsernameInLocalStorage,
    removeUserPublicKeyInLocalStorage,
  ]);

  useEffect(() => {
    if (
      hasMounted &&
      (!usernameInLocalStorage ||
        !userPublicKeyInLocalStorage ||
        usernameInLocalStorage.length === 0 ||
        userPublicKeyInLocalStorage.length === 0)
    ) {
      removeUserPublicKeyInLocalStorage();
      removeUsernameInLocalStorage();
      router.replace('/');
    }
  }, [
    hasMounted,
    usernameInLocalStorage,
    userPublicKeyInLocalStorage,
    router,
    removeUserPublicKeyInLocalStorage,
    removeUsernameInLocalStorage,
  ]);

  return <UserDashboard username={decodedUsername} />;
};

export default UserPage;
