'use client';

import { useEffect } from 'react';
import { useLocalStorage } from '@/components/custom-hooks/use-local-storage';
import GameLoginForm from '@/components/forms/game-login-form';
import { LocalStorageKey } from '@/enums/local-storage-key.enum';
import { NextPage } from 'next';
import { useRouter } from 'next/navigation';

const GamePage: NextPage = () => {
  const { value: username } = useLocalStorage(LocalStorageKey.USER, '');
  const { value: userPublicKey } = useLocalStorage(
    LocalStorageKey.USER_PUBLIC_KEY,
    ''
  );

  const router = useRouter();

  const isLoggedIn = username.length > 0 && userPublicKey.length > 0;

  useEffect(() => {
    if (isLoggedIn) {
      router.replace(`/${encodeURI(username)}`);
    }
  }, [isLoggedIn, username, router]);

  if (isLoggedIn) return null;

  return <GameLoginForm />;
};

export default GamePage;
