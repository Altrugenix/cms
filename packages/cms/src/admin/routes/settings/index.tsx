import { Outlet, createRoute, Link, useLocation, useNavigate } from "@tanstack/react-router";
import { Key, Puzzle, Webhook, Shield, Users } from "lucide-react";
import { useEffect } from "react";

import { cn } from "@/lib/utils";
import { Route as rootRoute } from "@/routes/__root";

const settingsNavItems = [
  { icon: Key, label: "API Tokens", to: "/settings/api-tokens" },
  { icon: Puzzle, label: "Plugins", to: "/settings/plugins" },
  { icon: Webhook, label: "Webhooks", to: "/settings/webhooks" },
  { icon: Shield, label: "Roles", to: "/settings/roles" },
  { icon: Users, label: "Users", to: "/settings/users" },
];

export const Route = createRoute({
  component: SettingsLayout,
  getParentRoute: () => rootRoute,
  path: "/settings",
});

function SettingsLayout() {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (location.pathname === "/settings") {
      navigate({ replace: true, to: "/settings/api-tokens" });
    }
  }, [location.pathname, navigate]);

  if (location.pathname === "/settings") return null;

  return (
    <div className="flex flex-col lg:flex-row gap-8">
      <nav className="w-full lg:w-48 shrink-0 space-y-1" aria-label="Settings">
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
