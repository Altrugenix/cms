import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useBlocker } from "@tanstack/react-router";
import { useCallback } from "react";

import {
  fetchCollections,
  fetchGlobals,
  fetchGlobalSchema,
  fetchPlugins,
  fetchVersions,
  restoreVersion,
  saveSchema,
  type CollectionMeta,
  type FieldDefinition,
} from "@/lib/api";
import { useProvider } from "@/lib/providers";

export function useCollections() {
  return useQuery({
    queryFn: fetchCollections,
    queryKey: ["collections"],
    staleTime: 30_000,
  });
}

export function useGlobals() {
  return useQuery({
    queryFn: fetchGlobals,
    queryKey: ["globals"],
    staleTime: 30_000,
  });
}

export function useCollection(slug: string) {
  const { data: collections = [], error, isLoading } = useCollections();
  return {
    collection: collections.find((c: CollectionMeta) => c.slug === slug),
    error,
    isLoading,
  };
}

export function useGlobalSchema(slug: string) {
  return useQuery({
    queryFn: () => fetchGlobalSchema(slug),
    queryKey: ["globalSchema", slug],
    staleTime: 30_000,
  });
}

export function useGlobalData(slug: string) {
  const provider = useProvider();
  return useQuery({
    queryFn: () => provider.globals.getGlobal(slug),
    queryKey: ["global", slug],
    staleTime: 30_000,
  });
}

export function useEntries(slug: string, params: Record<string, string> = {}) {
  const provider = useProvider();
  return useQuery({
    enabled: !!slug,
    queryFn: () =>
      provider.collections.listEntries(slug, {
        limit: params.limit ? Number(params.limit) : undefined,
        locale: params.locale,
        offset: params.offset ? Number(params.offset) : undefined,
      }),
    queryKey: ["entries", slug, params],
  });
}

export function useEntry(slug: string, id: string, locale = "en") {
  const provider = useProvider();
  return useQuery({
    enabled: !!slug && !!id,
    queryFn: () => provider.collections.getEntry(slug, id, locale),
    queryKey: ["entry", slug, id, locale],
  });
}

export function useDashboardData(colSlugs: string[]) {
  const provider = useProvider();
  return useQuery({
    enabled: colSlugs.length > 0,
    queryFn: async () => {
      const counts = await Promise.all(
        colSlugs.map(async (slug) => {
          try {
            const data = await provider.collections.listEntries(slug, { limit: 1 });
            return { entryCount: data.total, slug };
          } catch {
            return { entryCount: 0, slug };
          }
        }),
      );
      const [usersRes, mediaRes, activityRes] = await Promise.all([
        provider.users.listUsers(),
        provider.media.listMedia(),
        provider.activity.listActivity().catch(() => ({ data: [], total: 0 })),
      ]);
      return { activityRes, counts, mediaRes, usersRes };
    },
    queryKey: ["dashboard", colSlugs],
    staleTime: 30_000,
  });
}

export function useApiTokensList(params?: { limit?: number; offset?: number }) {
  const provider = useProvider();
  return useQuery({
    queryFn: () => provider.settings.listApiTokens(params),
    queryKey: ["api-tokens", params],
    staleTime: 30_000,
  });
}

export function useUsersList(params?: { limit?: number; offset?: number }) {
  const provider = useProvider();
  return useQuery({
    queryFn: () => provider.users.listUsers(params),
    queryKey: ["users", params],
    staleTime: 30_000,
  });
}

export function useRolesList(params?: { limit?: number; offset?: number }) {
  const provider = useProvider();
  return useQuery({
    queryFn: () => provider.roles.listRoles(params),
    queryKey: ["roles", params],
    staleTime: 30_000,
  });
}

export function useWebhooksList(params?: { limit?: number; offset?: number }) {
  const provider = useProvider();
  return useQuery({
    queryFn: () => provider.settings.listWebhooks(params),
    queryKey: ["webhooks", params],
    staleTime: 30_000,
  });
}

export function useWebhook(id: string) {
  const provider = useProvider();
  return useQuery({
    enabled: !!id,
    queryFn: () => provider.settings.getWebhook(id),
    queryKey: ["webhook", id],
  });
}

export function usePluginsList() {
  return useQuery({
    queryFn: fetchPlugins,
    queryKey: ["plugins"],
    staleTime: 30_000,
  });
}

export function useRelationEntries(to: string) {
  const provider = useProvider();
  return useQuery({
    enabled: !!to,
    queryFn: async () => {
      const data = await provider.collections.listEntries(to);
      return data.data.map((e) => ({
        id: String((e as Record<string, unknown>).id),
        label: ((e as Record<string, unknown>).title ??
          (e as Record<string, unknown>).name ??
          (e as Record<string, unknown>).id) as string,
      }));
    },
    queryKey: ["relation-entries", to],
  });
}

export function useCollectionEntryCounts(slugs: string[]) {
  const provider = useProvider();
  return useQuery({
    enabled: slugs.length > 0,
    queryFn: async () => {
      const counts = await Promise.all(
        slugs.map(async (slug) => {
          try {
            const data = await provider.collections.listEntries(slug, { limit: 1 });
            return { count: data.total, slug };
          } catch {
            return { count: 0, slug };
          }
        }),
      );
      return counts.reduce(
        (acc, { count, slug }) => {
          acc[slug] = count;
          return acc;
        },
        {} as Record<string, number>,
      );
    },
    queryKey: ["collection-entry-counts", slugs],
    staleTime: 30_000,
  });
}

export function useSaveGlobal(slug: string) {
  const provider = useProvider();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => provider.globals.upsertGlobal(slug, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["global", slug] });
    },
  });
}

