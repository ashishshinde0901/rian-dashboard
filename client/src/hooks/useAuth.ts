import { useState, useEffect } from 'react';
import { AsanaUser } from '../types';

export function useAuth() {
  const [user, setUser] = useState<AsanaUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_URL}/auth/me`, { credentials: 'include' })
      .then((r) => {
        if (r.ok) return r.json();
        throw new Error('Not authenticated');
      })
      .then((data) => {
        setUser(data.user);
        setAuthenticated(true);
      })
      .catch(() => {
        setAuthenticated(false);
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const logout = async () => {
    await fetch(`${import.meta.env.VITE_API_URL}/auth/logout`, {
      method: 'POST',
      credentials: 'include',
    });
    setUser(null);
    setAuthenticated(false);
    window.location.href = '/login';
  };

  return { user, loading, authenticated, logout };
}
