import { Link, useLocation } from "@tanstack/react-router";
import {
  LayoutDashboard,
  FileText,
  Image,
  Settings,
  ChevronLeft,
  Globe,
  Layers,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { useCollections, useGlobals } from "@/lib/hooks";
import { cn } from "@/lib/utils";

const navItems = [
  { icon: LayoutDashboard, label: "Dashboard", to: "/" },
  { icon: FileText, label: "Collections", to: "/collections" },
  { icon: Globe, label: "Globals", to: "/globals" },
  { icon: Image, label: "Media", to: "/media" },
  { icon: Layers, label: "Schema Builder", to: "/schemas" },
  { icon: Settings, label: "Settings", to: "/settings" },
];

type SidebarProps = {
  collapsed: boolean;
  mobileOpen: boolean;
  onToggle: () => void;
  onMobileClose: () => void;
};

export function Sidebar({ collapsed, mobileOpen, onMobileClose, onToggle }: SidebarProps) {
  const location = useLocation();
  const { data: collections = [] } = useCollections();
  const { data: globals = [] } = useGlobals();

  return (
    <>
      {/* Mobile backdrop */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-overlay lg:hidden" onClick={onMobileClose} />
      )}

      <aside
        className={cn(
          "flex flex-col border-r bg-sidebar-background text-sidebar-foreground transition-all duration-200 overflow-hidden",
          "fixed inset-y-0 left-0 z-50 lg:static lg:z-auto",
          collapsed ? "w-16" : "w-60",
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
        )}
      >
        <div className="flex h-14 items-center justify-between border-b border-sidebar-border px-4">
          {!collapsed && <span className="font-semibold tracking-tight">Arche CMS</span>}
          <Button
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            variant="ghost"
            size="icon"
            onClick={() => {
              onToggle();
              onMobileClose();
            }}
            className={cn(
              "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
              collapsed && "mx-auto",
            )}
          >
            <ChevronLeft
              className={cn("h-4 w-4 transition-transform", collapsed && "rotate-180")}
            />
          </Button>
        </div>
        <nav aria-label="Main navigation" className="flex-1 space-y-1 overflow-y-auto p-2">
          {navItems.map((item) => {
            const isActive =
              item.to === "/" ? location.pathname === "/" : location.pathname.startsWith(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                  collapsed && "justify-center px-2",
                )}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                {!collapsed && <span>{item.label}</span>}
              </Link>
            );
          })}
          {!collapsed && collections.length > 0 && (
            <>
              <div className="px-3 pt-3 pb-1">
                <p className="text-xs font-medium text-sidebar-foreground/50 uppercase tracking-wider">
                  Content
                </p>
              </div>
              {collections.map((col) => {
                const isActive = location.pathname.includes(`/collections/${col.slug}`);
                return (
                  <Link
                    key={col.slug}
                    to="/collections/$slug"
                    params={{ slug: col.slug }}
                    aria-current={isActive ? "page" : undefined}
                    className={cn(
                      "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                      isActive
                        ? "bg-sidebar-accent text-sidebar-accent-foreground"
                        : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                    )}
                  >
                    <span className="h-2 w-2 rounded-full bg-sidebar-primary" />
                    <span>{col.label}</span>
                  </Link>
                );
              })}
              {globals.length > 0 && (
                <>
                  <div className="px-3 pt-3 pb-1">
                    <p className="text-xs font-medium text-sidebar-foreground/50 uppercase tracking-wider">
                      Globals
                    </p>
                  </div>
                  {globals.map((g) => {
                    const isActive = location.pathname.includes(`/globals/${g.slug}`);
                    return (
                      <Link
                        key={g.slug}
                        to="/globals/$slug"
                        params={{ slug: g.slug }}
                        aria-current={isActive ? "page" : undefined}
                        className={cn(
                          "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                          isActive
                            ? "bg-sidebar-accent text-sidebar-accent-foreground"
                            : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                        )}
                      >
                        <span className="h-2 w-2 rounded-full bg-sidebar-primary" />
                        <span>{g.label}</span>
                      </Link>
                    );
                  })}
                </>
              )}
            </>
          )}
        </nav>
      </aside>
    </>
  );
}
