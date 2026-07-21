import { createRoute, Link } from "@tanstack/react-router";
import { Pencil, Trash2, Plus, Webhook } from "lucide-react";
import { useState } from "react";

import { ConfirmDialog } from "@/components/confirm-dialog";
import { Pagination } from "@/components/pagination";
import { useToast } from "@/components/toast-provider";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { type WebhookMeta } from "@/lib/api";
import { useWebhooksList, useDeleteWebhook, useUpdateWebhook } from "@/lib/hooks";
import { Route as settingsRoute } from "@/routes/settings/index";

export const Route = createRoute({
  component: WebhooksList,
  getParentRoute: () => settingsRoute,
  path: "webhooks",
});

const PAGE_SIZE = 20;

function WebhooksList() {
  const { toast } = useToast();
  const [page, setPage] = useState({ limit: PAGE_SIZE, offset: 0 });
  const { data: webhooksData, error, isLoading: loading } = useWebhooksList(page);
  const updateWebhook = useUpdateWebhook();
  const deleteWebhook = useDeleteWebhook();
  const webhooks: WebhookMeta[] = webhooksData?.data ?? [];
  const total = webhooksData?.total ?? 0;
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const handleToggle = async (webhook: WebhookMeta) => {
    try {
      await updateWebhook.mutateAsync({
        data: { enabled: !webhook.enabled },
        id: webhook.id,
      });
      toast(`Webhook ${!webhook.enabled ? "enabled" : "disabled"}`, "success");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to toggle webhook";
      toast(msg, "error");
    }
  };

  const handleDelete = (id: string) => {
    setConfirmDeleteId(id);
  };

  const handleConfirmDelete = async () => {
    if (!confirmDeleteId) return;
    try {
      await deleteWebhook.mutateAsync(confirmDeleteId);
      setConfirmDeleteId(null);
      toast("Webhook deleted", "success");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to delete webhook";
      toast(msg, "error");
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-9 w-28" />
          <Skeleton className="mt-1 h-5 w-20" />
        </div>
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full min-w-[600px]">
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
              {Array.from({ length: 3 }).map((_, i) => (
                <tr key={i} className="border-b">
                  {Array.from({ length: 5 }).map((_, j) => (
                    <td key={j} className="px-4 py-3">
                      <Skeleton className="h-4 w-24" />
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Webhooks</h1>
          <p className="text-muted-foreground">
            {total} webhook{total === 1 ? "" : "s"}
          </p>
        </div>
        <Link to="/settings/webhooks/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Add Webhook
          </Button>
        </Link>
      </div>

      {error && (
        <div className="rounded-md bg-destructive/10 p-4 text-destructive">{error.message}</div>
      )}

      {webhooks.length === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-lg border p-12 text-center">
          <Webhook className="h-8 w-8 text-muted-foreground" />
          <p className="text-lg text-muted-foreground">No webhooks configured</p>
          <Link to="/settings/webhooks/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add your first webhook
            </Button>
          </Link>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full min-w-[700px]">
              <thead>
                <tr className="border-b">
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                    Name
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                    URL
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                    Events
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                    Status
                  </th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {webhooks.map((wh) => (
                  <tr key={wh.id} className="border-b last:border-0 hover:bg-muted/50">
                    <td className="px-4 py-3">
                      <div className="text-sm font-medium">{wh.name}</div>
                      {wh.collection !== "*" && (
                        <div className="text-xs text-muted-foreground">
                          Collection: {wh.collection}
                        </div>
                      )}
                    </td>
                    <td className="max-w-[200px] truncate px-4 py-3 text-sm text-muted-foreground">
                      {wh.url}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <div className="flex flex-wrap gap-1">
                        {wh.events.map((evt) => (
                          <span
                            key={evt}
                            className="inline-block rounded-full bg-secondary px-2 py-0.5 text-xs"
                          >
                            {evt}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleToggle(wh)}
                        role="switch"
                        aria-checked={wh.enabled}
                        aria-label={`Toggle webhook ${wh.name}`}
                        className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                          wh.enabled
                            ? "bg-success/10 text-success hover:bg-success/20"
                            : "bg-muted text-muted-foreground hover:bg-muted/80"
                        }`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            wh.enabled ? "bg-success" : "bg-muted-foreground"
                          }`}
                        />
                        {wh.enabled ? "Enabled" : "Disabled"}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Link to="/settings/webhooks/$id" params={{ id: wh.id }}>
                          <Button variant="ghost" size="icon">
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </Link>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(wh.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination
            limit={page.limit}
            offset={page.offset}
            total={total}
            onChange={(limit, offset) => setPage({ limit, offset })}
          />
        </>
      )}

      <ConfirmDialog
        open={confirmDeleteId !== null}
        title="Delete webhook?"
        message="This will permanently remove the webhook. Endpoints will no longer receive events."
        onConfirm={handleConfirmDelete}
        onCancel={() => setConfirmDeleteId(null)}
      />
    </div>
  );
}
