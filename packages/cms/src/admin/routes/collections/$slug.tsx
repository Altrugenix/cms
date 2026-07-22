import { createRoute, Link, useParams } from "@tanstack/react-router";
import { ArrowLeft, Plus, Trash2, CheckCircle, Send, Undo2 } from "lucide-react";
import { useState } from "react";

import { ConfirmDialog } from "@/components/confirm-dialog";
import { EntryActions } from "@/components/entry-actions";
import { LocaleSelector } from "@/components/locale-selector";
import { useToast } from "@/components/toast-provider";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useCollection,
  useEntries,
  useDeleteEntry,
  useBulkDelete,
  useBulkPublish,
  useBulkUnpublish,
  usePublishEntry,
  useUnpublishEntry,
  useRestoreEntry,
} from "@/lib/hooks";
import { Route as rootRoute } from "@/routes/__root";

export const Route = createRoute({
  component: CollectionEntries,
  getParentRoute: () => rootRoute,
  path: "/collections/$slug",
});

type Entry = Record<string, unknown> & { id: string };

// fallow-ignore-next-line complexity
function CollectionEntries() {
  const { slug } = useParams({ from: Route.id });
  const { toast } = useToast();
  const { collection, isLoading: colLoading } = useCollection(slug);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [showDeleted, setShowDeleted] = useState(false);
  const [locale, setLocale] = useState("en");

  const searchParams: Record<string, string> = { locale };
  if (showDeleted) searchParams.deleted = "true";

  const { data: entriesData, error, isLoading: loading } = useEntries(slug, searchParams);
  const entries: Entry[] = (entriesData?.data ?? []) as Entry[];
  const total = entriesData?.total ?? 0;
  const deleteEntry = useDeleteEntry(slug);
  const bulkDelete = useBulkDelete(slug);
  const bulkPublish = useBulkPublish(slug);
  const bulkUnpublish = useBulkUnpublish(slug);
  const publishEntry = usePublishEntry(slug);
  const unpublishEntry = useUnpublishEntry(slug);
  const restoreEntry = useRestoreEntry(slug);

  const handleDelete = (id: string) => {
    setConfirmDeleteId(id);
  };

  const handleConfirmDelete = async () => {
    if (!confirmDeleteId) return;
    try {
      await deleteEntry.mutateAsync(confirmDeleteId);
      setConfirmDeleteId(null);
      toast("Entry deleted", "success");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Failed to delete entry", "error");
    }
  };

  const handleBulkDelete = async () => {
    const ids = Array.from(selected);
    if (ids.length === 0) return;
    try {
      await bulkDelete.mutateAsync(ids);
      setSelected(new Set());
      setConfirmDelete(false);
      toast(`Deleted ${ids.length} entr${ids.length === 1 ? "y" : "ies"}`, "success");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Failed to delete entries", "error");
    }
  };

  const handleBulkPublish = async () => {
    const ids = Array.from(selected);
    if (ids.length === 0) return;
    try {
      await bulkPublish.mutateAsync(ids);
      setSelected(new Set());
      toast(`Published ${ids.length} entr${ids.length === 1 ? "y" : "ies"}`, "success");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Failed to publish entries", "error");
    }
  };

  const handleBulkUnpublish = async () => {
    const ids = Array.from(selected);
    if (ids.length === 0) return;
    try {
      await bulkUnpublish.mutateAsync(ids);
      setSelected(new Set());
      toast(`Unpublished ${ids.length} entr${ids.length === 1 ? "y" : "ies"}`, "success");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Failed to unpublish entries", "error");
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

  if (!collection || colLoading)
    return loading ? (
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
        <div className="rounded-lg border overflow-x-auto">
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
    ) : null;
  if (error)
    return (
      <div className="space-y-6">
        <Link
          to="/collections"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Back to collections
        </Link>
        <div className="rounded-md bg-destructive/10 p-4 text-destructive">{error}</div>
      </div>
    );
  if (!collection) return null;

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
        <div className="rounded-lg border overflow-x-auto">
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

  const displayFields = collection.fields.slice(0, collection.versions?.drafts ? 3 : 4);
  const hasDrafts = collection.versions?.drafts === true;
  const hasSoftDelete = collection.versions?.softDelete === true;

  const handlePublish = async (id: string) => {
    try {
      await publishEntry.mutateAsync(id);
      toast("Entry published", "success");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Failed to publish entry", "error");
    }
  };

  const handleRestore = async (id: string) => {
    try {
      await restoreEntry.mutateAsync(id);
      toast("Entry restored", "success");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Failed to restore entry", "error");
    }
  };

  const handleUnpublish = async (id: string) => {
    try {
      await unpublishEntry.mutateAsync(id);
      toast("Entry unpublished", "success");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Failed to unpublish entry", "error");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Link
            to="/collections"
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight md:text-3xl">{collection.label}</h1>
            <p className="text-muted-foreground">
              {total} entr{total === 1 ? "y" : "ies"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <LocaleSelector
            value={locale}
            onChange={setLocale}
            locales={collection.localization?.locales ?? ["en"]}
          />
          {hasSoftDelete && (
            <Button
              variant={showDeleted ? "secondary" : "outline"}
              size="sm"
              onClick={() => setShowDeleted((p) => !p)}
            >
              <Trash2 className="mr-1.5 h-4 w-4" />
              {showDeleted ? "Active" : "Trash"}
            </Button>
          )}
          <Link to="/collections/$slug/new" params={{ slug }}>
            <Button className="w-full sm:w-auto">
              <Plus className="mr-2 h-4 w-4" /> Create New
            </Button>
          </Link>
        </div>
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
            <div className="flex flex-wrap items-center gap-3">
              <p className="text-sm text-muted-foreground">{selected.size} selected</p>
              {hasDrafts && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleBulkPublish}
                    disabled={bulkPublish.isPending}
                  >
                    <Send className="mr-1.5 h-4 w-4" /> Publish
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleBulkUnpublish}
                    disabled={bulkUnpublish.isPending}
                  >
                    <Undo2 className="mr-1.5 h-4 w-4" /> Unpublish
                  </Button>
                </>
              )}
              <Button variant="destructive" size="sm" onClick={() => setConfirmDelete(true)}>
                <Trash2 className="mr-1.5 h-4 w-4" /> Delete Selected
              </Button>
            </div>
          )}

          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full min-w-[500px]">
              <thead>
                <tr className="border-b">
                  <th className="w-10 px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selected.size === entries.length && entries.length > 0}
                      onChange={toggleSelectAll}
                      className="h-4 w-4 rounded border-input text-primary focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
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
                  {hasDrafts && (
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                      Status
                    </th>
                  )}
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
                        className="h-4 w-4 rounded border-input text-primary focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      />
                    </td>
                    {displayFields.map((f) => (
                      <td key={f.name} className="px-4 py-3 text-sm">
                        {formatValue(entry[f.name])}
                      </td>
                    ))}
                    {hasDrafts && (
                      <td className="px-4 py-3 text-sm">
                        {renderStatus(
                          entry._status as string | undefined,
                          entry._publishAt as string | undefined,
                        )}
                      </td>
                    )}
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <EntryActions
                          entry={entry}
                          hasDrafts={hasDrafts}
                          onPublish={handlePublish}
                          onUnpublish={handleUnpublish}
                          onRestore={handleRestore}
                          onDelete={handleDelete}
                          slug={slug}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={confirmDelete}
        title={`Delete ${selected.size} entr${selected.size === 1 ? "y" : "ies"}?`}
        message={
          hasSoftDelete
            ? "Entries will be soft-deleted and can be restored from Trash."
            : "This action cannot be undone."
        }
        loading={bulkDelete.isPending}
        onConfirm={handleBulkDelete}
        onCancel={() => setConfirmDelete(false)}
      />

      <ConfirmDialog
        open={confirmDeleteId !== null}
        title="Delete entry?"
        message={
          hasSoftDelete
            ? "The entry will be soft-deleted and can be restored from Trash."
            : "This action cannot be undone."
        }
        onConfirm={handleConfirmDelete}
        onCancel={() => setConfirmDeleteId(null)}
      />
    </div>
  );
}

function formatValue(val: unknown): string {
  if (val === null || val === undefined) return "—";
  if (typeof val === "boolean") return val ? "Yes" : "No";
  if (typeof val === "object") return JSON.stringify(val);
  return String(val);
}

function renderStatus(status: string | undefined, publishAt?: string) {
  if (!status) return <span className="text-muted-foreground">—</span>;
  if (status === "published") {
    return (
      <span
        role="status"
        className="inline-flex items-center gap-1 rounded-full bg-success/10 px-2 py-0.5 text-xs font-medium text-success"
      >
        <CheckCircle className="h-3 w-3" /> Published
      </span>
    );
  }
  if (status === "draft" && publishAt) {
    return (
      <span
        role="status"
        className="inline-flex items-center gap-1 rounded-full bg-info/10 px-2 py-0.5 text-xs font-medium text-info"
      >
        Scheduled
      </span>
    );
  }
  if (status === "draft") {
    return (
      <span
        role="status"
        className="inline-flex items-center gap-1 rounded-full bg-warning/10 px-2 py-0.5 text-xs font-medium text-warning"
      >
        Draft
      </span>
    );
  }
  return (
    <span
      role="status"
      className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground"
    >
      {status}
    </span>
  );
}
