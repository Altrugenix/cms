import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";

type User = {
  id: string;
  email: string;
  role?: string;
};

type AuthState = {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
};

const AuthContext = createContext<AuthState | null>(null);

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    try {
      const stored = localStorage.getItem("cms_user");
      if (!stored) return null;
      const parsed = JSON.parse(stored) as User;
      return parsed && typeof parsed === "object" ? parsed : null;
    } catch {
      localStorage.removeItem("cms_user");
      return null;
    }
  });
  const [token, setToken] = useState<string | null>(() => localStorage.getItem("cms_token"));
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!token) {
      setIsLoading(false);
      return;
    }
    (async () => {
      try {
        const res = await fetch(`${API_URL}/api/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const u = (await res.json()) as User | null;
          if (u && typeof u === "object") {
            setUser(u);
            localStorage.setItem("cms_user", JSON.stringify(u));
          } else {
            logoutCleanup();
          }
          setIsLoading(false);
          return;
        }
      } catch {
        // token invalid, try refresh
      }
      const refreshToken = localStorage.getItem("cms_refresh");
      if (refreshToken) {
        try {
          const r = await fetch(`${API_URL}/api/auth/refresh`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ refreshToken }),
          });
          if (r.ok) {
            const data = (await r.json()) as {
              user: User;
              accessToken: string;
              refreshToken: string;
            };
            setUser(data.user);
            setToken(data.accessToken);
            localStorage.setItem("cms_user", JSON.stringify(data.user));
            localStorage.setItem("cms_token", data.accessToken);
            localStorage.setItem("cms_refresh", data.refreshToken);
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
    localStorage.removeItem("cms_user");
    localStorage.removeItem("cms_token");
    localStorage.removeItem("cms_refresh");
  }

  const login = useCallback(async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) {
        const err = (await res.json()) as { error?: string };
        throw new Error(err.error ?? "Login failed");
      }
      const data = (await res.json()) as { user: User; accessToken: string; refreshToken: string };
      setUser(data.user);
      setToken(data.accessToken);
      localStorage.setItem("cms_user", JSON.stringify(data.user));
      localStorage.setItem("cms_token", data.accessToken);
      localStorage.setItem("cms_refresh", data.refreshToken);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const register = useCallback(async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) {
        const err = (await res.json()) as { error?: string };
        throw new Error(err.error ?? "Registration failed");
      }
      const data = (await res.json()) as { user: User; accessToken: string; refreshToken: string };
      setUser(data.user);
      setToken(data.accessToken);
      localStorage.setItem("cms_user", JSON.stringify(data.user));
      localStorage.setItem("cms_token", data.accessToken);
      localStorage.setItem("cms_refresh", data.refreshToken);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    logoutCleanup();
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, token, isAuthenticated: !!user, login, register, logout, isLoading }}
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
