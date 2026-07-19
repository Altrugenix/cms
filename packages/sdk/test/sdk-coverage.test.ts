import { describe, it, expect, vi } from "vitest";

import { ApiError } from "../src/errors.js";
import { createClient, createHttpClient } from "../src/index.js";
import { createMediaClient } from "../src/media.js";

function mockFetch(responses: Array<{ status: number; body: unknown; statusText?: string }>) {
  let callCount = 0;
  return vi.fn(async () => {
    const res = responses[callCount++] ?? { body: {}, status: 200 };
    const init: ResponseInit = {
      headers: { "Content-Type": "application/json" },
      status: res.status,
    };
    if (res.statusText) init.statusText = res.statusText;
    const body = res.status === 204 ? null : JSON.stringify(res.body);
    return new Response(body, init);
  });
}

function jsonResponse(body: unknown, status = 200) {
  return { body, status };
}

describe("client interceptors", () => {
  it("request interceptor can modify url and headers", async () => {
    const fetchFn = mockFetch([jsonResponse({ ok: true })]);
    const http = createHttpClient({
      baseUrl: "http://localhost:3000",
      fetch: fetchFn,
    });

    http.interceptors.request.push((config) => {
      return {
        ...config,
        init: {
          ...config.init,
          headers: {
            ...(config.init.headers as Record<string, string>),
            "X-Custom": "yes",
          },
        },
        url: config.url + "?injected=true",
      };
    });

    const result: { ok: boolean } = await http.request("GET", "/api/test");

    expect(result.ok).toBe(true);
    expect(fetchFn).toHaveBeenCalledWith(
      "http://localhost:3000/api/test?injected=true",
      expect.objectContaining({
        headers: expect.objectContaining({ "X-Custom": "yes" }),
      }),
    );
  });

  it("response interceptor can modify the response", async () => {
    const fetchFn = mockFetch([jsonResponse({ original: true })]);
    const http = createHttpClient({
      baseUrl: "http://localhost:3000",
      fetch: fetchFn,
    });

    http.interceptors.response.push(async (response) => {
      const body = await response.json();
      return new Response(JSON.stringify({ ...body, intercepted: true }), {
        headers: { "content-type": "application/json" },
        status: response.status,
      });
    });

    const result: { original: boolean; intercepted: boolean } = await http.request(
      "GET",
      "/api/test",
    );

    expect(result.original).toBe(true);
    expect(result.intercepted).toBe(true);
  });

  it("error interceptor can modify the error", async () => {
    const fetchFn = mockFetch([jsonResponse({ error: "gone" }, 410)]);
    const http = createHttpClient({
      baseUrl: "http://localhost:3000",
      fetch: fetchFn,
    });

    http.interceptors.error.push(async (error) => {
      return new ApiError(error.status, `Intercepted: ${error.message}`, undefined, "CUSTOM_CODE");
    });

    const error = await http.request("GET", "/api/test").catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).message).toBe("Intercepted: gone");
    expect((error as ApiError).code).toBe("CUSTOM_CODE");
  });

  it("multiple interceptors run in order", async () => {
    const fetchFn = mockFetch([jsonResponse({ value: 1 })]);
    const http = createHttpClient({
      baseUrl: "http://localhost:3000",
      fetch: fetchFn,
    });

    const order: string[] = [];

    http.interceptors.request.push(async (config) => {
      order.push("req1");
      return config;
    });
    http.interceptors.request.push(async (config) => {
      order.push("req2");
      return config;
    });

    http.interceptors.response.push(async (response) => {
      order.push("res1");
      return response;
    });

    await http.request("GET", "/api/test");

    expect(order).toEqual(["req1", "req2", "res1"]);
  });

  it("returns undefined for 204 No Content", async () => {
    const fetchFn = mockFetch([{ body: "", status: 204 }]);
    const http = createHttpClient({
      baseUrl: "http://localhost:3000",
      fetch: fetchFn,
    });

    const result = await http.request("DELETE", "/api/resource/1");

    expect(result).toBeUndefined();
  });

  it("getToken returns current token", () => {
    const http = createHttpClient({
      baseUrl: "http://localhost:3000",
      token: "initial",
    });

    expect(http.getToken()).toBe("initial");
  });

  it("setToken updates token used in requests", async () => {
    const fetchFn = mockFetch([jsonResponse({ ok: true }), jsonResponse({ ok: true })]);
    const http = createHttpClient({
      baseUrl: "http://localhost:3000",
      fetch: fetchFn,
    });

    await http.request("GET", "/api/test");
    let init = fetchFn.mock.calls[0][1] as RequestInit;
    expect((init.headers as Record<string, string>)["Authorization"]).toBeUndefined();

    http.setToken("mytoken");
    await http.request("GET", "/api/test");
    init = fetchFn.mock.calls[1][1] as RequestInit;
    expect((init.headers as Record<string, string>)["Authorization"]).toBe("Bearer mytoken");
  });

  it("passes AbortSignal to fetch", async () => {
    const controller = new AbortController();
    const fetchFn = mockFetch([jsonResponse({ ok: true })]);
    const http = createHttpClient({
      baseUrl: "http://localhost:3000",
      fetch: fetchFn,
    });

    await http.request("GET", "/api/test", undefined, { signal: controller.signal } as never);

    const init = fetchFn.mock.calls[0][1] as RequestInit;
    expect(init.signal).toBe(controller.signal);
  });

  it("catch block handles unparseable json response body", async () => {
    const fetchFn = vi.fn(async () => {
      return new Response("not valid json at all", {
        headers: { "content-type": "text/plain" },
        status: 500,
        statusText: "Internal Server Error",
      });
    });
    const http = createHttpClient({
      baseUrl: "http://localhost:3000",
      fetch: fetchFn,
    });

    const error = await http.request("GET", "/api/test").catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).status).toBe(500);
    expect((error as ApiError).message).toBe("Internal Server Error");
  });
});

