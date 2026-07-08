import { useState } from "react";
import { Outlet, createRootRoute } from "@tanstack/react-router";
import { Sidebar } from "@/components/sidebar";
import { Header } from "@/components/header";

export const Route = createRootRoute({
  component: RootLayout,
});

function RootLayout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed((prev) => !prev)} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
