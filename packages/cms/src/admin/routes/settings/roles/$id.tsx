import { createRoute, Link, useParams, useNavigate } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";

import { useToast } from "@/components/toast-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchRoles, updateRole, type RoleMeta } from "@/lib/api";
import { Route as settingsRoute } from "@/routes/settings/index";

export const Route = createRoute({
  component: EditRole,
  getParentRoute: () => settingsRoute,
  path: "roles/$id",
});

const DEFAULT_ACTIONS = ["create", "read", "update", "delete"];

function EditRole() {
  const { id } = useParams({ from: Route.id });
  const navigate = useNavigate();
  const { toast } = useToast();
  const [role, setRole] = useState<RoleMeta | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [permissions, setPermissions] = useState<Array<{ action: string; resource: string }>>([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const data = await fetchRoles();
        const r = data.data.find((x) => x.id === id);
        if (!r) throw new Error("Role not found");
        if (cancelled) return;
        setRole(r);
        setName(r.name);
        setDescription(r.description);
        setPermissions(r.permissions.map((p) => ({ action: p.action, resource: p.resource })));
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load role");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const addPermission = () => {
    setPermissions((prev) => [...prev, { action: "read", resource: "*" }]);
  };

  const updatePermission = (index: number, field: "action" | "resource", value: string) => {
    setPermissions((prev) => {
      const next = [...prev];
      if (next[index]) {
        next[index] = { ...next[index], [field]: value };
      }
      return next;
    });
  };

  const removePermission = (index: number) => {
    setPermissions((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!role) return;
    setSaving(true);
    try {
      await updateRole(id, { description, name, permissions });
      toast("Role updated", "success");
      navigate({ to: "/settings/roles" });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to update role";
      setError(msg);
      toast(msg, "error");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-5 w-5" />
          <div>
            <Skeleton className="h-8 w-32" />
            <Skeleton className="mt-1 h-5 w-24" />
          </div>
        </div>
        <div className="space-y-6 rounded-lg border p-6">
          <div className="space-y-2">
            <Skeleton className="h-4 w-12" />
            <Skeleton className="h-10 w-full rounded-md" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-10 w-full rounded-md" />
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-9 w-28 rounded-md" />
            </div>
            <div className="flex items-center gap-2 rounded-md border p-3">
              <Skeleton className="h-9 w-20 rounded-md" />
              <Skeleton className="h-9 flex-1 rounded-md" />
              <Skeleton className="h-9 w-16 rounded-md" />
            </div>
          </div>
          <div className="flex items-center gap-2 pt-4">
            <Skeleton className="h-10 w-28 rounded-md" />
            <Skeleton className="h-10 w-20 rounded-md" />
          </div>
        </div>
      </div>
    );
  }
  if (error)
    return (
      <div role="alert" className="rounded-md bg-destructive/10 p-4 text-destructive">
        {error}
      </div>
    );
  if (!role) return null;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center gap-4">
        <Link
          to="/settings/roles"
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Edit Role</h1>
          <p className="text-muted-foreground capitalize">{role.name}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 rounded-lg border p-6">
        {error && (
          <div role="alert" className="rounded-md bg-destructive/10 p-4 text-destructive">
            {error}
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="name">Name</Label>
          <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Input
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label>Permissions</Label>
            <Button type="button" variant="outline" size="sm" onClick={addPermission}>
              Add Permission
            </Button>
          </div>
          {permissions.map((perm, i) => (
            <div
              key={i}
              className="flex flex-col gap-2 rounded-md border p-3 sm:flex-row sm:items-center"
            >
              <select
                value={perm.action}
                onChange={(e) => updatePermission(i, "action", e.target.value)}
                className="h-9 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 transition-colors"
              >
                {DEFAULT_ACTIONS.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
                <option value="*">all</option>
              </select>
              <Input
                value={perm.resource}
                onChange={(e) => updatePermission(i, "resource", e.target.value)}
                placeholder="resource (e.g. posts or *)"
                className="flex-1"
              />
              <Button type="button" variant="ghost" size="sm" onClick={() => removePermission(i)}>
                Remove
              </Button>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-2 pt-4">
          <Button type="submit" loading={saving}>
            Save Changes
          </Button>
          <Link to="/settings/roles">
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </Link>
        </div>
      </form>
    </div>
  );
}
