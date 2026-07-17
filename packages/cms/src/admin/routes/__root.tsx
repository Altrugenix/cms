import { useState, useEffect } from "react";
import { Outlet, createRootRoute, useNavigate, useLocation } from "@tanstack/react-router";
import { Sidebar } from "@/components/sidebar";
import { Header } from "@/components/header";
import { ToastProvider } from "@/components/toast-provider";
import { ErrorBoundary } from "@/components/error-boundary";
import { CommandPalette, useCommandPalette } from "@/components/command-palette";
import { useAuth } from "@/lib/auth";

export const Route = createRootRoute({
  component: RootLayout,
});

const PUBLIC_PATHS = ["/login", "/register", "/forgot-password"];

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
          <p className="text-muted-foreground">Loading...</p>
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
          <main className="flex-1 overflow-y-auto p-4 md:p-6">
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
