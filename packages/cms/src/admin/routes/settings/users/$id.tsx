import { createRoute, Link, useParams, useNavigate } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";

import { useToast } from "@/components/toast-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchUsers, updateUser, fetchRoles, type UserMeta, type RoleMeta } from "@/lib/api";
import { Route as settingsRoute } from "@/routes/settings/index";

export const Route = createRoute({
  component: EditUser,
  getParentRoute: () => settingsRoute,
  path: "users/$id",
});

function EditUser() {
  const { id } = useParams({ from: Route.id });
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<UserMeta | null>(null);
  const [roles, setRoles] = useState<RoleMeta[]>([]);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [usersRes, rolesRes] = await Promise.all([fetchUsers(), fetchRoles()]);
        const u = usersRes.data.find((x) => x.id === id);
        if (!u) throw new Error("User not found");
        if (cancelled) return;
        setUser(u);
        setEmail(u.email);
        setName(u.name ?? "");
        setRole(u.role);
        setRoles(rolesRes.data);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load user");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    try {
      const updates: { email: string; name: string; role: string; password?: string } = {
        email,
        name,
        role,
      };
      if (password) updates.password = password;
      await updateUser(id, updates);
      toast("User updated", "success");
      navigate({ to: "/settings/users" });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to update user";
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
            <Skeleton className="mt-1 h-5 w-40" />
          </div>
        </div>
        <div className="space-y-6 rounded-lg border p-6">
          <div className="space-y-2">
            <Skeleton className="h-4 w-12" />
            <Skeleton className="h-10 w-full rounded-md" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-10" />
            <Skeleton className="h-10 w-full rounded-md" />
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
  if (!user) return null;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center gap-4">
        <Link
          to="/settings/users"
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Edit User</h1>
          <p className="text-muted-foreground">{user.email}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 rounded-lg border p-6">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="name">Name</Label>
          <Input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Optional"
            autoComplete="name"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="role">Role</Label>
          <select
            id="role"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <option value="">No role</option>
            {roles.map((r) => (
              <option key={r.id} value={r.name}>
                {r.name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">New Password</Label>
          <PasswordInput
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Leave blank to keep current password"
            autoComplete="new-password"
          />
        </div>
        <div className="flex items-center gap-2 pt-4">
          <Button type="submit" loading={saving}>
            Save Changes
          </Button>
          <Link to="/settings/users">
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </Link>
        </div>
      </form>
    </div>
  );
}
