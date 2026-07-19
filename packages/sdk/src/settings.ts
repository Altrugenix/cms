import type { HttpClient } from "./client.js";
import type {
  ApiTokenMeta,
  ApiTokenCreateResponse,
  WebhookMeta,
  PaginatedResponse,
} from "./types.js";

export interface ApiTokensClient {
  list(params?: { limit?: number; offset?: number }): Promise<PaginatedResponse<ApiTokenMeta>>;
  create(data: {
    name: string;
    description?: string;
    role?: string;
  }): Promise<ApiTokenCreateResponse>;
  delete(id: string): Promise<{ message: string }>;
}

export interface WebhooksClient {
  list(params?: { limit?: number; offset?: number }): Promise<PaginatedResponse<WebhookMeta>>;
  get(id: string): Promise<WebhookMeta>;
  create(data: {
    name: string;
    url: string;
    events: string[];
    collection?: string;
    secret?: string;
  }): Promise<WebhookMeta>;
  update(
    id: string,
    data: {
      name?: string;
      url?: string;
      events?: string[];
      collection?: string;
      enabled?: boolean;
      secret?: string;
    },
  ): Promise<WebhookMeta>;
  delete(id: string): Promise<{ message: string }>;
}

export interface SettingsClient {
  apiTokens: ApiTokensClient;
  webhooks: WebhooksClient;
}

function createApiTokensClient(http: HttpClient): ApiTokensClient {
  const base = "/api/settings/api-tokens";

  return {
    create(data) {
      return http.request("POST", base, data);
    },
    delete(id) {
      return http.request("DELETE", `${base}/${id}`);
    },
    list(params) {
      const query: Record<string, string | number> = {};
      if (params?.limit !== undefined) query.limit = params.limit;
      if (params?.offset !== undefined) query.offset = params.offset;
      return http.request("GET", base, undefined, {
        params: Object.keys(query).length ? query : undefined,
      });
    },
  };
}

function createWebhooksClient(http: HttpClient): WebhooksClient {
  const base = "/api/settings/webhooks";

  return {
    create(data) {
      return http.request("POST", base, data);
    },
    delete(id) {
      return http.request("DELETE", `${base}/${id}`);
    },
    get(id) {
      return http.request("GET", `${base}/${id}`);
    },
    list(params) {
      const query: Record<string, string | number> = {};
      if (params?.limit !== undefined) query.limit = params.limit;
      if (params?.offset !== undefined) query.offset = params.offset;
      return http.request("GET", base, undefined, {
        params: Object.keys(query).length ? query : undefined,
      });
    },
    update(id, data) {
      return http.request("PUT", `${base}/${id}`, data);
    },
  };
}

export function createSettingsClient(http: HttpClient): SettingsClient {
  return {
    apiTokens: createApiTokensClient(http),
    webhooks: createWebhooksClient(http),
  };
}
