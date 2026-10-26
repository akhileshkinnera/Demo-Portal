import { useCallback, useEffect, useRef, useState } from 'react';
import { getContent } from '../services/api';

/**
 * Loads carousel, tabs and tiles from Google Sheets (through the Apps Script backend).
 * If the server says the token is no longer valid, `onUnauthorized` is called (logout).
 */
export default function useContent(token, onUnauthorized) {
  const [state, setState] = useState({ data: null, loading: true, error: null });
  const unauthorizedRef = useRef(onUnauthorized);
  unauthorizedRef.current = onUnauthorized;

  const load = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const data = await getContent(token);
      setState({
        data: {
          carousel: Array.isArray(data.carousel) ? data.carousel : [],
          tabs: Array.isArray(data.tabs) ? data.tabs : [],
          tiles: Array.isArray(data.tiles) ? data.tiles : [],
        },
        loading: false,
        error: null,
      });
    } catch (err) {
      if (err.code === 'UNAUTHORIZED') {
        unauthorizedRef.current?.();
        return;
      }
      setState({ data: null, loading: false, error: err.message || 'Failed to load content.' });
    }
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  return { ...state, reload: load };
}
