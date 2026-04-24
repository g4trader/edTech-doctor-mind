"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { ReactNode } from "react";
import {
  apiJson,
  clearStoredToken,
  getStoredToken,
  setStoredToken,
} from "@/lib/api";

type User = {
  id: string;
  full_name: string;
  email: string;
  is_admin: boolean;
  created_at: string;
};

type Subscription = {
  id: string;
  status: string;
  started_at: string;
  ends_at: string | null;
  plan: {
    id: string;
    code: string;
    name: string;
    description: string | null;
    price_cents: number;
    billing_cycle: string;
  };
};

type AuthResponse = {
  token: string;
  user: User;
  subscription: Subscription | null;
};

type MeResponse = {
  user: User;
  subscription: Subscription | null;
};

type RegisterInput = {
  full_name: string;
  email: string;
  password: string;
};

type LoginInput = {
  email: string;
  password: string;
};

type AuthContextValue = {
  ready: boolean;
  user: User | null;
  subscription: Subscription | null;
  login: (input: LoginInput) => Promise<void>;
  register: (input: RegisterInput) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);

  const applySession = useCallback(
    (payload: { user: User; subscription: Subscription | null }) => {
      setUser(payload.user);
      setSubscription(payload.subscription);
    },
    [],
  );

  const clearSession = useCallback(() => {
    clearStoredToken();
    setUser(null);
    setSubscription(null);
  }, []);

  const refresh = useCallback(async () => {
    const token = getStoredToken();
    if (!token) {
      clearSession();
      setReady(true);
      return;
    }
    try {
      const data = await apiJson<MeResponse>("/api/auth/me", { token });
      applySession(data);
    } catch {
      clearSession();
    } finally {
      setReady(true);
    }
  }, [applySession, clearSession]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const login = useCallback(async (input: LoginInput) => {
    const data = await apiJson<AuthResponse>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify(input),
      token: null,
    });
    setStoredToken(data.token);
    applySession(data);
    setReady(true);
  }, [applySession]);

  const register = useCallback(async (input: RegisterInput) => {
    const data = await apiJson<AuthResponse>("/api/auth/register", {
      method: "POST",
      body: JSON.stringify(input),
      token: null,
    });
    setStoredToken(data.token);
    applySession(data);
    setReady(true);
  }, [applySession]);

  const logout = useCallback(async () => {
    const token = getStoredToken();
    try {
      if (token) {
        await apiJson("/api/auth/logout", {
          method: "POST",
          token,
        });
      }
    } catch {
      // Ignore logout transport errors and clear local session anyway.
    } finally {
      clearSession();
      setReady(true);
    }
  }, [clearSession]);

  const value = useMemo(
    () => ({
      ready,
      user,
      subscription,
      login,
      register,
      logout,
      refresh,
    }),
    [ready, user, subscription],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) {
    throw new Error("useAuth precisa estar dentro de AuthProvider.");
  }
  return value;
}
