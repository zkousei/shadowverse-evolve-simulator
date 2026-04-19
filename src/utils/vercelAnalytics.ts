type VercelAnalyticsEnv = {
  PROD?: boolean;
  VITE_ENABLE_VERCEL_ANALYTICS?: string;
};

type VercelAnalyticsEvent = {
  url: string;
};

export const shouldEnableVercelAnalytics = (env: VercelAnalyticsEnv) => {
  return env.PROD === true && env.VITE_ENABLE_VERCEL_ANALYTICS === 'true';
};

export const redactVercelAnalyticsEvent = <TEvent extends VercelAnalyticsEvent>(
  event: TEvent,
) => {
  try {
    const url = new URL(event.url);

    if (url.pathname === '/game') {
      url.search = '';
      url.hash = '';
    }

    return {
      ...event,
      url: url.toString(),
    };
  } catch {
    return event;
  }
};
