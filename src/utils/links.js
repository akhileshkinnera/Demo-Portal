/**
 * Content comes from a spreadsheet, so treat every URL as untrusted.
 * Only in-app paths ("/app/...") and http(s) links are allowed.
 * "javascript:", "data:" and similar schemes are rejected.
 */
export function classifyLink(value) {
  if (!value) return null;
  const v = String(value).trim();
  if (!v) return null;

  if (/^\/(?!\/)/.test(v)) return { type: 'internal', to: v };

  try {
    const url = new URL(v);
    if (url.protocol === 'https:' || url.protocol === 'http:') {
      return { type: 'external', href: url.href };
    }
  } catch {
    /* not a valid absolute URL */
  }
  return null;
}

/** Images must be https. Anything else is ignored and the gradient fallback is shown. */
export function safeImageUrl(value) {
  if (!value) return null;
  try {
    const url = new URL(String(value).trim());
    return url.protocol === 'https:' ? url.href : null;
  } catch {
    return null;
  }
}

export const LOGOUT_PATH = '/logout';
