const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const USERNAME_RE = /^[A-Za-z0-9._-]{3,50}$/;

export function validateIdentifier(value) {
  const v = (value || '').trim();
  if (!v) return 'Enter your username or email.';
  if (v.includes('@')) {
    return EMAIL_RE.test(v) ? '' : 'Enter a valid email address.';
  }
  return USERNAME_RE.test(v) ? '' : 'Username must be 3-50 characters (letters, numbers, . _ -).';
}

export function validatePassword(value) {
  if (!value) return 'Enter your password.';
  if (value.length > 200) return 'Password is too long.';
  return '';
}
