import { createRoute } from "@tanstack/react-router";
import { Puzzle } from "lucide-react";

import { Skeleton } from "@/components/ui/skeleton";
import { type PluginMeta } from "@/lib/api";
import { firebaseModeGuard } from "@/lib/firebase-mode-guard";
import { usePluginsList } from "@/lib/hooks";
import { Route as settingsRoute } from "@/routes/settings/index";

export const Route = createRoute({
  beforeLoad: firebaseModeGuard({ to: "/settings/users" }),
  component: PluginsPage,
  getParentRoute: () => settingsRoute,
  path: "plugins",
});

function PluginsPage() {
  const { data: pluginsData, error, isLoading: loading } = usePluginsList();
  const plugins: PluginMeta[] = (pluginsData?.data ?? []).filter(
    (p): p is PluginMeta => p != null && p.plugin != null,
  );
  const total = plugins.length;

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-9 w-24" />
          <Skeleton className="mt-1 h-5 w-20" />
        </div>
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-lg border p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-8 w-8 rounded" />
                  <div>
                    <Skeleton className="h-5 w-28" />
                    <Skeleton className="mt-1 h-4 w-40" />
                  </div>
                </div>
                <Skeleton className="h-6 w-16 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
          <Puzzle className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Plugins</h1>
          <p className="text-muted-foreground">
            {total} plugin{total === 1 ? "" : "s"} installed
          </p>
        </div>
      </div>

      {error && (
        <div className="rounded-md bg-destructive/10 p-4 text-destructive">{error.message}</div>
      )}

      {plugins.length === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-lg border p-12 text-center">
          <Puzzle className="h-8 w-8 text-muted-foreground" />
          <p className="text-lg text-muted-foreground">No plugins installed</p>
          <p className="text-sm text-muted-foreground">
            Install plugins via npm and they will appear here automatically.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {plugins.map((p) => (
            <div
              key={p.plugin.slug}
              className="flex items-center justify-between rounded-lg border p-4"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded bg-secondary">
                  <Puzzle className="h-4 w-4 text-muted-foreground" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{p.plugin.name}</span>
                    {p.plugin.version && (
                      <span className="text-xs text-muted-foreground">v{p.plugin.version}</span>
                    )}
                  </div>
                  {p.plugin.description && (
                    <p className="text-sm text-muted-foreground">{p.plugin.description}</p>
                  )}
                  <p className="text-xs text-muted-foreground">@{p.plugin.slug}</p>
                </div>
              </div>
              <span
                role="status"
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${
                  p.enabled ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"
                }`}
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    p.enabled ? "bg-success" : "bg-muted-foreground"
                  }`}
                />
                {p.enabled ? "Enabled" : "Disabled"}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
