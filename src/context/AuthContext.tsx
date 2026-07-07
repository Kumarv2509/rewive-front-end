import { createContext, useContext, useState, useCallback, useMemo, type ReactNode } from 'react';
import { authService, type AuthResult } from '../api/auth';

interface AuthContextValue {
  token: string | null;
  userId: string | null;
  userName: string | null;
  clientRef: string | null;
  permissions: string[];
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function loadAuth(): AuthResult | null {
  try {
    const raw = localStorage.getItem('rewive_auth');
    if (!raw) return null;
    return JSON.parse(raw) as AuthResult;
  } catch {
    return null;
  }
}

function saveAuth(auth: AuthResult) {
  localStorage.setItem('rewive_auth', JSON.stringify(auth));
}

function clearAuth() {
  localStorage.removeItem('rewive_auth');
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [auth, setAuth] = useState<AuthResult | null>(loadAuth);

  const login = useCallback(async (username: string, password: string) => {
    const result = await authService.login(username, password);
    saveAuth(result);
    setAuth(result);
  }, []);

  const logout = useCallback(() => {
    clearAuth();
    setAuth(null);
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    token: auth?.token ?? null,
    userId: auth?.userId ?? null,
    userName: auth?.userName ?? null,
    clientRef: auth?.clientRef ?? null,
    permissions: auth?.permissions ?? [],
    isAuthenticated: auth !== null,
    login,
    logout,
  }), [auth, login, logout]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
