import { API_URL, REQUEST_TIMEOUT_MS } from '../config';

export class ApiError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
  }
}

/**
 * Every call is a POST with Content-Type "text/plain". That is a CORS "simple request",
 * so the browser does not send a preflight (Apps Script web apps cannot answer one).
 * The token travels in the request body, never in the URL.
 */
async function call(action, payload = {}) {
  // Development-only sample backend. `import.meta.env.DEV` is false in production builds,
  // so this whole branch (and mockApi.js) is removed from the shipped bundle.
  if (import.meta.env.DEV && import.meta.env.VITE_USE_MOCK === 'true') {
    const { mockCall } = await import('./mockApi.js');
    return mockCall(action, payload);
  }

  if (!API_URL) {
    throw new ApiError('CONFIG', 'The application is not configured yet. Set VITE_API_URL and rebuild.');
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let response;
  try {
    response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action, ...payload }),
      signal: controller.signal,
      credentials: 'omit',
    });
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new ApiError('TIMEOUT', 'The server took too long to respond. Please try again.');
    }
    throw new ApiError('NETWORK', 'Unable to reach the server. Check your connection and try again.');
  } finally {
    clearTimeout(timer);
  }

  let result;
  try {
    result = await response.json();
  } catch {
    throw new ApiError('BAD_RESPONSE', 'The server returned an unexpected response.');
  }

  if (!result || result.ok !== true) {
    throw new ApiError(result?.code || 'SERVER_ERROR', result?.message || 'Something went wrong. Please try again.');
  }
  return result.data;
}

export function login(identifier, password) {
  return call('login', { identifier, password });
}

export function getContent(token) {
  return call('content', { token });
}
