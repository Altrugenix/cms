import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import {
  fetchCollections,
  fetchGlobals,
  fetchGlobal,
  fetchApiTokens,
  fetchWebhooks,
  fetchWebhook,
  fetchPlugins,
  fetchUsers,
  fetchRoles,
  fetchVersions,
  restoreVersion,
  saveSchema,
  createApiToken,
  deleteApiToken,
  createWebhook,
  updateWebhook,
  deleteWebhook,
  apiFetch,
  type CollectionMeta,
  type GlobalMeta,
  type FieldDefinition,
} from "@/lib/api";

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

export function useGlobal(slug: string) {
  const { data: globals = [], error, isLoading } = useGlobals();
  return {
    error,
    global: globals.find((g: GlobalMeta) => g.slug === slug),
    isLoading,
  };
}

export function useGlobalData(slug: string) {
  return useQuery({
    queryFn: () => fetchGlobal(slug),
    queryKey: ["global", slug],
    staleTime: 30_000,
  });
}

export function useEntries(slug: string, params: Record<string, string> = {}) {
  return useQuery({
    enabled: !!slug,
    queryFn: async () => {
      const searchParams = new URLSearchParams(params);
      return apiFetch<{ data: Record<string, unknown>[]; total: number }>(
        `/api/${slug}?${searchParams}`,
      );
    },
    queryKey: ["entries", slug, params],
  });
}

export function useEntry(slug: string, id: string, locale = "en") {
  return useQuery({
    enabled: !!slug && !!id,
    queryFn: () => apiFetch<Record<string, unknown>>(`/api/${slug}/${id}?locale=${locale}`),
    queryKey: ["entry", slug, id, locale],
  });
}

export function useDashboardData(colSlugs: string[]) {
  return useQuery({
    enabled: colSlugs.length > 0,
    queryFn: async () => {
      const counts = await Promise.all(
        colSlugs.map(async (slug) => {
          try {
            const data = await apiFetch<{ total: number }>(`/api/${slug}`);
            return { entryCount: data.total, slug };
          } catch {
            return { entryCount: 0, slug };
          }
        }),
      );
      const { fetchActivity, fetchMedia, fetchUsers } = await import("@/lib/api");
      const [usersRes, mediaRes, activityRes] = await Promise.all([
        fetchUsers(),
        fetchMedia(),
        fetchActivity().catch(() => ({ data: [], total: 0 })),
      ]);
      return { activityRes, counts, mediaRes, usersRes };
    },
    queryKey: ["dashboard", colSlugs],
    staleTime: 30_000,
  });
}

export function useApiTokensList(params?: { limit?: number; offset?: number }) {
  return useQuery({
    queryFn: () => fetchApiTokens(params),
    queryKey: ["api-tokens", params],
    staleTime: 30_000,
  });
}

export function useUsersList(params?: { limit?: number; offset?: number }) {
  return useQuery({
    queryFn: () => fetchUsers(params),
    queryKey: ["users", params],
    staleTime: 30_000,
  });
}

export function useRolesList(params?: { limit?: number; offset?: number }) {
  return useQuery({
    queryFn: () => fetchRoles(params),
    queryKey: ["roles", params],
    staleTime: 30_000,
  });
}

export function useWebhooksList(params?: { limit?: number; offset?: number }) {
  return useQuery({
    queryFn: () => fetchWebhooks(params),
    queryKey: ["webhooks", params],
    staleTime: 30_000,
  });
}

export function useWebhook(id: string) {
  return useQuery({
    enabled: !!id,
    queryFn: () => fetchWebhook(id),
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
  return useQuery({
    enabled: !!to,
    queryFn: async () => {
      const data = await apiFetch<{ data: Array<Record<string, unknown>> }>(`/api/${to}`);
      return data.data.map((e) => ({
        id: String(e.id),
        label: (e.title ?? e.name ?? e.id) as string,
      }));
    },
    queryKey: ["relation-entries", to],
  });
}

export function useCollectionEntryCounts(slugs: string[]) {
  return useQuery({
    enabled: slugs.length > 0,
    queryFn: async () => {
      const counts = await Promise.all(
        slugs.map(async (slug) => {
          try {
            const data = await apiFetch<{ total: number }>(`/api/${slug}`);
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
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const { saveGlobal } = await import("@/lib/api");
      return saveGlobal(slug, data);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["global", slug] });
    },
  });
}

export function useDeleteEntry(slug: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await apiFetch(`/api/${slug}/${id}`, { method: "DELETE" });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["entries", slug] });
    },
  });
}

export function useBulkDelete(slug: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (ids: string[]) => {
      await apiFetch(`/api/${slug}/bulk-delete`, {
        body: JSON.stringify({ ids }),
        method: "POST",
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["entries", slug] });
    },
  });
}

export function useBulkPublish(slug: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (ids: string[]) => {
      await apiFetch(`/api/${slug}/bulk-publish`, {
        body: JSON.stringify({ ids }),
        method: "POST",
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["entries", slug] });
    },
  });
}

export function useBulkUnpublish(slug: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (ids: string[]) => {
      await apiFetch(`/api/${slug}/bulk-unpublish`, {
        body: JSON.stringify({ ids }),
        method: "POST",
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["entries", slug] });
    },
  });
}

export function useRestoreEntry(slug: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await apiFetch(`/api/${slug}/${id}/restore`, { method: "POST" });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["entries", slug] });
    },
  });
}

export function useCreateApiToken() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; description?: string }) => createApiToken(data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["api-tokens"] });
    },
  });
}

export function useDeleteApiToken() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteApiToken(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["api-tokens"] });
    },
  });
}

export function useCreateWebhook() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      name: string;
      url: string;
      events: string[];
      collection?: string;
      secret?: string;
    }) => createWebhook(data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["webhooks"] });
    },
  });
}

export function useUpdateWebhook() {
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
    }) => updateWebhook(id, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["webhooks"] });
    },
  });
}

export function useDeleteWebhook() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteWebhook(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["webhooks"] });
    },
  });
}

export function useDeleteUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { deleteUser } = await import("@/lib/api");
      return deleteUser(id);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });
}

export function useDeleteRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { deleteRole } = await import("@/lib/api");
      return deleteRole(id);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["roles"] });
    },
  });
}

export function useCreateEntry(slug: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      return apiFetch(`/api/${slug}`, {
        body: JSON.stringify(data),
        method: "POST",
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["entries", slug] });
    },
  });
}

export function useUpdateEntry(slug: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ data, id }: { id: string; data: Record<string, unknown> }) => {
      return apiFetch(`/api/${slug}/${id}`, {
        body: JSON.stringify(data),
        method: "PATCH",
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["entries", slug] });
    },
  });
}

export function usePublishEntry(slug: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await apiFetch(`/api/${slug}/${id}/publish`, { method: "POST" });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["entries", slug] });
    },
  });
}

export function useUnpublishEntry(slug: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await apiFetch(`/api/${slug}/${id}/unpublish`, { method: "POST" });
    },
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

export {
  useCreateApiToken as useCreateApiTokenMutation,
  useDeleteApiToken as useDeleteApiTokenMutation,
  useCreateWebhook as useCreateWebhookMutation,
  useUpdateWebhook as useUpdateWebhookMutation,
  useDeleteWebhook as useDeleteWebhookMutation,
  useDeleteUser as useDeleteUserMutation,
  useDeleteRole as useDeleteRoleMutation,
};
