import { useEffect, useState } from "react";
import { createRoute, Link, useParams } from "@tanstack/react-router";
import { Route as rootRoute } from "@/routes/__root";
import { Skeleton } from "@/components/skeleton";
import { useToast } from "@/components/toast-provider";
import { fetchCollections, apiFetch, type CollectionMeta } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Plus, Pencil, Trash2 } from "lucide-react";

export const Route = createRoute({
  getParentRoute: () => rootRoute,
  path: "/collections/$slug",
  component: CollectionEntries,
});

type Entry = Record<string, unknown> & { id: string };

function CollectionEntries() {
  const { slug } = useParams({ from: Route.id });
  const { toast } = useToast();
  const [collection, setCollection] = useState<CollectionMeta | null>(null);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const cols = await fetchCollections();
        const col = cols.find((c) => c.slug === slug);
        if (!col) throw new Error(`Collection "${slug}" not found`);
        if (cancelled) return;
        setCollection(col);

        const data = await apiFetch<{ data: Entry[]; total: number }>(`/api/${slug}`);
        if (cancelled) return;
        setEntries(data.data);
        setTotal(data.total);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load entries");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  const handleDelete = async (id: string) => {
    try {
      await apiFetch(`/api/${slug}/${id}`, { method: "DELETE" });
      setEntries((prev) => prev.filter((e) => e.id !== id));
      setTotal((prev) => prev - 1);
      toast("Entry deleted", "success");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Failed to delete entry", "error");
    }
  };

  const handleBulkDelete = async () => {
    const ids = Array.from(selected);
    if (ids.length === 0) return;
    setDeleting(true);
    try {
      await apiFetch(`/api/${slug}/bulk-delete`, {
        method: "POST",
        body: JSON.stringify({ ids }),
      });
      setEntries((prev) => prev.filter((e) => !ids.includes(e.id)));
      setTotal((prev) => prev - ids.length);
      setSelected(new Set());
      setConfirmDelete(false);
      toast(`Deleted ${ids.length} entr${ids.length === 1 ? "y" : "ies"}`, "success");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Failed to delete entries", "error");
    } finally {
      setDeleting(false);
    }
  };

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selected.size === entries.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(entries.map((e) => e.id)));
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Skeleton className="h-5 w-5" />
            <div>
              <Skeleton className="h-9 w-40" />
              <Skeleton className="mt-1 h-5 w-20" />
            </div>
          </div>
          <Skeleton className="h-10 w-36 rounded-md" />
        </div>
        <div className="rounded-lg border">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                {Array.from({ length: 5 }).map((_, i) => (
                  <th key={i} className="px-4 py-3">
                    <Skeleton className="h-4 w-16" />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-b">
                  {Array.from({ length: 5 }).map((_, j) => (
                    <td key={j} className="px-4 py-3">
                      <Skeleton className={`h-4 ${j === 0 ? "w-4" : "w-24"}`} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <Link
          to="/collections"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Back to collections
        </Link>
        <div className="rounded-md bg-destructive/10 p-4 text-destructive">{error}</div>
      </div>
    );
  }

  if (!collection) return null;

  const displayFields = collection.fields.slice(0, 4);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/collections" className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{collection.label}</h1>
            <p className="text-muted-foreground">
              {total} entr{total === 1 ? "y" : "ies"}
            </p>
          </div>
        </div>
        <Link to="/collections/$slug/new" params={{ slug }}>
          <Button>
            <Plus className="mr-2 h-4 w-4" /> Create New
          </Button>
        </Link>
      </div>

      {entries.length === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-lg border p-12 text-center">
          <p className="text-lg text-muted-foreground">No entries yet</p>
          <Link to="/collections/$slug/new" params={{ slug }}>
            <Button variant="outline">
              <Plus className="mr-2 h-4 w-4" /> Create your first entry
            </Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {selected.size > 0 && (
            <div className="flex items-center gap-3">
              <p className="text-sm text-muted-foreground">{selected.size} selected</p>
              <Button variant="destructive" size="sm" onClick={() => setConfirmDelete(true)}>
                <Trash2 className="mr-1.5 h-4 w-4" /> Delete Selected
              </Button>
            </div>
          )}

          <div className="rounded-lg border">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="w-10 px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selected.size === entries.length && entries.length > 0}
                      onChange={toggleSelectAll}
                      className="h-4 w-4 rounded border-input text-primary focus:ring-primary"
                    />
                  </th>
                  {displayFields.map((f) => (
                    <th
                      key={f.name}
                      className="px-4 py-3 text-left text-sm font-medium text-muted-foreground"
                    >
                      {f.label}
                    </th>
                  ))}
                  <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => (
                  <tr key={entry.id} className="border-b last:border-0 hover:bg-muted/50">
                    <td className="w-10 px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selected.has(entry.id)}
                        onChange={() => toggleSelect(entry.id)}
                        className="h-4 w-4 rounded border-input text-primary focus:ring-primary"
                      />
                    </td>
                    {displayFields.map((f) => (
                      <td key={f.name} className="px-4 py-3 text-sm">
                        {formatValue(entry[f.name])}
                      </td>
                    ))}
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Link to="/collections/$slug/$id" params={{ slug, id: entry.id }}>
                          <Button variant="ghost" size="icon">
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </Link>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(entry.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-lg border bg-background p-6 shadow-lg">
            <h2 className="text-lg font-semibold">
              Delete {selected.size} entr{selected.size === 1 ? "y" : "ies"}?
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">This action cannot be undone.</p>
            <div className="mt-4 flex items-center justify-end gap-2">
              <Button variant="outline" onClick={() => setConfirmDelete(false)} disabled={deleting}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleBulkDelete} disabled={deleting}>
                {deleting ? "Deleting..." : "Delete"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function formatValue(val: unknown): string {
  if (val === null || val === undefined) return "—";
  if (typeof val === "boolean") return val ? "Yes" : "No";
  if (typeof val === "object") return JSON.stringify(val);
  return String(val);
}
