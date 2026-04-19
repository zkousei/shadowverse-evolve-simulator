import { describe, expect, it } from 'vitest';
import {
  redactVercelAnalyticsEvent,
  shouldEnableVercelAnalytics,
} from './vercelAnalytics';

describe('vercelAnalytics', () => {
  it('enables analytics only for production builds with the explicit Vercel flag', () => {
    expect(shouldEnableVercelAnalytics({
      PROD: true,
      VITE_ENABLE_VERCEL_ANALYTICS: 'true',
    })).toBe(true);

    expect(shouldEnableVercelAnalytics({
      PROD: false,
      VITE_ENABLE_VERCEL_ANALYTICS: 'true',
    })).toBe(false);

    expect(shouldEnableVercelAnalytics({
      PROD: true,
      VITE_ENABLE_VERCEL_ANALYTICS: undefined,
    })).toBe(false);
  });

  it('redacts game room query parameters from analytics URLs', () => {
    const event = redactVercelAnalyticsEvent({
      url: 'https://example.com/game?host=true&room=ROOM123',
      referrer: 'https://example.com/',
    });

    expect(event).toEqual({
      url: 'https://example.com/game',
      referrer: 'https://example.com/',
    });
  });

  it('keeps non-game analytics URLs intact', () => {
    const event = redactVercelAnalyticsEvent({
      url: 'https://example.com/deck-builder?search=dragon',
    });

    expect(event.url).toBe('https://example.com/deck-builder?search=dragon');
  });
});
