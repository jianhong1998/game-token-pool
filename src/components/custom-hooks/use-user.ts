'use client';

import { LocalStorageKey } from '@/enums/local-storage-key.enum';
import { useLocalStorage } from './use-local-storage';

export const useUsername = () => {
  const { value: username } = useLocalStorage(LocalStorageKey.USER, '');
  return username;
};

export const useUserPublicKey = () => {
  const { value: userPublicKey } = useLocalStorage(
    LocalStorageKey.USER_PUBLIC_KEY,
    ''
  );
  return userPublicKey;
};
