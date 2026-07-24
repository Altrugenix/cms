import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "@tanstack/react-router";
import { StrictMode, useState, useEffect } from "react";
import ReactDOM from "react-dom/client";

import { ThemeProvider } from "@/components/theme-provider";
import { AuthProvider } from "@/lib/auth";
import { getBackendMode } from "@/lib/backend-mode";
import { Provider, type AdminProvider } from "@/lib/providers";
import { getRegisteredProvider } from "@/lib/providers/registry";
import { createRestProvider } from "@/lib/providers/rest";
import { router } from "@/router";
import "@/index.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 30_000,
    },
  },
});

function ProviderShell({ children }: { children: React.ReactNode }) {
  const [provider, setProvider] = useState<AdminProvider | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const mode = getBackendMode();
    if (mode === "firebase") {
      const registered = getRegisteredProvider();
      if (registered) {
        setProvider(registered);
      } else {
        setError(
          "Firebase mode requires the consuming app to register a provider via registerProvider() before rendering.",
        );
      }
    } else {
      setProvider(createRestProvider());
    }
  }, []);

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="rounded-md bg-destructive/10 p-4 text-destructive">{error}</div>
      </div>
    );
  }

  if (!provider) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <svg
          className="h-8 w-8 animate-spin text-primary"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      </div>
    );
  }

  return <Provider provider={provider}>{children}</Provider>;
}

const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("Root element not found");

ReactDOM.createRoot(rootElement).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="dark" storageKey="cms-theme">
        <ProviderShell>
          <AuthProvider>
            <RouterProvider router={router} />
          </AuthProvider>
        </ProviderShell>
      </ThemeProvider>
    </QueryClientProvider>
  </StrictMode>,
);
