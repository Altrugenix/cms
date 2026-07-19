import { describe, it, expect, vi } from "vitest";

import type { ArcheConfig } from "../src/types.js";

import { ApiError } from "../src/errors.js";
import { createClient } from "../src/index.js";

function mockFetch(responses: Array<{ status: number; body: unknown }>) {
  let callCount = 0;
  return vi.fn(async () => {
    const res = responses[callCount++] ?? { body: {}, status: 200 };
    return new Response(JSON.stringify(res.body), {
      headers: { "Content-Type": "application/json" },
      status: res.status,
    });
  });
}

function jsonResponse(body: unknown, status = 200) {
  return { body, status };
}

describe("createClient", () => {
  const config: ArcheConfig = { baseUrl: "http://localhost:3000" };

  it("creates a client with all sub-clients", () => {
    const client = createClient(config);
    expect(client.collection).toBeDefined();
    expect(client.global).toBeDefined();
    expect(client.auth).toBeDefined();
    expect(client.media).toBeDefined();
    expect(client.users).toBeDefined();
    expect(client.roles).toBeDefined();
    expect(client.activity).toBeDefined();
    expect(client.settings).toBeDefined();
    expect(client.setToken).toBeDefined();
  });

  it("caches collection clients for the same slug", () => {
    const client = createClient(config);
    const a = client.collection("posts");
    const b = client.collection("posts");
    expect(a).toBe(b);
  });

  it("returns different clients for different slugs", () => {
    const client = createClient(config);
    const a = client.collection("posts");
    const b = client.collection("users");
    expect(a).not.toBe(b);
  });

  it("caches global clients for the same slug", () => {
    const client = createClient(config);
    const a = client.global("settings");
    const b = client.global("settings");
    expect(a).toBe(b);
  });
});

