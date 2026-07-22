import { createRoute, Link } from "@tanstack/react-router";
import { Pencil, Trash2, Plus } from "lucide-react";
import { useState } from "react";

import { ConfirmDialog } from "@/components/confirm-dialog";
import { Pagination } from "@/components/pagination";
import { useToast } from "@/components/toast-provider";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useUsersList, useDeleteUser } from "@/lib/hooks";
import { Route as settingsRoute } from "@/routes/settings/index";

export const Route = createRoute({
  component: UsersList,
  getParentRoute: () => settingsRoute,
  path: "users",
});

const PAGE_SIZE = 20;

function UsersList() {
  const { toast } = useToast();
  const [page, setPage] = useState({ limit: PAGE_SIZE, offset: 0 });
  const { data, error, isLoading: loading } = useUsersList(page);
  const deleteUser = useDeleteUser();
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const users = data?.data ?? [];
  const total = data?.total ?? 0;

  const handleDelete = (id: string) => {
    setConfirmDeleteId(id);
  };

  const handleConfirmDelete = async () => {
    if (!confirmDeleteId) return;
    try {
      await deleteUser.mutateAsync(confirmDeleteId);
      setConfirmDeleteId(null);
      toast("User deleted", "success");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to delete user";
      toast(msg, "error");
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-9 w-24" />
          <Skeleton className="mt-1 h-5 w-20" />
        </div>
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full min-w-[500px]">
            <thead>
              <tr className="border-b">
                {Array.from({ length: 4 }).map((_, i) => (
                  <th key={i} className="px-4 py-3">
                    <Skeleton className="h-4 w-16" />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 4 }).map((_, i) => (
                <tr key={i} className="border-b">
                  {Array.from({ length: 4 }).map((_, j) => (
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
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Users</h1>
          <p className="text-muted-foreground">
            {total} user{total === 1 ? "" : "s"}
          </p>
        </div>
        <Link to="/settings/users/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Add User
          </Button>
        </Link>
      </div>

      {error && (
        <div className="rounded-md bg-destructive/10 p-4 text-destructive">
          {error instanceof Error ? error.message : "Failed to load users"}
        </div>
      )}

      {users.length === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-lg border border-dashed p-12 text-center">
          <p className="text-lg text-muted-foreground">No users found</p>
          <Link to="/settings/users/new">
            <Button size="sm">
              <Plus className="mr-2 h-4 w-4" />
              Create User
            </Button>
          </Link>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full min-w-[500px]">
              <thead>
                <tr className="border-b">
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                    Email
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                    Role
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                    Created
                  </th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className="border-b last:border-0 hover:bg-muted/50">
                    <td className="px-4 py-3 text-sm">{user.email}</td>
                    <td className="px-4 py-3 text-sm capitalize">{user.role}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Link to="/settings/users/$id" params={{ id: user.id }}>
                          <Button variant="ghost" size="icon">
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </Link>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(user.id)}
                          disabled={deleteUser.isPending}
                        >
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
        title="Delete user?"
        message="This action cannot be undone."
        onConfirm={handleConfirmDelete}
        onCancel={() => setConfirmDeleteId(null)}
      />
    </div>
  );
}
