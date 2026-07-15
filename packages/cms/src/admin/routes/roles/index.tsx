import { useEffect, useState } from "react";
import { createRoute, Link } from "@tanstack/react-router";
import { Route as rootRoute } from "@/routes/__root";
import { Skeleton } from "@/components/skeleton";
import { useToast } from "@/components/toast-provider";
import { fetchRoles, deleteRole, type RoleMeta } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Pencil, Trash2, Plus } from "lucide-react";

export const Route = createRoute({
  getParentRoute: () => rootRoute,
  path: "/roles",
  component: RolesList,
});

function RolesList() {
  const { toast } = useToast();
  const [roles, setRoles] = useState<RoleMeta[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const data = await fetchRoles();
        if (cancelled) return;
        setRoles(data.data);
        setTotal(data.total);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load roles");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleDelete = (id: string) => {
    setConfirmDeleteId(id);
  };

  const handleConfirmDelete = async () => {
    if (!confirmDeleteId) return;
    try {
      await deleteRole(confirmDeleteId);
      setRoles((prev) => prev.filter((r) => r.id !== confirmDeleteId));
      setTotal((prev) => prev - 1);
      setConfirmDeleteId(null);
      toast("Role deleted", "success");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to delete role";
      setError(msg);
      toast(msg, "error");
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-9 w-24" />
            <Skeleton className="mt-1 h-5 w-20" />
          </div>
          <Skeleton className="h-10 w-28 rounded-md" />
        </div>
        <div className="rounded-lg border">
          <table className="w-full">
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
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Roles</h1>
          <p className="text-muted-foreground">
            {total} role{total === 1 ? "" : "s"}
          </p>
        </div>
        <Link to="/roles/new" className="self-start sm:self-auto">
          <Button className="w-full sm:w-auto">
            <Plus className="mr-2 h-4 w-4" /> Create Role
          </Button>
        </Link>
      </div>

      {error && <div className="rounded-md bg-destructive/10 p-4 text-destructive">{error}</div>}

      {roles.length === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-lg border p-12 text-center">
          <p className="text-lg text-muted-foreground">No roles yet</p>
          <Link to="/roles/new">
            <Button variant="outline">
              <Plus className="mr-2 h-4 w-4" /> Create your first role
            </Button>
          </Link>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full min-w-[500px]">
            <thead>
              <tr className="border-b">
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                  Name
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                  Description
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                  Permissions
                </th>
                <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {roles.map((role) => (
                <tr key={role.id} className="border-b last:border-0 hover:bg-muted/50">
                  <td className="px-4 py-3 text-sm font-medium capitalize">{role.name}</td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">{role.description}</td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">
                    {role.permissions.length} permission{role.permissions.length === 1 ? "" : "s"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Link to="/roles/$id" params={{ id: role.id }}>
                        <Button variant="ghost" size="icon">
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </Link>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(role.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ConfirmDialog
        open={confirmDeleteId !== null}
        title="Delete role?"
        message="This action cannot be undone."
        onConfirm={handleConfirmDelete}
        onCancel={() => setConfirmDeleteId(null)}
      />
    </div>
  );
}
