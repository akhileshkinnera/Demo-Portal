// Public, non-secret settings only. Everything VITE_* is visible in the browser.
export const APP_NAME = import.meta.env.VITE_APP_NAME || 'Company Portal';
export const API_URL = import.meta.env.VITE_API_URL || '';
export const REQUEST_TIMEOUT_MS = 20000;
