import { test as base } from '@playwright/test';

// External font delivery is outside these functional contracts. A stalled font
// can hold page.goto's load event for 30s and can shift rectangles mid-gesture.
// Use the app's existing fallback fonts consistently, before creating any page.
export const test = base.extend({
  context: async ({ context }, runTest) => {
    await context.route(/^https:\/\/fonts\.(?:googleapis|gstatic)\.com\//, route => route.abort());
    await runTest(context);
  },
});
export * from '@playwright/test';
