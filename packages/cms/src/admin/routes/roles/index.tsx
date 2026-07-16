import { createRoute, redirect } from "@tanstack/react-router";
import { Route as rootRoute } from "@/routes/__root";

export const Route = createRoute({
  getParentRoute: () => rootRoute,
  path: "/roles",
  beforeLoad: () => {
    throw redirect({ to: "/settings/roles" });
  },
  component: () => null,
});
