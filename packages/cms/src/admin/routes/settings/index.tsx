import { useEffect } from "react";
import { Outlet, createRoute, Link, useLocation, useNavigate } from "@tanstack/react-router";
import { Route as rootRoute } from "@/routes/__root";
import { cn } from "@/lib/utils";
import { Key, Puzzle, Webhook, Shield, Users } from "lucide-react";

const settingsNavItems = [
  { to: "/settings/api-tokens", label: "API Tokens", icon: Key },
  { to: "/settings/plugins", label: "Plugins", icon: Puzzle },
  { to: "/settings/webhooks", label: "Webhooks", icon: Webhook },
  { to: "/settings/roles", label: "Roles", icon: Shield },
  { to: "/settings/users", label: "Users", icon: Users },
];

export const Route = createRoute({
  getParentRoute: () => rootRoute,
  path: "/settings",
  component: SettingsLayout,
});

function SettingsLayout() {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (location.pathname === "/settings") {
      navigate({ to: "/settings/api-tokens", replace: true });
    }
  }, [location.pathname, navigate]);

  if (location.pathname === "/settings") return null;

  return (
    <div className="flex gap-8">
      <nav className="w-48 shrink-0 space-y-1">
        {settingsNavItems.map((item) => {
          const isActive =
            item.to === "/settings/api-tokens"
              ? location.pathname === item.to
              : location.pathname.startsWith(item.to);
          return (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
              )}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
      <div className="min-w-0 flex-1">
        <Outlet />
      </div>
    </div>
  );
}
