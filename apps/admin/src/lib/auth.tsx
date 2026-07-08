import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

type User = {
  id: string;
  email: string;
  role?: string;
};

type AuthState = {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
};

const AuthContext = createContext<AuthState | null>(null);

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    const stored = localStorage.getItem("cms_user");
    return stored ? (JSON.parse(stored) as User) : null;
  });
  const [token, setToken] = useState<string | null>(() => localStorage.getItem("cms_token"));
  const [isLoading, setIsLoading] = useState(false);

  const login = useCallback(async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) {
        const err = (await res.json()) as { message?: string };
        throw new Error(err.message ?? "Login failed");
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
        const err = (await res.json()) as { message?: string };
        throw new Error(err.message ?? "Registration failed");
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
    setUser(null);
    setToken(null);
    localStorage.removeItem("cms_user");
    localStorage.removeItem("cms_token");
    localStorage.removeItem("cms_refresh");
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, login, register, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
