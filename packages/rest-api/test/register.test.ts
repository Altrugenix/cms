import { describe, it, expect, vi } from "vitest";
import { registerRoutes, type RouterAdapter } from "../src/register.js";

describe("registerRoutes", () => {
  it("registers all routes from definitions", () => {
    const route = vi.fn();
    const adapter: RouterAdapter = { route };

    const routes = [
      {
        method: "GET" as const,
        path: "/posts",
        handler: async () => ({ statusCode: 200, body: [] }),
      },
      {
        method: "POST" as const,
        path: "/posts",
        handler: async () => ({ statusCode: 201, body: {} }),
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
            params: { id: "1" },
            query: { select: "title" },
            body: null,
            headers: { authorization: "Bearer x" },
          },
          { status: () => ({ send: () => {}, header: () => {} }) },
        );
      },
    };

    const handler = vi.fn().mockResolvedValue({ statusCode: 200, body: {} });
    registerRoutes(adapter, [{ method: "GET", path: "/posts/:id", handler }]);

    expect(handler).toHaveBeenCalledWith(
      expect.objectContaining({
        params: { id: "1" },
        query: { select: "title" },
        headers: { authorization: "Bearer x" },
      }),
    );
  });

  it("sends status code and body via reply", async () => {
    const send = vi.fn();
    const status = vi.fn().mockReturnValue({ send, header: vi.fn() });

    const adapter: RouterAdapter = {
      route: (opts) => {
        opts.handler({ params: {}, query: {}, body: null, headers: {} }, { status });
      },
    };

    registerRoutes(adapter, [
      {
        method: "GET",
        path: "/posts",
        handler: async () => ({ statusCode: 200, body: { data: [] } }),
      },
    ]);

    await new Promise(process.nextTick);

    expect(status).toHaveBeenCalledWith(200);
    expect(send).toHaveBeenCalledWith({ data: [] });
  });

  it("sends response headers when provided by handler", async () => {
    const header = vi.fn();
    const send = vi.fn();
    const status = vi.fn().mockReturnValue({ send, header });

    const adapter: RouterAdapter = {
      route: (opts) => {
        opts.handler({ params: {}, query: {}, body: null, headers: {} }, { status });
      },
    };

    registerRoutes(adapter, [
      {
        method: "GET",
        path: "/posts",
        handler: async () => ({ statusCode: 200, body: {}, headers: { "x-custom": "value" } }),
      },
    ]);

    await new Promise(process.nextTick);

    expect(header).toHaveBeenCalledWith("x-custom", "value");
  });

  it("handles handler rejection with 500", async () => {
    const send = vi.fn();
    const status = vi.fn().mockReturnValue({ send, header: vi.fn() });

    const adapter: RouterAdapter = {
      route: (opts) => {
        opts.handler({ params: {}, query: {}, body: null, headers: {} }, { status });
      },
    };

    registerRoutes(adapter, [
      {
        method: "GET",
        path: "/error",
        handler: async () => {
          throw new Error("Something broke");
        },
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
    const status = vi.fn().mockReturnValue({ send, header: vi.fn() });

    const adapter: RouterAdapter = {
      route: (opts) => {
        opts.handler({ params: {}, query: {}, body: null, headers: {} }, { status });
      },
    };

    registerRoutes(adapter, [
      {
        method: "GET",
        path: "/error",
        handler: async () => {
          throw "string error";
        },
      },
    ]);

    await new Promise(process.nextTick);

    expect(status).toHaveBeenCalledWith(500);
    expect(send).toHaveBeenCalledWith({ error: "Internal server error" });
  });

  it("passes collection to handler context", async () => {
    const handler = vi.fn().mockResolvedValue({ statusCode: 200, body: {} });
    const adapter: RouterAdapter = {
      route: (opts) => {
        opts.handler(
          { params: {}, query: {}, body: null, headers: {} },
          { status: () => ({ send: () => {}, header: () => {} }) },
        );
      },
    };

    registerRoutes(adapter, [
      {
        method: "POST",
        path: "/posts",
        handler,
      },
    ]);

    expect(handler).toHaveBeenCalled();
  });
});
