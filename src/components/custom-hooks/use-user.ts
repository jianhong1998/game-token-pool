'use client';

import { LocalStorageKey } from '@/enums/local-storage-key.enum';
import { useLocalStorage } from './use-local-storage';

export const useUsername = () => {
  const { value: username, isReady } = useLocalStorage(
    LocalStorageKey.USER,
    ''
  );
  return { username, isReady };
};

export const useUserPublicKey = () => {
  const { value: userPublicKey, isReady } = useLocalStorage(
    LocalStorageKey.USER_PUBLIC_KEY,
    ''
  );
  return { userPublicKey, isReady };
};
