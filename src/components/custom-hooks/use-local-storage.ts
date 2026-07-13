'use client';

import { LocalStorageKey } from '@/enums/local-storage-key.enum';
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';

interface IUseLocalStorageReturn<T> {
  value: T;
  setValue: (value: T) => void;
  removeValue: () => void;
  isReady: boolean;
}

interface ICacheEntry<T> {
  raw: string | null;
  parsed: T;
}

// Generic type for the value stored in localStorage
export const useLocalStorage = <T>(
  key: LocalStorageKey,
  initialValue: T
): IUseLocalStorageReturn<T> => {
  // Caches the last { raw, parsed } pair so getSnapshot returns an
  // Object.is-stable value across repeated calls when the underlying
  // localStorage entry hasn't changed, as required by useSyncExternalStore.
  const cacheRef = useRef<ICacheEntry<T> | null>(null);
  // Captures the latest onStoreChange callback so setValue/removeValue can
  // notify React of a same-tab write (native `storage` events only fire in
  // *other* tabs), without going stale between subscribe calls.
  const onStoreChangeRef = useRef<(() => void) | null>(null);

  const getSnapshot = useCallback((): T => {
    let raw: string | null;
    try {
      raw = window?.localStorage.getItem(key) ?? null;
    } catch (error) {
      // Reading localStorage failed (e.g. unavailable/disabled); fall back.
      return initialValue;
    }

    const cached = cacheRef.current;
    if (cached && cached.raw === raw) {
      return cached.parsed;
    }

    let parsed: T;
    try {
      parsed = raw ? (JSON.parse(raw) as T) : initialValue;
    } catch (error) {
      // Corrupted localStorage value; fall back to initialValue rather than
      // throwing during render.
      parsed = initialValue;
    }

    cacheRef.current = { raw, parsed };
    return parsed;
  }, [key, initialValue]);

  // Server always sees `initialValue`, matching the current SSR output.
  const getServerSnapshot = useCallback((): T => initialValue, [initialValue]);

  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      onStoreChangeRef.current = onStoreChange;

      const handleStorageEvent = (event: StorageEvent) => {
        if (event.key === key) {
          onStoreChangeRef.current?.();
        }
      };

      window.addEventListener('storage', handleStorageEvent);
      return () => {
        window.removeEventListener('storage', handleStorageEvent);
        onStoreChangeRef.current = null;
      };
    },
    [key]
  );

  const storedValue = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot
  );

  // Intentionally declared after the useSyncExternalStore call above so
  // React flushes useSyncExternalStore's own internal resync-consistency-
  // check effect first within this hook instance's effect list, before this
  // toggle effect, in the same passive-effects flush.
  const [isReady, setIsReady] = useState(false);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsReady(true);
  }, []);

  const setValue = (value: T) => {
    try {
      // Allow value to be a function so we have same API as useState
      const valueToStore =
        value instanceof Function ? value(storedValue) : value;
      // Save to local storage
      window?.localStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (error) {
      // A more advanced implementation could handle the error case
      // console.error('Error setting localStorage:', error);
    }
    // Native `storage` events don't fire in the tab that made the change, so
    // notify this hook instance directly for an instant same-tab update.
    onStoreChangeRef.current?.();
  };

  const removeValue = () => {
    try {
      window?.localStorage.removeItem(key);
    } catch (error) {
      // A more advanced implementation could handle the error case
      // console.error('Error setting localStorage:', error);
    }
    onStoreChangeRef.current?.();
  };

  return { value: storedValue, setValue, removeValue, isReady };
};
