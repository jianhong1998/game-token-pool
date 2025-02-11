'use client';

import { LocalStorageKey } from '@/enums/local-storage-key.enum';

export const useUsername = () => {
  return localStorage.getItem(LocalStorageKey.USER);
};

export const useUserPublicKey = () => {
  return localStorage.getItem(LocalStorageKey.USER_PUBLIC_KEY);
};
