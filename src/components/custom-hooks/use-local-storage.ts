'use client';

import { LocalStorageKey } from '@/enums/local-storage-key.enum';
import { useState, useEffect } from 'react';

interface IUseLocalStorageReturn<T> {
  value: T;
  setValue: (value: T) => void;
  removeValue: () => void;
}

// Generic type for the value stored in localStorage
export const useLocalStorage = <T>(
  key: LocalStorageKey,
  initialValue: T
): IUseLocalStorageReturn<T> => {
  // State to store our value
  // Pass initial state function to useState so logic is only executed once
  const [storedValue, setStoredValue] = useState(() => {
    try {
      // Get from local storage by key
      const item = window?.localStorage.getItem(key);
      // Parse stored json or if none return initialValue
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      // If error also return initialValue
      // console.error('Error reading localStorage:', error);
      return initialValue;
    }
  });

  // Return a wrapped version of useState's setter function that ...
  // ... persists the new value to localStorage.
  const setValue = (value: T) => {
    try {
      // Allow value to be a function so we have same API as useState
      const valueToStore =
        value instanceof Function ? value(storedValue) : value;
      // Save state
      setStoredValue(valueToStore);
      // Save to local storage
      window?.localStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (error) {
      // A more advanced implementation could handle the error case
      // console.error('Error setting localStorage:', error);
    }
  };

  const removeValue = () => {
    try {
      setStoredValue(null);
      // Save to local storage
      window?.localStorage.removeItem(key);
    } catch (error) {
      // A more advanced implementation could handle the error case
      // console.error('Error setting localStorage:', error);
    }
  };

  // Handle hydration mismatch by ensuring the hook only runs on the client side
  useEffect(() => {
    const item = window?.localStorage.getItem(key);
    if (item) {
      setStoredValue(JSON.parse(item));
    }
  }, [key]);

  return { value: storedValue, setValue, removeValue };
};
