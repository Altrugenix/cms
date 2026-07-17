import { createRoute, Link } from "@tanstack/react-router";
import { Route as rootRoute } from "@/routes/__root";
import { type ActivityEntry } from "@/lib/api";
import { useCollections, useDashboardData } from "@/lib/hooks";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/skeleton";
import { Plus, Users, FileText, Database, Image, Clock, Trash2, Pencil, Check } from "lucide-react";

export const Route = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: Dashboard,
});

type CollectionInfo = { slug: string; label: string; entryCount: number };

const ACTION_ICONS: Record<string, typeof Plus> = {
  create: Plus,
  update: Pencil,
  delete: Trash2,
  bulkDelete: Trash2,
  upsert: Check,
};

const ACTION_LABELS: Record<string, string> = {
  create: "Created",
  update: "Updated",
  delete: "Deleted",
  bulkDelete: "Bulk deleted",
  upsert: "Updated",
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function RecentActivity({ loading, activity }: { loading: boolean; activity: ActivityEntry[] }) {
  return (
    <div className="rounded-lg border">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <h2 className="font-semibold">Recent Activity</h2>
        </div>
      </div>
      <div className="divide-y">
        {loading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-3">
              <Skeleton className="h-6 w-6 rounded-full" />
              <div className="flex-1 space-y-1">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-3 w-20" />
              </div>
              <Skeleton className="h-3 w-12" />
            </div>
          ))
        ) : activity.length === 0 ? (
          <p className="p-4 text-sm text-muted-foreground">No recent activity</p>
        ) : (
          activity.map((entry) => {
            const Icon = ACTION_ICONS[entry.action] ?? Plus;
            return (
              <div key={entry.id} className="flex items-center gap-3 px-4 py-3">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10">
                  <Icon className="h-3 w-3 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="truncate text-sm">
                    <span className="font-medium">
                      {ACTION_LABELS[entry.action] ?? entry.action}
                    </span>{" "}
                    {entry.collection}{" "}
                    {entry.label && <span className="text-muted-foreground">"{entry.label}"</span>}
                  </p>
                  <p className="text-xs text-muted-foreground capitalize">{entry.collection}</p>
                </div>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {timeAgo(entry.createdAt)}
                </span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

function Dashboard() {
  const { data: colMetas = [] } = useCollections();
  const colSlugs = colMetas.map((c: { slug: string }) => c.slug);
  const { data: dashData, isLoading: loading, error: dashError } = useDashboardData(colSlugs);

  const collections: CollectionInfo[] = colMetas.map((c: { slug: string; label: string }) => {
    const count = dashData?.counts.find((cnt: { slug: string }) => cnt.slug === c.slug);
    return { slug: c.slug, label: c.label, entryCount: count?.entryCount ?? 0 };
  });

  const userCount = dashData?.usersRes.total ?? 0;
  const mediaCount = dashData?.mediaRes.total ?? 0;
  const activity: ActivityEntry[] = dashData?.activityRes.data ?? [];

  const totalEntries = collections.reduce(
    (sum: number, c: CollectionInfo) => sum + c.entryCount,
    0,
  );

  const stats = [
    { label: "Collections", value: collections.length, icon: Database },
    { label: "Entries", value: totalEntries, icon: FileText },
    { label: "Media", value: mediaCount, icon: Image },
    { label: "Users", value: userCount, icon: Users },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Dashboard</h1>
        <p className="text-muted-foreground">Welcome to Arche CMS</p>
      </div>

      {dashError && (
        <div className="rounded-md bg-destructive/10 p-4 text-destructive">{dashError.message}</div>
      )}

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-lg border p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">{s.label}</p>
              <s.icon className="h-4 w-4 text-muted-foreground" />
            </div>
            {loading ? (
              <p className="mt-1 text-sm text-muted-foreground">...</p>
            ) : (
              <p className="mt-1 text-2xl font-bold">{s.value}</p>
            )}
          </div>
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-lg border">
          <div className="flex items-center justify-between border-b px-4 py-3">
            <h2 className="font-semibold">Recent Collections</h2>
            <Link to="/collections">
              <Button variant="ghost" size="sm">
                View all
              </Button>
            </Link>
          </div>
          <div className="divide-y">
            {collections.length === 0 ? (
              <p className="p-4 text-sm text-muted-foreground">
                {loading ? "Loading..." : "No collections yet"}
              </p>
            ) : (
              collections.map((c) => (
                <Link
                  key={c.slug}
                  to="/collections/$slug"
                  params={{ slug: c.slug }}
                  className="flex items-center justify-between px-4 py-3 hover:bg-muted/50"
                >
                  <span className="text-sm font-medium">{c.label}</span>
                  <span className="text-sm text-muted-foreground">{c.entryCount} entries</span>
                </Link>
              ))
            )}
          </div>
        </div>

        <div className="rounded-lg border">
          <div className="flex items-center justify-between border-b px-4 py-3">
            <h2 className="font-semibold">Quick Actions</h2>
          </div>
          <div className="space-y-2 p-4">
            {collections.length > 0 ? (
              collections.slice(0, 3).map((c) => (
                <Link key={c.slug} to="/collections/$slug/new" params={{ slug: c.slug }}>
                  <Button variant="outline" className="w-full justify-start">
                    <Plus className="mr-2 h-4 w-4" />
                    New {c.label}
                  </Button>
                </Link>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">
                {loading ? "Loading..." : "Create a collection to get started"}
              </p>
            )}
          </div>
        </div>
      </div>

      <RecentActivity loading={loading && activity.length === 0} activity={activity} />
    </div>
  );
}
