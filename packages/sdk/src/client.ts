import type {
  ArcheConfig,
  RequestOptions,
  HttpMethod,
  RequestInterceptor,
  ResponseInterceptor,
  ErrorInterceptor,
} from "./types.js";

import { ApiError } from "./errors.js";

/** Low-level HTTP transport interface for making requests to the Arche API. */
export interface HttpClient {
  /**
   * Send an HTTP request and return the parsed JSON response.
   *
   * @param method - HTTP method
   * @param path - API path (e.g. `/api/posts`)
   * @param body - Optional JSON body for POST/PUT/PATCH requests
   * @param options - Optional request options including query parameters
   * @returns Parsed JSON response
   * @throws {ApiError} When the server returns a non-2xx status
   */
  request<T>(
    method: HttpMethod,
    path: string,
    body?: unknown,
    options?: RequestOptions,
  ): Promise<T>;
}

/** Registry of request, response, and error interceptors. */
export interface Interceptors {
  /** Interceptors that modify outgoing requests. */
  request: RequestInterceptor[];
  /** Interceptors that modify incoming responses. */
  response: ResponseInterceptor[];
  /** Interceptors that modify errors before they are thrown. */
  error: ErrorInterceptor[];
}

function buildUrl(
  baseUrl: string,
  path: string,
  params?: Record<string, string | number | boolean | undefined>,
): string {
  const base = baseUrl.replace(/\/+$/, "");
  let url = `${base}${path}`;
  if (params) {
    const searchParams = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined) {
        searchParams.set(key, String(value));
      }
    }
    const qs = searchParams.toString();
    if (qs) url += `?${qs}`;
  }
  return url;
}

function buildHeaders(token?: string): Record<string, string> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return headers;
}

function buildInit(
  method: HttpMethod,
  headers: Record<string, string>,
  body?: unknown,
  signal?: AbortSignal,
): RequestInit {
  const init: RequestInit = { headers, method };
  if (body !== undefined) {
    init.body = JSON.stringify(body);
  }
  if (signal) {
    init.signal = signal;
  }
  return init;
}

async function parseErrorResponse(response: Response): Promise<ApiError> {
  let errorData: {
    error?: string;
    code?: string;
    details?: Array<{ path: (string | number)[]; message: string }>;
  };
  try {
    errorData = (await response.json()) as typeof errorData;
  } catch {
    errorData = { error: response.statusText };
  }
  return new ApiError(
    response.status,
    errorData.error ?? response.statusText,
    errorData.details,
    errorData.code,
  );
}

async function applyRequestInterceptors(
  interceptors: RequestInterceptor[],
  config: ArcheConfig,
  url: string,
  init: RequestInit,
): Promise<{ url: string; init: RequestInit }> {
  let currentUrl = url;
  let currentInit = init;
  for (const interceptor of interceptors) {
    const result = await interceptor({ ...config, init: currentInit, url: currentUrl });
    currentUrl = result.url;
    currentInit = result.init;
  }
  return { init: currentInit, url: currentUrl };
}

async function applyResponseInterceptors(
  interceptors: ResponseInterceptor[],
  response: Response,
): Promise<Response> {
  let current = response;
  for (const interceptor of interceptors) {
    current = await interceptor(current);
  }
  return current;
}

async function applyErrorInterceptors(
  interceptors: ErrorInterceptor[],
  error: ApiError,
): Promise<ApiError> {
  let current: Error = error;
  for (const interceptor of interceptors) {
    current = await interceptor(current);
  }
  return current as ApiError;
}

/**
 * Create a low-level HTTP client for the Arche API.
 *
 * Prefer using {@link createClient} for most use cases. This factory is exposed
 * for advanced scenarios such as extending the client with custom sub-clients.
 *
 * @param config - Client configuration
 * @returns HTTP client with interceptor support and token management
 */
export function createHttpClient(config: ArcheConfig): HttpClient & {
  interceptors: Interceptors;
  setToken(token: string): void;
  getToken(): string | undefined;
} {
  const fetchFn = config.fetch ?? globalThis.fetch;
  let token = config.token;
  const interceptors: Interceptors = { error: [], request: [], response: [] };

  async function request<T>(
    method: HttpMethod,
    path: string,
    body?: unknown,
    options?: RequestOptions,
  ): Promise<T> {
    let url = buildUrl(config.baseUrl, path, options?.params);
    const headers = buildHeaders(token);
    let init = buildInit(method, headers, body, options?.signal ?? undefined);

    const intercepted = await applyRequestInterceptors(interceptors.request, config, url, init);
    url = intercepted.url;
    init = intercepted.init;

    let response = await fetchFn(url, init);
    response = await applyResponseInterceptors(interceptors.response, response);

    if (!response.ok) {
      const error = await parseErrorResponse(response);
      throw await applyErrorInterceptors(interceptors.error, error);
    }

    if (response.status === 204) {
      return undefined as T;
    }

    return response.json() as Promise<T>;
  }

  return {
    getToken() {
      return token;
    },
    interceptors,
    request,
    setToken(newToken: string) {
      token = newToken;
    },
  };
}
