import { createRoute, redirect } from "@tanstack/react-router";

import { Route as rootRoute } from "@/routes/__root";

export const Route = createRoute({
  beforeLoad: () => {
    throw redirect({ to: "/settings/roles/new" });
  },
  component: () => null,
  getParentRoute: () => rootRoute,
  path: "/roles/new",
});
