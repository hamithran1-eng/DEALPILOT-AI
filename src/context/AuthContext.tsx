import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Workspace } from '../types';
import { api, authStorage } from '../api/client';

interface AuthContextType {
  user: User | null;
  workspace: Workspace | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string, workspaceName?: string) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchCurrentUser = async () => {
    const token = authStorage.getToken();
    if (!token) {
      setUser(null);
      setWorkspace(null);
      setLoading(false);
      return;
    }

    try {
      const data = await api.getMe();
      setUser(data.user);
      setWorkspace(data.workspace);
    } catch (err) {
      console.warn('Session expired or invalid, clearing token:', err);
      authStorage.clearToken();
      setUser(null);
      setWorkspace(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCurrentUser();
  }, []);

  const login = async (email: string, password: string) => {
    setLoading(true);
    try {
      const res = await api.login({ email, password });
      authStorage.setToken(res.token);
      setUser(res.user);
      setWorkspace(res.workspace);
    } finally {
      setLoading(false);
    }
  };

  const register = async (email: string, password: string, name: string, workspaceName?: string) => {
    setLoading(true);
    try {
      const res = await api.register({ email, password, name, workspaceName });
      authStorage.setToken(res.token);
      setUser(res.user);
      setWorkspace(res.workspace);
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await api.logout();
    } catch (err) {
      // ignore
    } finally {
      authStorage.clearToken();
      setUser(null);
      setWorkspace(null);
    }
  };

  const refresh = async () => {
    await fetchCurrentUser();
  };

  return (
    <AuthContext.Provider value={{ user, workspace, loading, login, register, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
};