describe("collection client", () => {
  it("list returns paginated data", async () => {
    const fetchFn = mockFetch([jsonResponse({ data: [{ id: "1", title: "Hello" }], total: 1 })]);
    const client = createClient({ baseUrl: "http://localhost:3000", fetch: fetchFn });
    const result = await client
      .collection<{ id: string; title: string }>("posts")
      .list({ limit: 10, offset: 0 });

    expect(result.data).toHaveLength(1);
    expect(result.total).toBe(1);
    expect(fetchFn).toHaveBeenCalledWith(
      "http://localhost:3000/api/posts?limit=10&offset=0",
      expect.objectContaining({ method: "GET" }),
    );
  });

  it("list with where params", async () => {
    const fetchFn = mockFetch([jsonResponse({ data: [], total: 0 })]);
    const client = createClient({ baseUrl: "http://localhost:3000", fetch: fetchFn });
    await client.collection("posts").list({ where: { status: "published" } });

    expect(fetchFn).toHaveBeenCalledWith(expect.stringContaining("where%5B"), expect.anything());
  });

  it("list with sort and select", async () => {
    const fetchFn = mockFetch([jsonResponse({ data: [], total: 0 })]);
    const client = createClient({ baseUrl: "http://localhost:3000", fetch: fetchFn });
    await client.collection("posts").list({ select: ["title", "slug"], sort: "title:asc" });

    const url = fetchFn.mock.calls[0][0] as string;
    expect(url).toContain("sort=title%3Aasc");
    expect(url).toContain("select=title%2Cslug");
  });

  it("get returns a single record", async () => {
    const fetchFn = mockFetch([jsonResponse({ id: "1", title: "Hello" })]);
    const client = createClient({ baseUrl: "http://localhost:3000", fetch: fetchFn });
    const result = await client.collection<{ id: string; title: string }>("posts").get("1");

    expect(result.id).toBe("1");
    expect(fetchFn).toHaveBeenCalledWith(
      "http://localhost:3000/api/posts/1",
      expect.objectContaining({ method: "GET" }),
    );
  });

  it("create sends POST with body", async () => {
    const fetchFn = mockFetch([jsonResponse({ id: "2", title: "New" }, 201)]);
    const client = createClient({ baseUrl: "http://localhost:3000", fetch: fetchFn });
    const result = await client
      .collection<{ id: string; title: string }>("posts")
      .create({ title: "New" });

    expect(result.id).toBe("2");
    expect(fetchFn).toHaveBeenCalledWith(
      "http://localhost:3000/api/posts",
      expect.objectContaining({ body: '{"title":"New"}', method: "POST" }),
    );
  });

  it("update sends PATCH with body", async () => {
    const fetchFn = mockFetch([jsonResponse({ id: "1", title: "Updated" })]);
    const client = createClient({ baseUrl: "http://localhost:3000", fetch: fetchFn });
    const result = await client
      .collection<{ id: string; title: string }>("posts")
      .update("1", { title: "Updated" });

    expect(result.title).toBe("Updated");
    expect(fetchFn).toHaveBeenCalledWith(
      "http://localhost:3000/api/posts/1",
      expect.objectContaining({ body: '{"title":"Updated"}', method: "PATCH" }),
    );
  });

  it("delete sends DELETE", async () => {
    const fetchFn = mockFetch([jsonResponse({ message: "Deleted" })]);
    const client = createClient({ baseUrl: "http://localhost:3000", fetch: fetchFn });
    const result = await client.collection("posts").delete("1");

    expect(result.message).toBe("Deleted");
    expect(fetchFn).toHaveBeenCalledWith(
      "http://localhost:3000/api/posts/1",
      expect.objectContaining({ method: "DELETE" }),
    );
  });

  it("bulkDelete sends POST with ids", async () => {
    const fetchFn = mockFetch([jsonResponse({ deleted: 2 })]);
    const client = createClient({ baseUrl: "http://localhost:3000", fetch: fetchFn });
    const result = await client.collection("posts").bulkDelete(["1", "2"]);

    expect(result.deleted).toBe(2);
    expect(fetchFn).toHaveBeenCalledWith(
      "http://localhost:3000/api/posts/bulk-delete",
      expect.objectContaining({ body: '{"ids":["1","2"]}', method: "POST" }),
    );
  });

  it("publish sends POST", async () => {
    const fetchFn = mockFetch([jsonResponse({ id: "1", status: "published" })]);
    const client = createClient({ baseUrl: "http://localhost:3000", fetch: fetchFn });
    await client.collection("posts").publish("1");

    expect(fetchFn).toHaveBeenCalledWith(
      "http://localhost:3000/api/posts/1/publish",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("unpublish sends POST", async () => {
    const fetchFn = mockFetch([jsonResponse({ id: "1", status: "draft" })]);
    const client = createClient({ baseUrl: "http://localhost:3000", fetch: fetchFn });
    await client.collection("posts").unpublish("1");

    expect(fetchFn).toHaveBeenCalledWith(
      "http://localhost:3000/api/posts/1/unpublish",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("restore sends POST", async () => {
    const fetchFn = mockFetch([jsonResponse({ id: "1" })]);
    const client = createClient({ baseUrl: "http://localhost:3000", fetch: fetchFn });
    await client.collection("posts").restore("1");

    expect(fetchFn).toHaveBeenCalledWith(
      "http://localhost:3000/api/posts/1/restore",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("versions returns paginated version list", async () => {
    const fetchFn = mockFetch([
      jsonResponse({
        data: [{ createdAt: "2024-01-01", data: {}, id: "v1", version: 1 }],
        total: 1,
      }),
    ]);
    const client = createClient({ baseUrl: "http://localhost:3000", fetch: fetchFn });
    const result = await client.collection("posts").versions("1");

    expect(result.data).toHaveLength(1);
    expect(fetchFn).toHaveBeenCalledWith(
      "http://localhost:3000/api/posts/1/versions",
      expect.objectContaining({ method: "GET" }),
    );
  });

  it("restoreVersion sends POST", async () => {
    const fetchFn = mockFetch([jsonResponse({ id: "1", title: "Restored" })]);
    const client = createClient({ baseUrl: "http://localhost:3000", fetch: fetchFn });
    await client.collection("posts").restoreVersion("1", "v1");

    expect(fetchFn).toHaveBeenCalledWith(
      "http://localhost:3000/api/posts/1/versions/v1/restore",
      expect.objectContaining({ method: "POST" }),
    );
  });
});

describe("global client", () => {
  it("get returns global data", async () => {
    const fetchFn = mockFetch([jsonResponse({ siteName: "My Site" })]);
    const client = createClient({ baseUrl: "http://localhost:3000", fetch: fetchFn });
    const result = await client.global<{ siteName: string }>("site-settings").get();

    expect(result.siteName).toBe("My Site");
    expect(fetchFn).toHaveBeenCalledWith(
      "http://localhost:3000/api/globals/site-settings",
      expect.objectContaining({ method: "GET" }),
    );
  });

  it("upsert sends PUT", async () => {
    const fetchFn = mockFetch([jsonResponse({ siteName: "Updated" })]);
    const client = createClient({ baseUrl: "http://localhost:3000", fetch: fetchFn });
    const result = await client
      .global<{ siteName: string }>("site-settings")
      .upsert({ siteName: "Updated" });

    expect(result.siteName).toBe("Updated");
    expect(fetchFn).toHaveBeenCalledWith(
      "http://localhost:3000/api/globals/site-settings",
      expect.objectContaining({ method: "PUT" }),
    );
  });
});

describe("auth client", () => {
  it("login sends POST with credentials", async () => {
    const fetchFn = mockFetch([
      jsonResponse({
        accessToken: "at",
        refreshToken: "rt",
        user: { email: "a@b.com", id: "1", role: "admin" },
      }),
    ]);
    const client = createClient({ baseUrl: "http://localhost:3000", fetch: fetchFn });
    const result = await client.auth.login("a@b.com", "pass");

    expect(result.accessToken).toBe("at");
    expect(result.refreshToken).toBe("rt");
    expect(fetchFn).toHaveBeenCalledWith(
      "http://localhost:3000/api/auth/login",
      expect.objectContaining({ body: '{"email":"a@b.com","password":"pass"}', method: "POST" }),
    );
  });

  it("register sends POST", async () => {
    const fetchFn = mockFetch([
      jsonResponse(
        {
          accessToken: "at",
          refreshToken: "rt",
          user: { email: "a@b.com", id: "1", role: "admin" },
        },
        201,
      ),
    ]);
    const client = createClient({ baseUrl: "http://localhost:3000", fetch: fetchFn });
    await client.auth.register("a@b.com", "pass");

    expect(fetchFn).toHaveBeenCalledWith(
      "http://localhost:3000/api/auth/register",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("refresh sends POST with token", async () => {
    const fetchFn = mockFetch([jsonResponse({ accessToken: "new-at", refreshToken: "new-rt" })]);
    const client = createClient({ baseUrl: "http://localhost:3000", fetch: fetchFn });
    const result = await client.auth.refresh("old-rt");

    expect(result.accessToken).toBe("new-at");
    expect(fetchFn).toHaveBeenCalledWith(
      "http://localhost:3000/api/auth/refresh",
      expect.objectContaining({ body: '{"refreshToken":"old-rt"}', method: "POST" }),
    );
  });

  it("forgotPassword sends POST", async () => {
    const fetchFn = mockFetch([jsonResponse({ message: "Email sent" })]);
    const client = createClient({ baseUrl: "http://localhost:3000", fetch: fetchFn });
    await client.auth.forgotPassword("a@b.com");

    expect(fetchFn).toHaveBeenCalledWith(
      "http://localhost:3000/api/auth/forgot-password",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("resetPassword sends POST", async () => {
    const fetchFn = mockFetch([jsonResponse({ message: "Reset" })]);
    const client = createClient({ baseUrl: "http://localhost:3000", fetch: fetchFn });
    await client.auth.resetPassword("token", "newpass");

    expect(fetchFn).toHaveBeenCalledWith(
      "http://localhost:3000/api/auth/reset-password",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("me sends GET", async () => {
    const fetchFn = mockFetch([jsonResponse({ email: "a@b.com", id: "1", role: "admin" })]);
    const client = createClient({ baseUrl: "http://localhost:3000", fetch: fetchFn });
    const result = await client.auth.me();

    expect(result.email).toBe("a@b.com");
    expect(fetchFn).toHaveBeenCalledWith(
      "http://localhost:3000/api/auth/me",
      expect.objectContaining({ method: "GET" }),
    );
  });

  it("setupStatus sends GET", async () => {
    const fetchFn = mockFetch([jsonResponse({ hasAdmin: true })]);
    const client = createClient({ baseUrl: "http://localhost:3000", fetch: fetchFn });
    const result = await client.auth.setupStatus();

    expect(result.hasAdmin).toBe(true);
  });
});

describe("media client", () => {
  it("list returns paginated media", async () => {
    const fetchFn = mockFetch([
      jsonResponse({ data: [{ filename: "img.png", id: "1" }], total: 1 }),
    ]);
    const client = createClient({ baseUrl: "http://localhost:3000", fetch: fetchFn });
    const result = await client.media.list({ limit: 10 });

    expect(result.data).toHaveLength(1);
    expect(fetchFn).toHaveBeenCalledWith(
      expect.stringContaining("/api/media?limit=10"),
      expect.anything(),
    );
  });

  it("upload sends POST with base64 data", async () => {
    const fetchFn = mockFetch([jsonResponse({ filename: "img.png", id: "1" }, 201)]);
    const client = createClient({ baseUrl: "http://localhost:3000", fetch: fetchFn });
    await client.media.upload({ data: "base64data", fileName: "img.png", mimeType: "image/png" });

    expect(fetchFn).toHaveBeenCalledWith(
      "http://localhost:3000/api/media",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("get returns media metadata", async () => {
    const fetchFn = mockFetch([jsonResponse({ filename: "img.png", id: "1" })]);
    const client = createClient({ baseUrl: "http://localhost:3000", fetch: fetchFn });
    const result = await client.media.get("1");

    expect(result.filename).toBe("img.png");
  });

  it("delete sends DELETE", async () => {
    const fetchFn = mockFetch([jsonResponse({ message: "Deleted" })]);
    const client = createClient({ baseUrl: "http://localhost:3000", fetch: fetchFn });
    await client.media.delete("1");

    expect(fetchFn).toHaveBeenCalledWith(
      "http://localhost:3000/api/media/1",
      expect.objectContaining({ method: "DELETE" }),
    );
  });

  it("folders.list works", async () => {
    const fetchFn = mockFetch([jsonResponse({ data: [{ id: "1", name: "Images" }], total: 1 })]);
    const client = createClient({ baseUrl: "http://localhost:3000", fetch: fetchFn });
    const result = await client.media.folders.list();

    expect(result.data).toHaveLength(1);
  });

  it("folders.create sends POST", async () => {
    const fetchFn = mockFetch([jsonResponse({ id: "1", name: "New Folder" }, 201)]);
    const client = createClient({ baseUrl: "http://localhost:3000", fetch: fetchFn });
    await client.media.folders.create({ name: "New Folder" });

    expect(fetchFn).toHaveBeenCalledWith(
      "http://localhost:3000/api/media/folders",
      expect.objectContaining({ method: "POST" }),
    );
  });
});

describe("users client", () => {
  it("list returns paginated users", async () => {
    const fetchFn = mockFetch([jsonResponse({ data: [{ email: "a@b.com", id: "1" }], total: 1 })]);
    const client = createClient({ baseUrl: "http://localhost:3000", fetch: fetchFn });
    const result = await client.users.list();

    expect(result.data).toHaveLength(1);
  });

  it("create sends POST", async () => {
    const fetchFn = mockFetch([jsonResponse({ email: "a@b.com", id: "1" }, 201)]);
    const client = createClient({ baseUrl: "http://localhost:3000", fetch: fetchFn });
    await client.users.create({ email: "a@b.com", password: "pass" });

    expect(fetchFn).toHaveBeenCalledWith(
      "http://localhost:3000/api/users",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("update sends PATCH", async () => {
    const fetchFn = mockFetch([jsonResponse({ email: "updated@b.com", id: "1" })]);
    const client = createClient({ baseUrl: "http://localhost:3000", fetch: fetchFn });
    await client.users.update("1", { email: "updated@b.com" });

    expect(fetchFn).toHaveBeenCalledWith(
      "http://localhost:3000/api/users/1",
      expect.objectContaining({ method: "PATCH" }),
    );
  });

  it("delete sends DELETE", async () => {
    const fetchFn = mockFetch([jsonResponse({ message: "Deleted" })]);
    const client = createClient({ baseUrl: "http://localhost:3000", fetch: fetchFn });
    await client.users.delete("1");

    expect(fetchFn).toHaveBeenCalledWith(
      "http://localhost:3000/api/users/1",
      expect.objectContaining({ method: "DELETE" }),
    );
  });
});

describe("roles client", () => {
  it("list returns paginated roles", async () => {
    const fetchFn = mockFetch([jsonResponse({ data: [{ id: "1", name: "Admin" }], total: 1 })]);
    const client = createClient({ baseUrl: "http://localhost:3000", fetch: fetchFn });
    const result = await client.roles.list();

    expect(result.data).toHaveLength(1);
  });

  it("create sends POST", async () => {
    const fetchFn = mockFetch([jsonResponse({ id: "1", name: "Editor" }, 201)]);
    const client = createClient({ baseUrl: "http://localhost:3000", fetch: fetchFn });
    await client.roles.create({ name: "Editor" });

    expect(fetchFn).toHaveBeenCalledWith(
      "http://localhost:3000/api/roles",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("update sends PATCH", async () => {
    const fetchFn = mockFetch([jsonResponse({ id: "1", name: "Updated" })]);
    const client = createClient({ baseUrl: "http://localhost:3000", fetch: fetchFn });
    await client.roles.update("1", { name: "Updated" });

    expect(fetchFn).toHaveBeenCalledWith(
      "http://localhost:3000/api/roles/1",
      expect.objectContaining({ method: "PATCH" }),
    );
  });

  it("delete sends DELETE", async () => {
    const fetchFn = mockFetch([jsonResponse({ message: "Deleted" })]);
    const client = createClient({ baseUrl: "http://localhost:3000", fetch: fetchFn });
    await client.roles.delete("1");

    expect(fetchFn).toHaveBeenCalledWith(
      "http://localhost:3000/api/roles/1",
      expect.objectContaining({ method: "DELETE" }),
    );
  });
});

describe("activity client", () => {
  it("list returns paginated activity", async () => {
    const fetchFn = mockFetch([jsonResponse({ data: [{ action: "create", id: "1" }], total: 1 })]);
    const client = createClient({ baseUrl: "http://localhost:3000", fetch: fetchFn });
    const result = await client.activity.list({ action: "create" });

    expect(result.data).toHaveLength(1);
    expect(fetchFn).toHaveBeenCalledWith(
      expect.stringContaining("action=create"),
      expect.anything(),
    );
  });
});

describe("settings client", () => {
  it("apiTokens.list returns paginated tokens", async () => {
    const fetchFn = mockFetch([jsonResponse({ data: [{ id: "1", name: "Test" }], total: 1 })]);
    const client = createClient({ baseUrl: "http://localhost:3000", fetch: fetchFn });
    const result = await client.settings.apiTokens.list();

    expect(result.data).toHaveLength(1);
  });

  it("apiTokens.create sends POST", async () => {
    const fetchFn = mockFetch([
      jsonResponse({ rawToken: "cms_abc", token: { id: "1", name: "Key" } }, 201),
    ]);
    const client = createClient({ baseUrl: "http://localhost:3000", fetch: fetchFn });
    const result = await client.settings.apiTokens.create({ name: "Key" });

    expect(result.rawToken).toBe("cms_abc");
  });

  it("apiTokens.delete sends DELETE", async () => {
    const fetchFn = mockFetch([jsonResponse({ message: "Revoked" })]);
    const client = createClient({ baseUrl: "http://localhost:3000", fetch: fetchFn });
    await client.settings.apiTokens.delete("1");

    expect(fetchFn).toHaveBeenCalledWith(
      "http://localhost:3000/api/settings/api-tokens/1",
      expect.objectContaining({ method: "DELETE" }),
    );
  });

  it("webhooks.list returns paginated webhooks", async () => {
    const fetchFn = mockFetch([jsonResponse({ data: [{ id: "1", name: "Hook" }], total: 1 })]);
    const client = createClient({ baseUrl: "http://localhost:3000", fetch: fetchFn });
    const result = await client.settings.webhooks.list();

    expect(result.data).toHaveLength(1);
  });

  it("webhooks.create sends POST", async () => {
    const fetchFn = mockFetch([jsonResponse({ id: "1", name: "Hook" }, 201)]);
    const client = createClient({ baseUrl: "http://localhost:3000", fetch: fetchFn });
    await client.settings.webhooks.create({
      events: ["create"],
      name: "Hook",
      url: "https://example.com",
    });

    expect(fetchFn).toHaveBeenCalledWith(
      "http://localhost:3000/api/settings/webhooks",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("webhooks.update sends PUT", async () => {
    const fetchFn = mockFetch([jsonResponse({ id: "1", name: "Updated" })]);
    const client = createClient({ baseUrl: "http://localhost:3000", fetch: fetchFn });
    await client.settings.webhooks.update("1", { name: "Updated" });

    expect(fetchFn).toHaveBeenCalledWith(
      "http://localhost:3000/api/settings/webhooks/1",
      expect.objectContaining({ method: "PUT" }),
    );
  });

  it("webhooks.delete sends DELETE", async () => {
    const fetchFn = mockFetch([jsonResponse({ message: "Deleted" })]);
    const client = createClient({ baseUrl: "http://localhost:3000", fetch: fetchFn });
    await client.settings.webhooks.delete("1");

    expect(fetchFn).toHaveBeenCalledWith(
      "http://localhost:3000/api/settings/webhooks/1",
      expect.objectContaining({ method: "DELETE" }),
    );
  });
});

describe("auth header", () => {
  it("sends Authorization header when token is set", async () => {
    const fetchFn = mockFetch([jsonResponse({ id: "1" })]);
    const client = createClient({
      baseUrl: "http://localhost:3000",
      fetch: fetchFn,
      token: "mytoken",
    });
    await client.collection("posts").list();

    const init = fetchFn.mock.calls[0][1] as RequestInit;
    expect((init.headers as Record<string, string>)["Authorization"]).toBe("Bearer mytoken");
  });

  it("setToken updates the authorization header", async () => {
    const fetchFn = mockFetch([jsonResponse({ id: "1" }), jsonResponse({ id: "2" })]);
    const client = createClient({ baseUrl: "http://localhost:3000", fetch: fetchFn });
    await client.collection("posts").list();

    let init = fetchFn.mock.calls[0][1] as RequestInit;
    expect((init.headers as Record<string, string>)["Authorization"]).toBeUndefined();

    client.setToken("newtoken");
    await client.collection("posts").list();

    init = fetchFn.mock.calls[1][1] as RequestInit;
    expect((init.headers as Record<string, string>)["Authorization"]).toBe("Bearer newtoken");
  });
});

describe("error handling", () => {
  it("throws ApiError on non-ok response", async () => {
    const fetchFn = mockFetch([jsonResponse({ code: "NOT_FOUND", error: "Not found" }, 404)]);
    const client = createClient({ baseUrl: "http://localhost:3000", fetch: fetchFn });

    const error = await client
      .collection("posts")
      .get("1")
      .catch((e) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).status).toBe(404);
    expect((error as ApiError).message).toBe("Not found");
    expect((error as ApiError).code).toBe("NOT_FOUND");
  });

  it("includes validation details in error", async () => {
    const fetchFn = mockFetch([
      jsonResponse(
        { details: [{ message: "Invalid email", path: ["email"] }], error: "Validation failed" },
        400,
      ),
    ]);
    const client = createClient({ baseUrl: "http://localhost:3000", fetch: fetchFn });

    const error = await client.auth.login("bad", "pass").catch((e) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).status).toBe(400);
    expect((error as ApiError).details).toHaveLength(1);
    expect((error as ApiError).details?.[0].message).toBe("Invalid email");
  });
});

describe("interceptors", () => {
  it("trailing slashes in baseUrl are cleaned", async () => {
    const fetchFn = mockFetch([jsonResponse({ data: [], total: 0 })]);
    const client = createClient({ baseUrl: "http://localhost:3000///", fetch: fetchFn });
    await client.collection("posts").list();

    expect(fetchFn).toHaveBeenCalledWith("http://localhost:3000/api/posts", expect.anything());
  });
});
