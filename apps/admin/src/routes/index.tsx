import { createRoute } from "@tanstack/react-router";
import { Route as rootRoute } from "@/routes/__root";

export const Route = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: Dashboard,
});

function Dashboard() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">Welcome to Altrugenix CMS</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border p-4">
          <p className="text-sm text-muted-foreground">Collections</p>
          <p className="text-2xl font-bold">0</p>
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-sm text-muted-foreground">Entries</p>
          <p className="text-2xl font-bold">0</p>
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-sm text-muted-foreground">Media</p>
          <p className="text-2xl font-bold">0</p>
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-sm text-muted-foreground">Users</p>
          <p className="text-2xl font-bold">0</p>
        </div>
      </div>
    </div>
  );
}
