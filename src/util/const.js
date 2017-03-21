export const API_ROOT = process.env.API_ROOT;
export const ALGOLIA_INDEX = process.env.ALGOLIA_INDEX;
export const UPDATE_FEED_URL = process.env.UPDATE_FEED_URL;

export function isProduction() {
  return (process.env.NODE_ENV === 'production');
}

export function isDevelopment() {
  return (process.env.NODE_ENV === 'development');
}

export function isBackendProduction() {
  return (process.env.BACKEND === 'production');
}

export function isBackendDevelopment() {
  return (process.env.BACKEND === 'development');
}
