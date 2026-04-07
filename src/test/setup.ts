import '@testing-library/jest-dom';
import { vi } from 'vitest';
import enTranslations from '../i18n/en/translation.json';

type TranslationParams = Record<string, unknown>;

const getTranslation = (key: string, options?: TranslationParams) => {
  const keys = key.split('.');
  let val: unknown = enTranslations;
  for (const k of keys) {
    if (val && typeof val === 'object' && k in val) val = (val as Record<string, unknown>)[k];
    else return key;
  }
  if (typeof val === 'string') {
    let translated = val;
    if (options) {
      for (const [k, v] of Object.entries(options)) {
        translated = translated.replaceAll(`{{${k}}}`, String(v));
      }
    }
    return translated;
  }
  return key;
};

vi.mock('react-i18next', () => ({
  useTranslation: () => {
    return {
      t: (str: string, options?: TranslationParams) => getTranslation(str, options),
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

if (typeof window !== 'undefined') {
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
