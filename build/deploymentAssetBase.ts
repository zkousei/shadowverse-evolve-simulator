/** Keep an open Vercel page's lazy chunks on the deployment that served it. */
export const deploymentAssetBase = (
  command: string,
  environment: { VERCEL?: string; VERCEL_URL?: string },
): string => {
  if (command !== 'build' || environment.VERCEL !== '1') return '/';
  const host = environment.VERCEL_URL;
  if (!host || !/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.vercel\.app$/i.test(host)) {
    throw new Error('VERCEL_URL must be the deployment hostname without protocol or path');
  }
  return `https://${host}/`;
};
