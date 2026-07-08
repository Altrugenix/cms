import { Link, useLocation } from "@tanstack/react-router";
import {
  LayoutDashboard,
  FileText,
  Image,
  Users,
  Shield,
  Settings,
  ChevronLeft,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const navItems = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/collections", label: "Collections", icon: FileText },
  { to: "/media", label: "Media", icon: Image },
  { to: "/users", label: "Users", icon: Users },
  { to: "/roles", label: "Roles", icon: Shield },
  { to: "/settings", label: "Settings", icon: Settings },
];

type SidebarProps = {
  collapsed: boolean;
  onToggle: () => void;
};

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const location = useLocation();

  return (
    <aside
      className={cn(
        "flex flex-col border-r bg-sidebar-background text-sidebar-foreground transition-all duration-200",
        collapsed ? "w-16" : "w-60",
      )}
    >
      <div className="flex h-14 items-center justify-between border-b border-sidebar-border px-4">
        {!collapsed && <span className="font-semibold tracking-tight">Altrugenix</span>}
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggle}
          className={cn(
            "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
            collapsed && "mx-auto",
          )}
        >
          <ChevronLeft className={cn("h-4 w-4 transition-transform", collapsed && "rotate-180")} />
        </Button>
      </div>
      <nav className="flex-1 space-y-1 p-2">
        {navItems.map((item) => {
          const isActive = location.pathname === item.to;
          return (
            <Link
              key={item.to}
              to={item.to}
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
      </nav>
    </aside>
  );
}
