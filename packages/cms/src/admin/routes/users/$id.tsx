import { createRoute, redirect } from "@tanstack/react-router";

import { Route as rootRoute } from "@/routes/__root";

export const Route = createRoute({
  beforeLoad: ({ params }) => {
    throw redirect({ params: { id: params.id }, to: "/settings/users/$id" });
  },
  component: () => null,
  getParentRoute: () => rootRoute,
  path: "/users/$id",
});
