import { createRoute, redirect } from "@tanstack/react-router";
import { Route as rootRoute } from "@/routes/__root";

export const Route = createRoute({
  getParentRoute: () => rootRoute,
  path: "/users/$id",
  beforeLoad: ({ params }) => {
    throw redirect({ to: "/settings/users/$id", params: { id: params.id } });
  },
  component: () => null,
});
