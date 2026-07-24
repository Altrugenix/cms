import { createRoute, Link, useParams, useNavigate } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";

import { useToast } from "@/components/toast-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";
import { Skeleton } from "@/components/ui/skeleton";
import { useUser, useUpdateUser, useRolesList } from "@/lib/hooks";
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
  const { data: user, error: loadError, isLoading: loading } = useUser(id);
  const { data: rolesData } = useRolesList();
  const updateUser = useUpdateUser();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [password, setPassword] = useState("");

  const roles = rolesData?.data ?? [];

  useEffect(() => {
    if (user) {
      setEmail(user.email);
      setName(user.name ?? "");
      setRole(user.role);
    }
  }, [user]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const updates: Record<string, unknown> = { email, name, role };
    if (password) updates.password = password;
    try {
      await updateUser.mutateAsync({ data: updates, id });
      toast("User updated", "success");
      navigate({ to: "/settings/users" });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to update user";
      toast(msg, "error");
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
  if (loadError)
    return (
      <div role="alert" className="rounded-md bg-destructive/10 p-4 text-destructive">
        {loadError.message}
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
          <Button type="submit" loading={updateUser.isPending}>
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
