import { createRoute, Link } from "@tanstack/react-router";

import { Button } from "@/components/ui/button";
import { Route as rootRoute } from "@/routes/__root";

export const Route = createRoute({
  component: NotFoundPage,
  getParentRoute: () => rootRoute,
  path: "*",
});

function NotFoundPage() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
      <p className="text-6xl font-bold text-muted-foreground/30">404</p>
      <h1 className="text-2xl font-bold tracking-tight">Page Not Found</h1>
      <p className="text-muted-foreground">
        The page you are looking for does not exist or has been moved.
      </p>
      <Link to="/">
        <Button>Go Home</Button>
      </Link>
    </div>
  );
}