describe("error parsing fallbacks", () => {
  it("uses statusText when response body is not json", async () => {
    const fetchFn = mockFetch([{ body: "", status: 500, statusText: "Internal Server Error" }]);
    const http = createHttpClient({
      baseUrl: "http://localhost:3000",
      fetch: fetchFn,
    });

    const error = await http.request("GET", "/api/test").catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).status).toBe(500);
    expect((error as ApiError).message).toBe("Internal Server Error");
  });

  it("falls back to statusText when error field is missing from json", async () => {
    const fetchFn = mockFetch([jsonResponse({ code: "ERR" }, 422)]);
    const http = createHttpClient({
      baseUrl: "http://localhost:3000",
      fetch: fetchFn,
    });

    const error = await http.request("GET", "/api/test").catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).status).toBe(422);
  });
});

describe("media additional coverage", () => {
  it("getFile fetches the file directly using global fetch", async () => {
    const mockGlobalFetch = vi.fn(
      async () =>
        new Response("file-content", {
          headers: { "content-type": "image/png" },
          status: 200,
        }),
    );

    const http = createHttpClient({
      baseUrl: "http://localhost:3000",
      token: "test-token",
    });

    const media = createMediaClient(http);

    const originalFetch = globalThis.fetch;
    globalThis.fetch = mockGlobalFetch;

    try {
      const resp = await media.getFile("file-123");
      expect(mockGlobalFetch).toHaveBeenCalledWith("/api/media/file/file-123", {
        headers: {
          Authorization: "Bearer test-token",
        },
      });
      const text = await resp.text();
      expect(text).toBe("file-content");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("update sends PATCH with data", async () => {
    const fetchFn = mockFetch([jsonResponse({ id: "1", originalName: "new-name.png" })]);
    const http = createHttpClient({
      baseUrl: "http://localhost:3000",
      fetch: fetchFn,
    });

    const media = createMediaClient(http);
    const result = await media.update("1", { originalName: "new-name.png" });

    expect(result.originalName).toBe("new-name.png");
    expect(fetchFn).toHaveBeenCalledWith(
      "http://localhost:3000/api/media/1",
      expect.objectContaining({ method: "PATCH" }),
    );
  });

  it("folders.update sends PATCH", async () => {
    const fetchFn = mockFetch([jsonResponse({ id: "1", name: "Renamed" })]);
    const http = createHttpClient({
      baseUrl: "http://localhost:3000",
      fetch: fetchFn,
    });

    const media = createMediaClient(http);
    const result = await media.folders.update("1", { name: "Renamed" });

    expect(result.name).toBe("Renamed");
    expect(fetchFn).toHaveBeenCalledWith(
      "http://localhost:3000/api/media/folders/1",
      expect.objectContaining({ method: "PATCH" }),
    );
  });

  it("list with offset and folderId params", async () => {
    const fetchFn = mockFetch([jsonResponse({ data: [], total: 0 })]);
    const http = createHttpClient({
      baseUrl: "http://localhost:3000",
      fetch: fetchFn,
    });

    const media = createMediaClient(http);
    await media.list({ folderId: "folder-abc", offset: 5 });

    const url = fetchFn.mock.calls[0][0] as string;
    expect(url).toContain("offset=5");
    expect(url).toContain("folderId=folder-abc");
  });

  it("list without params passes undefined query", async () => {
    const fetchFn = mockFetch([jsonResponse({ data: [], total: 0 })]);
    const http = createHttpClient({
      baseUrl: "http://localhost:3000",
      fetch: fetchFn,
    });

    const media = createMediaClient(http);
    await media.list();

    expect(fetchFn).toHaveBeenCalledWith("http://localhost:3000/api/media", expect.anything());
  });

  it("folders.list with parentId param", async () => {
    const fetchFn = mockFetch([jsonResponse({ data: [], total: 0 })]);
    const http = createHttpClient({
      baseUrl: "http://localhost:3000",
      fetch: fetchFn,
    });

    const media = createMediaClient(http);
    await media.folders.list({ parentId: "parent-1" });

    const url = fetchFn.mock.calls[0][0] as string;
    expect(url).toContain("parentId=parent-1");
  });

  it("folders.list with limit and offset params", async () => {
    const fetchFn = mockFetch([jsonResponse({ data: [], total: 0 })]);
    const http = createHttpClient({
      baseUrl: "http://localhost:3000",
      fetch: fetchFn,
    });

    const media = createMediaClient(http);
    await media.folders.list({ limit: 10, offset: 20 });

    const url = fetchFn.mock.calls[0][0] as string;
    expect(url).toContain("limit=10");
    expect(url).toContain("offset=20");
  });

  it("folders.list without params passes undefined query", async () => {
    const fetchFn = mockFetch([jsonResponse({ data: [], total: 0 })]);
    const http = createHttpClient({
      baseUrl: "http://localhost:3000",
      fetch: fetchFn,
    });

    const media = createMediaClient(http);
    await media.folders.list();

    expect(fetchFn).toHaveBeenCalledWith(
      "http://localhost:3000/api/media/folders",
      expect.anything(),
    );
  });

  it("folders.get returns folder", async () => {
    const fetchFn = mockFetch([jsonResponse({ id: "1", name: "Images" })]);
    const http = createHttpClient({
      baseUrl: "http://localhost:3000",
      fetch: fetchFn,
    });

    const media = createMediaClient(http);
    const result = await media.folders.get("1");

    expect(result.name).toBe("Images");
    expect(fetchFn).toHaveBeenCalledWith(
      "http://localhost:3000/api/media/folders/1",
      expect.objectContaining({ method: "GET" }),
    );
  });

  it("folders.delete sends DELETE", async () => {
    const fetchFn = mockFetch([jsonResponse({ message: "Deleted" })]);
    const http = createHttpClient({
      baseUrl: "http://localhost:3000",
      fetch: fetchFn,
    });

    const media = createMediaClient(http);
    const result = await media.folders.delete("1");

    expect(result.message).toBe("Deleted");
    expect(fetchFn).toHaveBeenCalledWith(
      "http://localhost:3000/api/media/folders/1",
      expect.objectContaining({ method: "DELETE" }),
    );
  });
});

describe("roles additional coverage", () => {
  it("get returns a single role", async () => {
    const fetchFn = mockFetch([
      jsonResponse({ description: "Full access", id: "1", name: "Admin" }),
    ]);
    const client = createClient({ baseUrl: "http://localhost:3000", fetch: fetchFn });
    const result = await client.roles.get("1");

    expect(result.name).toBe("Admin");
    expect(fetchFn).toHaveBeenCalledWith(
      "http://localhost:3000/api/roles/1",
      expect.objectContaining({ method: "GET" }),
    );
  });

  it("list with limit and offset params", async () => {
    const fetchFn = mockFetch([jsonResponse({ data: [], total: 0 })]);
    const client = createClient({ baseUrl: "http://localhost:3000", fetch: fetchFn });
    await client.roles.list({ limit: 10, offset: 5 });

    const url = fetchFn.mock.calls[0][0] as string;
    expect(url).toContain("limit=10");
    expect(url).toContain("offset=5");
  });
});

describe("users additional coverage", () => {
  it("get returns a single user", async () => {
    const fetchFn = mockFetch([jsonResponse({ email: "user@test.com", id: "1", role: "admin" })]);
    const client = createClient({ baseUrl: "http://localhost:3000", fetch: fetchFn });
    const result = await client.users.get("1");

    expect(result.email).toBe("user@test.com");
    expect(fetchFn).toHaveBeenCalledWith(
      "http://localhost:3000/api/users/1",
      expect.objectContaining({ method: "GET" }),
    );
  });

  it("list with limit and offset params", async () => {
    const fetchFn = mockFetch([jsonResponse({ data: [], total: 0 })]);
    const client = createClient({ baseUrl: "http://localhost:3000", fetch: fetchFn });
    await client.users.list({ limit: 10, offset: 5 });

    const url = fetchFn.mock.calls[0][0] as string;
    expect(url).toContain("limit=10");
    expect(url).toContain("offset=5");
  });
});

describe("settings additional coverage", () => {
  it("webhooks.get returns a single webhook", async () => {
    const fetchFn = mockFetch([
      jsonResponse({ enabled: true, id: "1", name: "Hook", url: "https://example.com" }),
    ]);
    const client = createClient({ baseUrl: "http://localhost:3000", fetch: fetchFn });
    const result = await client.settings.webhooks.get("1");

    expect(result.name).toBe("Hook");
    expect(fetchFn).toHaveBeenCalledWith(
      "http://localhost:3000/api/settings/webhooks/1",
      expect.objectContaining({ method: "GET" }),
    );
  });

  it("apiTokens.list with params", async () => {
    const fetchFn = mockFetch([jsonResponse({ data: [], total: 0 })]);
    const client = createClient({ baseUrl: "http://localhost:3000", fetch: fetchFn });
    await client.settings.apiTokens.list({ limit: 5, offset: 10 });

    const url = fetchFn.mock.calls[0][0] as string;
    expect(url).toContain("limit=5");
    expect(url).toContain("offset=10");
  });

  it("webhooks.list with params", async () => {
    const fetchFn = mockFetch([jsonResponse({ data: [], total: 0 })]);
    const client = createClient({ baseUrl: "http://localhost:3000", fetch: fetchFn });
    await client.settings.webhooks.list({ limit: 3 });

    const url = fetchFn.mock.calls[0][0] as string;
    expect(url).toContain("limit=3");
  });

  it("webhooks.list with offset param", async () => {
    const fetchFn = mockFetch([jsonResponse({ data: [], total: 0 })]);
    const client = createClient({ baseUrl: "http://localhost:3000", fetch: fetchFn });
    await client.settings.webhooks.list({ offset: 10 });

    const url = fetchFn.mock.calls[0][0] as string;
    expect(url).toContain("offset=10");
  });
});

describe("activity additional coverage", () => {
  it("list with no params sends no query", async () => {
    const fetchFn = mockFetch([jsonResponse({ data: [], total: 0 })]);
    const client = createClient({ baseUrl: "http://localhost:3000", fetch: fetchFn });
    await client.activity.list();

    expect(fetchFn).toHaveBeenCalledWith(
      "http://localhost:3000/api/activity",
      expect.objectContaining({ method: "GET" }),
    );
  });
});

describe("collection additional coverage", () => {
  it("list with populate and locale params", async () => {
    const fetchFn = mockFetch([jsonResponse({ data: [], total: 0 })]);
    const client = createClient({ baseUrl: "http://localhost:3000", fetch: fetchFn });
    await client.collection("posts").list({ locale: "en", populate: ["author"] });

    const url = fetchFn.mock.calls[0][0] as string;
    expect(url).toContain("populate=author");
    expect(url).toContain("locale=en");
  });

  it("list with deleted param", async () => {
    const fetchFn = mockFetch([jsonResponse({ data: [], total: 0 })]);
    const client = createClient({ baseUrl: "http://localhost:3000", fetch: fetchFn });
    await client.collection("posts").list({ deleted: true });

    const url = fetchFn.mock.calls[0][0] as string;
    expect(url).toContain("deleted=true");
  });

  it("list with no params", async () => {
    const fetchFn = mockFetch([jsonResponse({ data: [], total: 0 })]);
    const client = createClient({ baseUrl: "http://localhost:3000", fetch: fetchFn });
    await client.collection("posts").list();

    expect(fetchFn).toHaveBeenCalledWith(
      "http://localhost:3000/api/posts",
      expect.objectContaining({ method: "GET" }),
    );
  });
});
