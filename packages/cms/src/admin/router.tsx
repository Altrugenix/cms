import { createRouter } from "@tanstack/react-router";
import { Route as rootRoute } from "@/routes/__root";
import { Route as indexRoute } from "@/routes/index";
import { Route as loginRoute } from "@/routes/login";
import { Route as registerRoute } from "@/routes/register";
import { Route as forgotPasswordRoute } from "@/routes/forgot-password";
import { Route as usersListRoute } from "@/routes/users/index";
import { Route as userCreateRoute } from "@/routes/users/new";
import { Route as userEditRoute } from "@/routes/users/$id";
import { Route as rolesListRoute } from "@/routes/roles/index";
import { Route as roleCreateRoute } from "@/routes/roles/new";
import { Route as roleEditRoute } from "@/routes/roles/$id";
import { Route as collectionsListRoute } from "@/routes/collections/index";
import { Route as collectionEntriesRoute } from "@/routes/collections/$slug";
import { Route as createEntryRoute } from "@/routes/collections/new.$slug";
import { Route as editEntryRoute } from "@/routes/collections/$id_.$slug.edit";
import { Route as mediaRoute } from "@/routes/media/index";
import { Route as globalsListRoute } from "@/routes/globals/index";
import { Route as globalEditRoute } from "@/routes/globals/$slug";
import { Route as settingsRoute } from "@/routes/settings/index";
import { Route as apiTokensRoute } from "@/routes/settings/api-tokens";
import { Route as pluginsRoute } from "@/routes/settings/plugins";
import { Route as webhooksListRoute } from "@/routes/settings/webhooks/index";
import { Route as webhookCreateRoute } from "@/routes/settings/webhooks/new";
import { Route as webhookEditRoute } from "@/routes/settings/webhooks/$id";
import { Route as settingsUsersListRoute } from "@/routes/settings/users/index";
import { Route as settingsUserCreateRoute } from "@/routes/settings/users/new";
import { Route as settingsUserEditRoute } from "@/routes/settings/users/$id";
import { Route as settingsRolesListRoute } from "@/routes/settings/roles/index";
import { Route as settingsRoleCreateRoute } from "@/routes/settings/roles/new";
import { Route as settingsRoleEditRoute } from "@/routes/settings/roles/$id";
import { Route as schemasListRoute } from "@/routes/schemas/index";
import { Route as schemasNewRoute } from "@/routes/schemas/new";
import { Route as schemaEditRoute } from "@/routes/schemas/$type.$slug";

const settingsWithChildren = settingsRoute.addChildren([
  apiTokensRoute,
  pluginsRoute,
  webhooksListRoute,
  webhookCreateRoute,
  webhookEditRoute,
  settingsUsersListRoute,
  settingsUserCreateRoute,
  settingsUserEditRoute,
  settingsRolesListRoute,
  settingsRoleCreateRoute,
  settingsRoleEditRoute,
]);

const routeTree = rootRoute.addChildren([
  indexRoute,
  loginRoute,
  registerRoute,
  forgotPasswordRoute,
  usersListRoute,
  userCreateRoute,
  userEditRoute,
  rolesListRoute,
  roleCreateRoute,
  roleEditRoute,
  collectionsListRoute,
  collectionEntriesRoute,
  createEntryRoute,
  editEntryRoute,
  mediaRoute,
  globalsListRoute,
  globalEditRoute,
  settingsWithChildren,
  schemasListRoute,
  schemasNewRoute,
  schemaEditRoute,
]);

export const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
