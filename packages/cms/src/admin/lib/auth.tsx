import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";

import { getApiUrl } from "@/lib/api";

type User = {
  id: string;
  email: string;
  role?: string;
};

type AuthState = {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (email: string, password: string, rememberMe?: boolean) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
};

const AuthContext = createContext<AuthState | null>(null);

function storageGet(key: string): string | null {
  return localStorage.getItem(key) ?? sessionStorage.getItem(key);
}

function storageSet(key: string, value: string, persistent: boolean) {
  const store = persistent ? localStorage : sessionStorage;
  store.setItem(key, value);
}

function storageRemove(key: string) {
  localStorage.removeItem(key);
  sessionStorage.removeItem(key);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    try {
      const stored = storageGet("cms_user");
      if (!stored) return null;
      const parsed = JSON.parse(stored) as User;
      return parsed && typeof parsed === "object" ? parsed : null;
    } catch {
      storageRemove("cms_user");
      return null;
    }
  });
  const [token, setToken] = useState<string | null>(() => storageGet("cms_token"));
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!token) {
      setIsLoading(false);
      return;
    }
    (async () => {
      try {
        const res = await fetch(`${getApiUrl()}/api/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const u = (await res.json()) as User | null;
          if (u && typeof u === "object") {
            setUser(u);
            const persistent = !!localStorage.getItem("cms_token");
            storageSet("cms_user", JSON.stringify(u), persistent);
          } else {
            logoutCleanup();
          }
          setIsLoading(false);
          return;
        }
      } catch {
        // token invalid, try refresh
      }
      const refreshToken = storageGet("cms_refresh");
      if (refreshToken) {
        try {
          const r = await fetch(`${getApiUrl()}/api/auth/refresh`, {
            body: JSON.stringify({ refreshToken }),
            headers: { "Content-Type": "application/json" },
            method: "POST",
          });
          if (r.ok) {
            const data = (await r.json()) as {
              user: User;
              accessToken: string;
              refreshToken: string;
            };
            const persistent = !!localStorage.getItem("cms_token");
            setUser(data.user);
            setToken(data.accessToken);
            storageSet("cms_user", JSON.stringify(data.user), persistent);
            storageSet("cms_token", data.accessToken, persistent);
            storageSet("cms_refresh", data.refreshToken, persistent);
            setIsLoading(false);
            return;
          }
        } catch {
          // refresh failed
        }
      }
      logoutCleanup();
      setIsLoading(false);
    })();
  }, []);

  function logoutCleanup() {
    setUser(null);
    setToken(null);
    storageRemove("cms_user");
    storageRemove("cms_token");
    storageRemove("cms_refresh");
  }

  const login = useCallback(async (email: string, password: string, rememberMe = false) => {
    setIsLoading(true);
    try {
      const res = await fetch(`${getApiUrl()}/api/auth/login`, {
        body: JSON.stringify({ email, password, rememberMe }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      if (!res.ok) {
        const err = (await res.json()) as { error?: string };
        throw new Error(err.error ?? "Login failed");
      }
      const data = (await res.json()) as {
        user: User;
        accessToken: string;
        refreshToken: string;
      };
      setUser(data.user);
      setToken(data.accessToken);
      storageSet("cms_user", JSON.stringify(data.user), rememberMe);
      storageSet("cms_token", data.accessToken, rememberMe);
      storageSet("cms_refresh", data.refreshToken, rememberMe);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    logoutCleanup();
  }, []);

  return (
    <AuthContext.Provider
      value={{ isAuthenticated: !!user, isLoading, login, logout, token, user }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