export function useDeleteEntry(slug: string) {
  const provider = useProvider();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => provider.collections.deleteEntry(slug, id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["entries", slug] });
    },
  });
}

export function useBulkDelete(slug: string) {
  const provider = useProvider();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (ids: string[]) => provider.collections.bulkDelete(slug, ids),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["entries", slug] });
    },
  });
}

export function useBulkPublish(slug: string) {
  const provider = useProvider();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (ids: string[]) => {
      await Promise.all(ids.map((id) => provider.collections.publishEntry(slug, id)));
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["entries", slug] });
    },
  });
}

export function useBulkUnpublish(slug: string) {
  const provider = useProvider();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (ids: string[]) => {
      await Promise.all(ids.map((id) => provider.collections.unpublishEntry(slug, id)));
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["entries", slug] });
    },
  });
}

export function useRestoreEntry(slug: string) {
  const provider = useProvider();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => provider.collections.restoreEntry(slug, id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["entries", slug] });
    },
  });
}

export function useCreateApiToken() {
  const provider = useProvider();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; description?: string }) =>
      provider.settings.createApiToken(data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["api-tokens"] });
    },
  });
}

export function useDeleteApiToken() {
  const provider = useProvider();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => provider.settings.deleteApiToken(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["api-tokens"] });
    },
  });
}

export function useCreateWebhook() {
  const provider = useProvider();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      name: string;
      url: string;
      events: string[];
      collection?: string;
      secret?: string;
    }) => provider.settings.createWebhook(data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["webhooks"] });
    },
  });
}

export function useUpdateWebhook() {
  const provider = useProvider();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      data,
      id,
    }: {
      id: string;
      data: Partial<{
        name: string;
        url: string;
        events: string[];
        collection: string;
        enabled: boolean;
        secret: string;
      }>;
    }) => provider.settings.updateWebhook(id, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["webhooks"] });
    },
  });
}

export function useDeleteWebhook() {
  const provider = useProvider();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => provider.settings.deleteWebhook(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["webhooks"] });
    },
  });
}

export function useDeleteUser() {
  const provider = useProvider();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => provider.users.deleteUser(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });
}

export function useDeleteRole() {
  const provider = useProvider();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => provider.roles.deleteRole(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["roles"] });
    },
  });
}

export function useCreateUser() {
  const provider = useProvider();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { email: string; name?: string; password: string; role?: string }) =>
      provider.users.createUser(data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });
}

export function useUpdateUser() {
  const provider = useProvider();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ data, id }: { id: string; data: Record<string, unknown> }) =>
      provider.users.updateUser(id, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });
}

export function useUser(id: string) {
  const provider = useProvider();
  return useQuery({
    enabled: !!id,
    queryFn: () => provider.users.getUser(id),
    queryKey: ["user", id],
  });
}

export function useCreateRole() {
  const provider = useProvider();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      name: string;
      description: string;
      permissions: Array<{ action: string; resource: string }>;
    }) => provider.roles.createRole(data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["roles"] });
    },
  });
}

export function useUpdateRole() {
  const provider = useProvider();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ data, id }: { id: string; data: Record<string, unknown> }) =>
      provider.roles.updateRole(id, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["roles"] });
    },
  });
}

export function useRole(id: string) {
  const provider = useProvider();
  return useQuery({
    enabled: !!id,
    queryFn: () => provider.roles.getRole(id),
    queryKey: ["role", id],
  });
}

export function useCreateEntry(slug: string) {
  const provider = useProvider();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => provider.collections.createEntry(slug, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["entries", slug] });
    },
  });
}

export function useUpdateEntry(slug: string) {
  const provider = useProvider();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ data, id }: { id: string; data: Record<string, unknown> }) =>
      provider.collections.updateEntry(slug, id, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["entries", slug] });
    },
  });
}

export function usePublishEntry(slug: string) {
  const provider = useProvider();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => provider.collections.publishEntry(slug, id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["entries", slug] });
    },
  });
}

export function useUnpublishEntry(slug: string) {
  const provider = useProvider();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => provider.collections.unpublishEntry(slug, id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["entries", slug] });
    },
  });
}

export function useVersions(slug: string, entryId: string) {
  return useQuery({
    enabled: !!slug && !!entryId,
    queryFn: () => fetchVersions(slug, entryId),
    queryKey: ["versions", slug, entryId],
    staleTime: 30_000,
  });
}

export function useRestoreVersion(slug: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ entryId, versionId }: { entryId: string; versionId: string }) => {
      return restoreVersion(slug, entryId, versionId);
    },
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: ["entry", slug, variables.entryId] });
      void queryClient.invalidateQueries({ queryKey: ["versions", slug, variables.entryId] });
    },
  });
}

export function useSaveSchema() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      data,
      slug,
      type,
    }: {
      type: string;
      slug: string;
      data: { fields?: FieldDefinition[]; meta?: Record<string, unknown>; label?: string };
    }) => saveSchema(type, slug, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["collections"] });
      void queryClient.invalidateQueries({ queryKey: ["globals"] });
    },
  });
}

export function useUnsavedChanges(isDirty: boolean) {
  const blocker = useBlocker({
    enableBeforeUnload: isDirty,
    shouldBlockFn: () => isDirty,
    withResolver: true,
  });

  const confirmLeave = useCallback(() => {
    if (blocker.status === "blocked") {
      blocker.proceed();
    }
  }, [blocker]);

  const cancelLeave = useCallback(() => {
    if (blocker.status === "blocked") {
      blocker.reset();
    }
  }, [blocker]);

  return {
    cancelLeave,
    confirmLeave,
    isBlocking: blocker.status === "blocked",
  };
}
