import { lazy, type ComponentType } from 'react';
import PageLoadError from '../components/PageLoadError';

// Catch only module acquisition failures, not errors thrown by a rendered page.
// React caches this result; recovery deliberately reloads the document on user action.
export const createLazyPage = (load: () => Promise<{ default: ComponentType }>) => lazy(async () => {
  try {
    return await load();
  } catch (error) {
    console.error('Could not load page', error);
    return { default: PageLoadError };
  }
});
