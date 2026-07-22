import { createRoute, Link } from "@tanstack/react-router";
import { FileText, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useCollections, useCollectionEntryCounts } from "@/lib/hooks";
import { Route as rootRoute } from "@/routes/__root";

export const Route = createRoute({
  component: CollectionsList,
  getParentRoute: () => rootRoute,
  path: "/collections",
});

function CollectionsList() {
  const { data: collections = [], error, isLoading: loading } = useCollections();
  const slugs = collections.map((c) => c.slug);
  const { data: counts = {} } = useCollectionEntryCounts(slugs);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Skeleton className="h-9 w-48" />
            <Skeleton className="mt-1 h-5 w-32" />
          </div>
        </div>
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-lg border p-4">
              <div className="flex items-start gap-3">
                <Skeleton className="h-5 w-5 rounded" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="h-4 w-20" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-md bg-destructive/10 p-4 text-destructive">
        {error instanceof Error ? error.message : "Failed to load collections"}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Collections</h1>
          <p className="text-muted-foreground">Manage your content types</p>
        </div>
        <Link to="/schemas/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Create Collection
          </Button>
        </Link>
      </div>
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {collections.length === 0 ? (
          <div className="col-span-full flex flex-col items-center gap-4 rounded-lg border border-dashed p-12 text-center">
            <FileText className="h-10 w-10 text-muted-foreground/50" />
            <div>
              <p className="text-lg font-medium">No collections yet</p>
              <p className="text-sm text-muted-foreground">
                Create your first collection to get started.
              </p>
            </div>
            <Link to="/schemas/new">
              <Button size="sm">
                <Plus className="mr-2 h-4 w-4" />
                Create Collection
              </Button>
            </Link>
          </div>
        ) : (
          collections.map((col) => (
            <Link
              key={col.slug}
              to="/collections/$slug"
              params={{ slug: col.slug }}
              className="group rounded-lg border p-4 transition-colors hover:bg-accent"
            >
              <div className="flex items-start gap-3">
                <FileText className="mt-1 h-5 w-5 text-muted-foreground" />
                <div>
                  <h3 className="font-semibold">{col.label}</h3>
                  <p className="text-sm text-muted-foreground">
                    {counts[col.slug] ?? 0} entry{(counts[col.slug] ?? 0) !== 1 ? "s" : ""} ·{" "}
                    {col.fields.length} field{col.fields.length !== 1 ? "s" : ""}
                  </p>
                </div>
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
