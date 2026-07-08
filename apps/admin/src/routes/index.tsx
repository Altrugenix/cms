import { useEffect, useState } from "react";
import { createRoute, Link } from "@tanstack/react-router";
import { Route as rootRoute } from "@/routes/__root";
import { fetchCollections, fetchUsers, fetchMedia, apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Plus, Users, FileText, Database, Image } from "lucide-react";

export const Route = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: Dashboard,
});

type CollectionInfo = { slug: string; label: string; entryCount: number };

function Dashboard() {
  const [collections, setCollections] = useState<CollectionInfo[]>([]);
  const [userCount, setUserCount] = useState(0);
  const [mediaCount, setMediaCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const cols = await fetchCollections();
        const counts = await Promise.all(
          cols.map(async (c) => {
            try {
              const data = await apiFetch<{ total: number }>(`/api/${c.slug}`);
              return { slug: c.slug, label: c.label, entryCount: data.total };
            } catch {
              return { slug: c.slug, label: c.label, entryCount: 0 };
            }
          }),
        );
        if (cancelled) return;
        setCollections(counts);

        const [usersRes, mediaRes] = await Promise.all([fetchUsers(), fetchMedia()]);
        if (!cancelled) {
          setUserCount(usersRes.total);
          setMediaCount(mediaRes.total);
        }
      } catch {
        // silently ignore dashboard errors
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const totalEntries = collections.reduce((sum, c) => sum + c.entryCount, 0);

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
        <p className="text-muted-foreground">Welcome to Altrugenix CMS</p>
      </div>

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
    </div>
  );
}
