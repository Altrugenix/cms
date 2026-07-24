export { router } from "@/router";

export { getBackendMode, isFirebaseMode, isRestMode } from "@/lib/backend-mode";

export type {
  AdminProvider,
  AdminUser,
  ListParams,
  PaginatedResult,
  MediaItem,
  MediaFolder,
  UserItem,
  RoleItem,
  ActivityItem,
} from "@/lib/providers/types";

export { Provider, useProvider, createRestProvider, registerProvider } from "@/lib/providers";
