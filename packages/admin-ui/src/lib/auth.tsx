import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";

import { useProvider } from "@/lib/providers";

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

function toUser(u: { uid: string; email: string | null; role?: string }): User {
  return { email: u.email ?? "", id: u.uid, role: u.role };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const provider = useProvider();
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
        const u = await provider.auth.getCurrentUser();
        if (u) {
          const mapped = toUser(u);
          setUser(mapped);
          const persistent = !!localStorage.getItem("cms_token");
          storageSet("cms_user", JSON.stringify(mapped), persistent);
        } else {
          logoutCleanup();
        }
      } catch {
        logoutCleanup();
      }
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

  const login = useCallback(
    async (email: string, password: string, rememberMe = false) => {
      setIsLoading(true);
      try {
        const u = await provider.auth.login(email, password);
        const mapped = toUser(u);
        setUser(mapped);
        // The provider handles token storage internally for REST mode.
        // For Firebase mode, tokens are managed by Firebase Auth.
        // We store a sentinel so isAuthenticated works.
        storageSet("cms_token", "firebase", rememberMe);
        setToken("firebase");
        storageSet("cms_user", JSON.stringify(mapped), rememberMe);
      } finally {
        setIsLoading(false);
      }
    },
    [provider],
  );

  const logout = useCallback(async () => {
    await provider.auth.logout();
    logoutCleanup();
  }, [provider]);

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
