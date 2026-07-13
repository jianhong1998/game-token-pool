'use client';

import { useEffect, useSyncExternalStore } from 'react';
import { useLocalStorage } from '@/components/custom-hooks/use-local-storage';
import GameLoginForm from '@/components/forms/game-login-form';
import { LocalStorageKey } from '@/enums/local-storage-key.enum';
import { NextPage } from 'next';
import { useRouter } from 'next/navigation';

// No-op subscribe: this store never changes on its own. Its sole purpose is
// to make useSyncExternalStore report `false` on the server (and on the
// client's first, hydration-matching render) and `true` on every client
// render after mount, without ever calling setState inside an effect.
const subscribeNoop = () => () => {};

const GamePage: NextPage = () => {
  const { value: username } = useLocalStorage(LocalStorageKey.USER, '');
  const { value: userPublicKey } = useLocalStorage(
    LocalStorageKey.USER_PUBLIC_KEY,
    ''
  );

  const router = useRouter();
  const hasMounted = useSyncExternalStore(
    subscribeNoop,
    () => true,
    () => false
  );

  const isLoggedIn = username.length > 0 && userPublicKey.length > 0;

  useEffect(() => {
    if (isLoggedIn) {
      router.replace(`/${encodeURI(username)}`);
    }
  }, [isLoggedIn, username, router]);

  if (hasMounted && isLoggedIn) return null;

  return <GameLoginForm />;
};

export default GamePage;
