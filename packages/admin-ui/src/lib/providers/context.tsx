import { createContext, useContext, type ReactNode } from "react";

import type { AdminProvider } from "./types";

const ProviderContext = createContext<AdminProvider | null>(null);

export function Provider({ children, provider }: { children: ReactNode; provider: AdminProvider }) {
  return <ProviderContext.Provider value={provider}>{children}</ProviderContext.Provider>;
}

export function useProvider(): AdminProvider {
  const ctx = useContext(ProviderContext);
  if (!ctx) throw new Error("useProvider must be used within a Provider");
  return ctx;
}
