import { useState, useEffect, useCallback } from 'react';
import api from '../lib/api.js';
import { navigate } from '../lib/router.js';

export function useAuth() {
  const [customer, setCustomer] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (api.getToken()) {
      api.getProfile()
        .then(data => setCustomer(data))
        .catch(() => { api.logout(); })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = useCallback(async (loginStr, password) => {
    const data = await api.login(loginStr, password);
    setCustomer(data.customer);
    return data;
  }, []);

  const register = useCallback(async (email, username, password) => {
    const data = await api.register(email, username, password);
    setCustomer(data.customer);
    return data;
  }, []);

  const logout = useCallback((redirectPath = '/') => {
    api.logout();
    setCustomer(null);
    navigate(redirectPath);
  }, []);

  const refresh = useCallback(async () => {
    const data = await api.getProfile();
    setCustomer(data);
  }, []);

  return { customer, loading, login, register, logout, refresh };
}
