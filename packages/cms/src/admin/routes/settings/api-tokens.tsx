import { createRoute } from "@tanstack/react-router";
import { Key, Plus, Trash2, Copy, Check } from "lucide-react";
import { useState } from "react";

import { ConfirmDialog } from "@/components/confirm-dialog";
import { Pagination } from "@/components/pagination";
import { useToast } from "@/components/toast-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { type ApiTokenMeta } from "@/lib/api";
import { useApiTokensList, useCreateApiToken, useDeleteApiToken } from "@/lib/hooks";
import { Route as settingsRoute } from "@/routes/settings/index";

export const Route = createRoute({
  component: ApiTokensPage,
  getParentRoute: () => settingsRoute,
  path: "api-tokens",
});

const PAGE_SIZE = 20;

function ApiTokensPage() {
  const { toast } = useToast();
  const [page, setPage] = useState({ limit: PAGE_SIZE, offset: 0 });
  const { data: tokensData, error, isLoading: loading } = useApiTokensList(page);
  const createApiToken = useCreateApiToken();
  const deleteApiToken = useDeleteApiToken();
  const tokens: ApiTokenMeta[] = tokensData?.data ?? [];
  const total = tokensData?.total ?? 0;
  const [showForm, setShowForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [createdToken, setCreatedToken] = useState<{
    name: string;
    rawToken: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    try {
      const result = await createApiToken.mutateAsync({
        description: newDescription.trim() || undefined,
        name: newName.trim(),
      });
      setCreatedToken({ name: result.token.name, rawToken: result.rawToken });
      setNewName("");
      setNewDescription("");
      setShowForm(false);
      toast("Token created", "success");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to create token";
      toast(msg, "error");
    }
  };

  const handleCopy = async () => {
    if (!createdToken) return;
    try {
      await navigator.clipboard.writeText(createdToken.rawToken);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast("Failed to copy", "error");
    }
  };

  const handleDelete = (id: string) => {
    setConfirmDeleteId(id);
  };

  const handleConfirmDelete = async () => {
    if (!confirmDeleteId) return;
    try {
      await deleteApiToken.mutateAsync(confirmDeleteId);
      setConfirmDeleteId(null);
      toast("Token revoked", "success");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to revoke token";
      toast(msg, "error");
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-9 w-32" />
          <Skeleton className="mt-1 h-5 w-24" />
        </div>
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full min-w-[500px]">
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
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">API Tokens</h1>
          <p className="text-muted-foreground">
            {total} token{total === 1 ? "" : "s"}
          </p>
        </div>
        <Button onClick={() => setShowForm(true)} disabled={showForm}>
          <Plus className="mr-2 h-4 w-4" />
          Generate Token
        </Button>
      </div>

      {error && (
        <div role="alert" className="rounded-md bg-destructive/10 p-4 text-destructive">
          {error.message}
        </div>
      )}

      {showForm && (
        <div className="rounded-lg border p-6">
          <h2 className="mb-4 text-lg font-semibold">New API Token</h2>
          <form onSubmit={handleCreate} className="max-w-md space-y-4">
            <div className="space-y-2">
              <Label htmlFor="token-name">Name</Label>
              <Input
                id="token-name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="My API Token"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="token-desc">Description (optional)</Label>
              <Input
                id="token-desc"
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                placeholder="For integration with..."
              />
            </div>
            <div className="flex gap-2">
              <Button type="submit" disabled={!newName.trim()} loading={createApiToken.isPending}>
                Create
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowForm(false);
                  setNewName("");
                  setNewDescription("");
                }}
              >
                Cancel
              </Button>
            </div>
          </form>
        </div>
      )}

      {createdToken && (
        <div className="rounded-lg border border-primary/30 bg-primary/5 p-6">
          <div className="mb-2 flex items-center gap-2">
            <Key className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">Token Created</h2>
          </div>
          <p className="mb-3 text-sm text-muted-foreground">
            Copy this token now. You won&apos;t be able to see it again.
          </p>
          <div className="flex items-center gap-2">
            <code className="flex-1 rounded-md bg-background px-3 py-2 text-sm font-mono break-all">
              {createdToken.rawToken}
            </code>
            <Button variant="outline" size="icon" onClick={handleCopy}>
              {copied ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
          <Button variant="ghost" size="sm" className="mt-3" onClick={() => setCreatedToken(null)}>
            Dismiss
          </Button>
        </div>
      )}

      {tokens.length === 0 && !showForm ? (
        <div className="flex flex-col items-center gap-4 rounded-lg border p-12 text-center">
          <Key className="h-8 w-8 text-muted-foreground" />
          <p className="text-lg text-muted-foreground">No API tokens yet</p>
          <Button onClick={() => setShowForm(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Generate your first token
          </Button>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full min-w-[600px]">
              <thead>
                <tr className="border-b">
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                    Name
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                    Token
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                    Created
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                    Last Used
                  </th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {tokens.map((token) => (
                  <tr key={token.id} className="border-b last:border-0 hover:bg-muted/50">
                    <td className="px-4 py-3">
                      <div className="text-sm font-medium">{token.name}</div>
                      {token.description && (
                        <div className="text-xs text-muted-foreground">{token.description}</div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <code className="text-sm font-mono text-muted-foreground">
                        …{token.lastFour}
                      </code>
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {new Date(token.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {token.lastUsedAt ? new Date(token.lastUsedAt).toLocaleDateString() : "Never"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(token.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
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
        title="Revoke token?"
        message="This will permanently invalidate the token. Any services using it will lose access."
        onConfirm={handleConfirmDelete}
        onCancel={() => setConfirmDeleteId(null)}
      />
    </div>
  );
}
