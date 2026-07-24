import type { HttpClient } from "./client.js";
import type {
  ApiTokenMeta,
  ApiTokenCreateResponse,
  WebhookMeta,
  PaginatedResponse,
} from "./types.js";

/** Client for managing API tokens. Requires admin privileges. */
export interface ApiTokensClient {
  /**
   * List API tokens with optional pagination.
   *
   * @param params - Pagination parameters
   */
  list(params?: { limit?: number; offset?: number }): Promise<PaginatedResponse<ApiTokenMeta>>;
  /**
   * Create a new API token. The `rawToken` in the response is shown once
   * and cannot be retrieved later.
   *
   * @param data - Token configuration (name, optional description, optional role)
   * @returns Token metadata and the raw token value
   */
  create(data: {
    name: string;
    description?: string;
    role?: string;
  }): Promise<ApiTokenCreateResponse>;
  /**
   * Delete an API token.
   *
   * @param id - Token ID
   */
  delete(id: string): Promise<{ message: string }>;
}

/** Client for managing webhooks. */
export interface WebhooksClient {
  /**
   * List webhooks with optional pagination.
   *
   * @param params - Pagination parameters
   */
  list(params?: { limit?: number; offset?: number }): Promise<PaginatedResponse<WebhookMeta>>;
  /**
   * Get a single webhook by ID.
   *
   * @param id - Webhook ID
   */
  get(id: string): Promise<WebhookMeta>;
  /**
   * Create a new webhook.
   *
   * @param data - Webhook configuration
   */
  create(data: {
    name: string;
    /** URL to send HTTP requests to. */
    url: string;
    /** Events that trigger this webhook (e.g. `["collection.create"]`). */
    events: string[];
    /** Optional collection slug to scope the webhook to. */
    collection?: string;
    /** Signing secret for HMAC verification. */
    secret?: string;
  }): Promise<WebhookMeta>;
  /**
   * Update a webhook's configuration.
   *
   * @param id - Webhook ID
   * @param data - Fields to update
   */
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
  /**
   * Delete a webhook.
   *
   * @param id - Webhook ID
   */
  delete(id: string): Promise<{ message: string }>;
}

/** Container for settings sub-clients. */
export interface SettingsClient {
  /** API token management. */
  apiTokens: ApiTokensClient;
  /** Webhook management. */
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

/**
 * Create a settings client.
 *
 * @internal Use `client.settings` instead of calling this directly.
 */
export function createSettingsClient(http: HttpClient): SettingsClient {
  return {
    apiTokens: createApiTokensClient(http),
    webhooks: createWebhooksClient(http),
  };
}
