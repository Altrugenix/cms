import { createRoute, Link } from "@tanstack/react-router";
import { Settings, ArrowRight } from "lucide-react";

import { Skeleton } from "@/components/ui/skeleton";
import { useGlobals } from "@/lib/hooks";
import { Route as rootRoute } from "@/routes/__root";

export const Route = createRoute({
  component: GlobalsList,
  getParentRoute: () => rootRoute,
  path: "/globals",
});

function GlobalsList() {
  const { data: globals = [], error, isLoading: loading } = useGlobals();

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-9 w-32" />
          <Skeleton className="mt-1 h-5 w-48" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-lg border p-5">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <Skeleton className="h-5 w-28" />
                  <Skeleton className="h-4 w-16" />
                </div>
                <Skeleton className="h-4 w-4" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return <div className="rounded-md bg-destructive/10 p-4 text-destructive">{error}</div>;
  }

  if (globals.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-lg border p-12 text-center">
        <Settings className="h-8 w-8 text-muted-foreground" />
        <p className="text-lg text-muted-foreground">No globals defined</p>
        <p className="text-sm text-muted-foreground">
          Create a global schema file in <code>cms/globals/</code> to get started.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Globals</h1>
        <p className="text-muted-foreground">Singleton content settings</p>
      </div>

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {globals.map((g) => (
          <Link
            key={g.slug}
            to="/globals/$slug"
            params={{ slug: g.slug }}
            className="group rounded-lg border p-5 transition-colors hover:bg-accent"
          >
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-semibold">{g.label}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{g.fields.length} fields</p>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
