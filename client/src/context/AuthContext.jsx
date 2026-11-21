import { createContext, useContext, useEffect, useState } from 'react';
import { api, tokenStore } from '../api/client.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!tokenStore.get()) { setLoading(false); return; }
    api.get('/auth/me')
      .then(setUser)
      .catch(() => tokenStore.clear())
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const onLogout = () => setUser(null);
    window.addEventListener('ct-logout', onLogout);
    return () => window.removeEventListener('ct-logout', onLogout);
  }, []);

  const login = async (email, password) => {
    const { token, user: u } = await api.post('/auth/login', { email, password });
    tokenStore.set(token);
    setUser(u);
    return u;
  };

  const register = async (name, email, password) => {
    const { token, user: u } = await api.post('/auth/register', { name, email, password });
    tokenStore.set(token);
    setUser(u);
    return u;
  };

  const logout = () => { tokenStore.clear(); setUser(null); };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
