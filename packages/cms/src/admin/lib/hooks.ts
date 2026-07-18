import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import {
  fetchCollections,
  fetchGlobals,
  fetchGlobal,
  fetchApiTokens,
  fetchWebhooks,
  fetchWebhook,
  fetchPlugins,
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
  const { data: collections = [] } = useCollections();
  return {
    collection: collections.find((c: CollectionMeta) => c.slug === slug),
    error: null,
    isLoading: false,
  };
}

export function useGlobal(slug: string) {
  const { data: globals = [] } = useGlobals();
  return {
    error: null,
    global: globals.find((g: GlobalMeta) => g.slug === slug),
    isLoading: false,
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

export function useApiTokensList() {
  return useQuery({
    queryFn: fetchApiTokens,
    queryKey: ["api-tokens"],
    staleTime: 30_000,
  });
}

export function useWebhooksList() {
  return useQuery({
    queryFn: fetchWebhooks,
    queryKey: ["webhooks"],
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

export function usePublishEntry(slug: string) {
  return useMutation({
    mutationFn: async (id: string) => {
      await apiFetch(`/api/${slug}/${id}/publish`, { method: "POST" });
    },
  });
}

export function useUnpublishEntry(slug: string) {
  return useMutation({
    mutationFn: async (id: string) => {
      await apiFetch(`/api/${slug}/${id}/unpublish`, { method: "POST" });
    },
  });
}

export function useRestoreEntry(slug: string) {
  return useMutation({
    mutationFn: async (id: string) => {
      await apiFetch(`/api/${slug}/${id}/restore`, { method: "POST" });
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
};
