import { describe, it, expect, vi } from "vitest";

import { registerRoutes, type RouterAdapter } from "../src/register.js";

describe("registerRoutes", () => {
  it("registers all routes from definitions", () => {
    const route = vi.fn();
    const adapter: RouterAdapter = { route };

    const routes = [
      {
        handler: async () => ({ body: [], statusCode: 200 }),
        method: "GET" as const,
        path: "/posts",
      },
      {
        handler: async () => ({ body: {}, statusCode: 201 }),
        method: "POST" as const,
        path: "/posts",
      },
    ];

    registerRoutes(adapter, routes);

    expect(route).toHaveBeenCalledTimes(2);
    expect(route).toHaveBeenCalledWith(expect.objectContaining({ method: "GET", url: "/posts" }));
    expect(route).toHaveBeenCalledWith(expect.objectContaining({ method: "POST", url: "/posts" }));
  });

  it("passes request context to route handler", async () => {
    const adapter: RouterAdapter = {
      route: (opts) => {
        opts.handler(
          {
            body: null,
            headers: { authorization: "Bearer x" },
            params: { id: "1" },
            query: { select: "title" },
          },
          { status: () => ({ header: () => {}, send: () => {} }) },
        );
      },
    };

    const handler = vi.fn().mockResolvedValue({ body: {}, statusCode: 200 });
    registerRoutes(adapter, [{ handler, method: "GET", path: "/posts/:id" }]);

    expect(handler).toHaveBeenCalledWith(
      expect.objectContaining({
        headers: { authorization: "Bearer x" },
        params: { id: "1" },
        query: { select: "title" },
      }),
    );
  });

  it("sends status code and body via reply", async () => {
    const send = vi.fn();
    const status = vi.fn().mockReturnValue({ header: vi.fn(), send });

    const adapter: RouterAdapter = {
      route: (opts) => {
        opts.handler({ body: null, headers: {}, params: {}, query: {} }, { status });
      },
    };

    registerRoutes(adapter, [
      {
        handler: async () => ({ body: { data: [] }, statusCode: 200 }),
        method: "GET",
        path: "/posts",
      },
    ]);

    await new Promise(process.nextTick);

    expect(status).toHaveBeenCalledWith(200);
    expect(send).toHaveBeenCalledWith({ data: [] });
  });

  it("sends response headers when provided by handler", async () => {
    const header = vi.fn();
    const send = vi.fn();
    const status = vi.fn().mockReturnValue({ header, send });

    const adapter: RouterAdapter = {
      route: (opts) => {
        opts.handler({ body: null, headers: {}, params: {}, query: {} }, { status });
      },
    };

    registerRoutes(adapter, [
      {
        handler: async () => ({ body: {}, headers: { "x-custom": "value" }, statusCode: 200 }),
        method: "GET",
        path: "/posts",
      },
    ]);

    await new Promise(process.nextTick);

    expect(header).toHaveBeenCalledWith("x-custom", "value");
  });

  it("handles handler rejection with 500", async () => {
    const send = vi.fn();
    const status = vi.fn().mockReturnValue({ header: vi.fn(), send });

    const adapter: RouterAdapter = {
      route: (opts) => {
        opts.handler({ body: null, headers: {}, params: {}, query: {} }, { status });
      },
    };

    registerRoutes(adapter, [
      {
        handler: async () => {
          throw new Error("Something broke");
        },
        method: "GET",
        path: "/error",
      },
    ]);

    await new Promise(process.nextTick);

    expect(status).toHaveBeenCalledWith(500);
    expect(send).toHaveBeenCalledWith({ error: "Something broke" });
  });

  it("handles empty route array", () => {
    const route = vi.fn();
    const adapter: RouterAdapter = { route };

    registerRoutes(adapter, []);

    expect(route).not.toHaveBeenCalled();
  });

  it("handles non-Error throw with fallback message", async () => {
    const send = vi.fn();
    const status = vi.fn().mockReturnValue({ header: vi.fn(), send });

    const adapter: RouterAdapter = {
      route: (opts) => {
        opts.handler({ body: null, headers: {}, params: {}, query: {} }, { status });
      },
    };

    registerRoutes(adapter, [
      {
        handler: async () => {
          throw "string error";
        },
        method: "GET",
        path: "/error",
      },
    ]);

    await new Promise(process.nextTick);

    expect(status).toHaveBeenCalledWith(500);
    expect(send).toHaveBeenCalledWith({ error: "Internal server error" });
  });

  it("passes collection to handler context", async () => {
    const handler = vi.fn().mockResolvedValue({ body: {}, statusCode: 200 });
    const adapter: RouterAdapter = {
      route: (opts) => {
        opts.handler(
          { body: null, headers: {}, params: {}, query: {} },
          { status: () => ({ header: () => {}, send: () => {} }) },
        );
      },
    };

    registerRoutes(adapter, [
      {
        handler,
        method: "POST",
        path: "/posts",
      },
    ]);

    expect(handler).toHaveBeenCalled();
  });
});
