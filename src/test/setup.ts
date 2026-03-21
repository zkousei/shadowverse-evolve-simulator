import '@testing-library/jest-dom';
import { vi } from 'vitest';
import enTranslations from '../i18n/en/translation.json';

const getTranslation = (key: string, options?: any) => {
  const keys = key.split('.');
  let val: any = enTranslations;
  for (const k of keys) {
    if (val && val[k]) val = val[k];
    else return key;
  }
  if (typeof val === 'string') {
    if (options) {
      for (const [k, v] of Object.entries(options)) {
        val = val.replaceAll(`{{${k}}}`, String(v));
      }
    }
    return val;
  }
  return key;
};

vi.mock('react-i18next', () => ({
  useTranslation: () => {
    return {
      t: (str: string, options?: any) => getTranslation(str, options),
      i18n: {
        changeLanguage: () => new Promise(() => {}),
        language: 'en',
      },
    };
  },
  initReactI18next: {
    type: '3rdParty',
    init: () => {},
  }
}));

if (typeof window !== 'undefined' && typeof window.localStorage?.getItem !== 'function') {
  const storage = new Map<string, string>();
  const localStorageMock: Storage = {
    get length() {
      return storage.size;
    },
    clear: () => {
      storage.clear();
    },
    getItem: (key: string) => storage.get(key) ?? null,
    key: (index: number) => Array.from(storage.keys())[index] ?? null,
    removeItem: (key: string) => {
      storage.delete(key);
    },
    setItem: (key: string, value: string) => {
      storage.set(key, value);
    },
  };

  Object.defineProperty(window, 'localStorage', {
    value: localStorageMock,
    configurable: true,
  });
}
