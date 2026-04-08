'use client';

import { useEffect, useState, useCallback } from 'react';

let cachedAuth: boolean | null = null;
const listeners = new Set<(v: boolean) => void>();

export function useAuth() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(cachedAuth ?? false);
  const [isLoaded, setIsLoaded] = useState<boolean>(cachedAuth !== null);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/token', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        const v = !!data.authenticated;
        cachedAuth = v;
        setIsAuthenticated(v);
        listeners.forEach((l) => l(v));
      }
    } catch {
      /* ignore */
    } finally {
      setIsLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (cachedAuth === null) refresh();
    const l = (v: boolean) => setIsAuthenticated(v);
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  }, [refresh]);

  return { isAuthenticated, isLoaded, refresh };
}
