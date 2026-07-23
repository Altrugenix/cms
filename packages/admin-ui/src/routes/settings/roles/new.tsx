import { createRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { useState, type FormEvent } from "react";

import { useToast } from "@/components/toast-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createRole } from "@/lib/api";
import { Route as settingsRoute } from "@/routes/settings/index";

export const Route = createRoute({
  component: CreateRole,
  getParentRoute: () => settingsRoute,
  path: "roles/new",
});

const DEFAULT_ACTIONS = ["create", "read", "update", "delete"];

function CreateRole() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [permissions, setPermissions] = useState<Array<{ action: string; resource: string }>>([
    { action: "read", resource: "*" },
  ]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    if (!name) return;
    setSaving(true);
    try {
      await createRole({ description, name, permissions });
      toast("Role created", "success");
      navigate({ to: "/settings/roles" });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to create role";
      setError(msg);
      toast(msg, "error");
    } finally {
      setSaving(false);
    }
  };

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
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Create Role</h1>
          <p className="text-muted-foreground">Define a new role with permissions</p>
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
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            placeholder="e.g. editor"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Input
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe this role"
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
            Create Role
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
