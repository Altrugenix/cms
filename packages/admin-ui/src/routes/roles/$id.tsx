import { createRoute, redirect } from "@tanstack/react-router";

import { Route as rootRoute } from "@/routes/__root";

export const Route = createRoute({
  beforeLoad: ({ params }) => {
    throw redirect({ params: { id: params.id }, to: "/settings/roles/$id" });
  },
  component: () => null,
  getParentRoute: () => rootRoute,
  path: "/roles/$id",
});
