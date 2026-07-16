import { createRoute, redirect } from "@tanstack/react-router";
import { Route as rootRoute } from "@/routes/__root";

export const Route = createRoute({
  getParentRoute: () => rootRoute,
  path: "/roles/$id",
  beforeLoad: ({ params }) => {
    throw redirect({ to: "/settings/roles/$id", params: { id: params.id } });
  },
  component: () => null,
});
