import { Outlet, createRootRoute, useNavigate, useLocation } from "@tanstack/react-router";
import { useState, useEffect } from "react";

import { CommandPalette, useCommandPalette } from "@/components/command-palette";
import { ErrorBoundary } from "@/components/error-boundary";
import { Header } from "@/components/header";
import { Sidebar } from "@/components/sidebar";
import { ToastProvider } from "@/components/toast-provider";
import { useAuth } from "@/lib/auth";

export const Route = createRootRoute({
  component: RootLayout,
});

const PUBLIC_PATHS = ["/login", "/forgot-password", "/reset-password"];

function RootLayout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [sidebarMobile, setSidebarMobile] = useState(false);
  const { isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const palette = useCommandPalette();

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        palette.toggle();
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [palette]);

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated && !PUBLIC_PATHS.includes(location.pathname)) {
      navigate({ to: "/login" });
    }
  }, [isAuthenticated, isLoading, navigate, location.pathname]);

  if (isLoading) {
    return (
      <ToastProvider>
        <div className="flex h-screen items-center justify-center">
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
      </ToastProvider>
    );
  }

  if (!isAuthenticated && !PUBLIC_PATHS.includes(location.pathname)) {
    return null;
  }

  if (!isAuthenticated) {
    return (
      <ToastProvider>
        <main className="min-h-screen">
          <ErrorBoundary>
            <Outlet />
          </ErrorBoundary>
        </main>
      </ToastProvider>
    );
  }

  return (
    <ToastProvider>
      <div className="flex h-screen overflow-hidden">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:z-[100] focus:bg-background focus:px-4 focus:py-2 focus:text-sm focus:shadow-lg"
        >
          Skip to content
        </a>
        <Sidebar
          collapsed={sidebarCollapsed}
          mobileOpen={sidebarMobile}
          onToggle={() => setSidebarCollapsed((prev) => !prev)}
          onMobileClose={() => setSidebarMobile(false)}
        />
        <div className="flex flex-1 flex-col overflow-hidden">
          <Header
            onOpenPalette={palette.openPalette}
            onToggleSidebar={() => setSidebarMobile((prev) => !prev)}
          />
          <main id="main-content" className="flex-1 overflow-y-auto p-4 md:p-6">
            <ErrorBoundary>
              <Outlet />
            </ErrorBoundary>
          </main>
        </div>
      </div>
      <CommandPalette open={palette.open} onClose={palette.closePalette} />
    </ToastProvider>
  );
}
