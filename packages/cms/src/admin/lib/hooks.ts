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
    queryKey: ["collections"],
    queryFn: fetchCollections,
    staleTime: 30_000,
  });
}

export function useGlobals() {
  return useQuery({
    queryKey: ["globals"],
    queryFn: fetchGlobals,
    staleTime: 30_000,
  });
}

export function useCollection(slug: string) {
  const { data: collections = [] } = useCollections();
  return {
    collection: collections.find((c: CollectionMeta) => c.slug === slug),
    isLoading: false,
    error: null,
  };
}

export function useGlobal(slug: string) {
  const { data: globals = [] } = useGlobals();
  return {
    global: globals.find((g: GlobalMeta) => g.slug === slug),
    isLoading: false,
    error: null,
  };
}

export function useGlobalData(slug: string) {
  return useQuery({
    queryKey: ["global", slug],
    queryFn: () => fetchGlobal(slug),
    staleTime: 30_000,
  });
}

export function useEntries(slug: string, params: Record<string, string> = {}) {
  return useQuery({
    queryKey: ["entries", slug, params],
    queryFn: async () => {
      const searchParams = new URLSearchParams(params);
      return apiFetch<{ data: Record<string, unknown>[]; total: number }>(
        `/api/${slug}?${searchParams}`,
      );
    },
    enabled: !!slug,
  });
}

export function useEntry(slug: string, id: string, locale = "en") {
  return useQuery({
    queryKey: ["entry", slug, id, locale],
    queryFn: () => apiFetch<Record<string, unknown>>(`/api/${slug}/${id}?locale=${locale}`),
    enabled: !!slug && !!id,
  });
}

export function useDashboardData(colSlugs: string[]) {
  return useQuery({
    queryKey: ["dashboard", colSlugs],
    queryFn: async () => {
      const counts = await Promise.all(
        colSlugs.map(async (slug) => {
          try {
            const data = await apiFetch<{ total: number }>(`/api/${slug}`);
            return { slug, entryCount: data.total };
          } catch {
            return { slug, entryCount: 0 };
          }
        }),
      );
      const { fetchUsers, fetchMedia, fetchActivity } = await import("@/lib/api");
      const [usersRes, mediaRes, activityRes] = await Promise.all([
        fetchUsers(),
        fetchMedia(),
        fetchActivity().catch(() => ({ data: [], total: 0 })),
      ]);
      return { counts, usersRes, mediaRes, activityRes };
    },
    enabled: colSlugs.length > 0,
    staleTime: 30_000,
  });
}

export function useApiTokensList() {
  return useQuery({
    queryKey: ["api-tokens"],
    queryFn: fetchApiTokens,
    staleTime: 30_000,
  });
}

export function useWebhooksList() {
  return useQuery({
    queryKey: ["webhooks"],
    queryFn: fetchWebhooks,
    staleTime: 30_000,
  });
}

export function useWebhook(id: string) {
  return useQuery({
    queryKey: ["webhook", id],
    queryFn: () => fetchWebhook(id),
    enabled: !!id,
  });
}

export function usePluginsList() {
  return useQuery({
    queryKey: ["plugins"],
    queryFn: fetchPlugins,
    staleTime: 30_000,
  });
}

export function useRelationEntries(to: string) {
  return useQuery({
    queryKey: ["relation-entries", to],
    queryFn: async () => {
      const data = await apiFetch<{ data: Array<Record<string, unknown>> }>(`/api/${to}`);
      return data.data.map((e) => ({
        id: String(e.id),
        label: (e.title ?? e.name ?? e.id) as string,
      }));
    },
    enabled: !!to,
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
      queryClient.invalidateQueries({ queryKey: ["global", slug] });
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
      queryClient.invalidateQueries({ queryKey: ["entries", slug] });
    },
  });
}

export function useBulkDelete(slug: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (ids: string[]) => {
      await apiFetch(`/api/${slug}/bulk-delete`, {
        method: "POST",
        body: JSON.stringify({ ids }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["entries", slug] });
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
      queryClient.invalidateQueries({ queryKey: ["api-tokens"] });
    },
  });
}

export function useDeleteApiToken() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteApiToken(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["api-tokens"] });
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
      queryClient.invalidateQueries({ queryKey: ["webhooks"] });
    },
  });
}

export function useUpdateWebhook() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      data,
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
      queryClient.invalidateQueries({ queryKey: ["webhooks"] });
    },
  });
}

export function useDeleteWebhook() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteWebhook(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["webhooks"] });
    },
  });
}

export function useSaveSchema() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      type,
      slug,
      data,
    }: {
      type: string;
      slug: string;
      data: { fields?: FieldDefinition[]; meta?: Record<string, unknown>; label?: string };
    }) => saveSchema(type, slug, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["collections"] });
      queryClient.invalidateQueries({ queryKey: ["globals"] });
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
