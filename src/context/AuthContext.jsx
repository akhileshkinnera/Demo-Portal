import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import * as api from '../services/api';

const STORAGE_KEY = 'portal.session';
const AuthContext = createContext(null);

function readSession() {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw);
    if (s && typeof s.token === 'string' && Number(s.exp) > Date.now()) return s;
  } catch {
    /* corrupted value - fall through and clear it */
  }
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    /* storage unavailable */
  }
  return null;
}

function writeSession(session) {
  try {
    if (session) sessionStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    else sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    /* storage unavailable (private mode): session just lives in memory */
  }
}

export function AuthProvider({ children }) {
  // sessionStorage (not localStorage): the session ends when the tab is closed.
  // Only the signed token and non-sensitive profile info are stored. Never the password.
  const [session, setSession] = useState(readSession);

  const login = useCallback(async (identifier, password) => {
    const data = await api.login(identifier, password);
    const next = { token: data.token, exp: Number(data.exp), user: data.user };
    writeSession(next);
    setSession(next);
    return next;
  }, []);

  const logout = useCallback(() => {
    writeSession(null);
    setSession(null);
  }, []);

  // Automatically end the session when the token expires.
  useEffect(() => {
    if (!session) return undefined;
    const remaining = session.exp - Date.now();
    if (remaining <= 0) {
      logout();
      return undefined;
    }
    const timer = setTimeout(logout, Math.min(remaining, 2147483647));
    return () => clearTimeout(timer);
  }, [session, logout]);

  const value = useMemo(
    () => ({
      session,
      user: session?.user ?? null,
      token: session?.token ?? null,
      isAuthenticated: Boolean(session),
      login,
      logout,
    }),
    [session, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
