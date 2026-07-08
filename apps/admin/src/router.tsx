import { createRouter } from "@tanstack/react-router";
import { Route as rootRoute } from "@/routes/__root";
import { Route as indexRoute } from "@/routes/index";
import { Route as loginRoute } from "@/routes/login";
import { Route as registerRoute } from "@/routes/register";

const routeTree = rootRoute.addChildren([indexRoute, loginRoute, registerRoute]);

export const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
