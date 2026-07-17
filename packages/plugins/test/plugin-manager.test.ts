import type { PluginDefinition } from "@arche-cms/types";

import { describe, it, expect, vi } from "vitest";

import { PluginManager } from "../src/plugin-manager.js";

describe("PluginManager", () => {
  const mockEventBus = { emit: vi.fn() };
  const mockLifecycle = { onShutdown: vi.fn() };
  const mockContext = {
    config: {} as never,
    container: {},
    logger: { debug: vi.fn(), error: vi.fn(), fatal: vi.fn(), info: vi.fn(), warn: vi.fn() },
  };

  function createManager() {
    return new PluginManager({
      context: mockContext,
      eventBus: mockEventBus,
      lifecycle: mockLifecycle,
    });
  }

  it("registers a plugin", () => {
    const pm = createManager();
    const plugin: PluginDefinition = {
      name: "Test Plugin",
      slug: "test-plugin",
    };
    pm.register(plugin);
    expect(pm.get("test-plugin")).toBeDefined();
    expect(pm.get("test-plugin")?.plugin.name).toBe("Test Plugin");
    expect(pm.get("test-plugin")?.enabled).toBe(true);
  });

  it("throws when registering duplicate plugin", () => {
    const pm = createManager();
    const plugin: PluginDefinition = { name: "Dup", slug: "dup" };
    pm.register(plugin);
    expect(() => pm.register(plugin)).toThrow('Plugin "dup" is already registered');
  });

  it("unregisters a plugin", () => {
    const pm = createManager();
    pm.register({ name: "Test", slug: "test" });
    pm.unregister("test");
    expect(pm.get("test")).toBeUndefined();
  });

  it("gets all registered plugins", () => {
    const pm = createManager();
    pm.register({ name: "A", slug: "a" });
    pm.register({ name: "B", slug: "b" });
    expect(pm.getAll()).toHaveLength(2);
  });

  it("filters enabled plugins", () => {
    const pm = createManager();
    pm.register({ name: "A", slug: "a" });
    pm.register({ name: "B", slug: "b" });
    pm.disable("a");
    expect(pm.getEnabled()).toHaveLength(1);
    expect(pm.getEnabled()[0]?.plugin.slug).toBe("b");
  });

  it("enable/disable toggles plugin state", () => {
    const pm = createManager();
    pm.register({ name: "Test", slug: "test" });
    pm.disable("test");
    expect(pm.get("test")?.enabled).toBe(false);
    pm.enable("test");
    expect(pm.get("test")?.enabled).toBe(true);
  });

  it("emits plugin:registered event", () => {
    const pm = createManager();
    pm.register({ name: "Audit", slug: "audit" });
    expect(mockEventBus.emit).toHaveBeenCalledWith("plugin:registered", { slug: "audit" });
  });

  it("registers shutdown hook", () => {
    const pm = createManager();
    pm.register({ name: "Test", slug: "test" });
    expect(mockLifecycle.onShutdown).toHaveBeenCalled();
  });

  it("runs beforeSchemaLoad hooks", async () => {
    const pm = createManager();
    const beforeSchemaLoad = vi.fn();
    pm.register({
      hooks: { beforeSchemaLoad },
      name: "Test",
      slug: "test",
    });
    await pm.runHook("beforeSchemaLoad");
    expect(beforeSchemaLoad).toHaveBeenCalledWith(mockContext);
  });

  it("runs afterSchemaLoad hooks", async () => {
    const pm = createManager();
    const afterSchemaLoad = vi.fn();
    pm.register({
      hooks: { afterSchemaLoad },
      name: "Test",
      slug: "test",
    });
    await pm.runHook("afterSchemaLoad");
    expect(afterSchemaLoad).toHaveBeenCalledWith(mockContext);
  });

  it("skips hooks for disabled plugins", async () => {
    const pm = createManager();
    const hook = vi.fn();
    pm.register({ hooks: { beforeSchemaLoad: hook }, name: "Test", slug: "test" });
    pm.disable("test");
    await pm.runHook("beforeSchemaLoad");
    expect(hook).not.toHaveBeenCalled();
  });

  it("collects custom fields from plugins", () => {
    const pm = createManager();
    pm.register({
      fields: {
        posts: [{ name: "metaTitle", type: "text" }],
      },
      name: "SEO",
      slug: "seo",
    });
    pm.register({
      fields: {
        posts: [{ name: "lastReviewed", type: "date" }],
      },
      name: "Audit",
      slug: "audit",
    });
    const fields = pm.getCustomFields();
    expect(fields.posts).toHaveLength(2);
    expect(fields.posts[0]).toEqual({ name: "metaTitle", type: "text" });
    expect(fields.posts[1]).toEqual({ name: "lastReviewed", type: "date" });
  });

  it("collects admin panels from plugins", () => {
    const pm = createManager();
    pm.register({
      adminPanels: [
        { component: "AnalyticsDashboard", label: "Analytics Dashboard", slug: "analytics-dash" },
      ],
      name: "Analytics",
      slug: "analytics",
    });
    const panels = pm.getAdminPanels();
    expect(panels).toHaveLength(1);
    expect(panels[0]?.plugin).toBe("analytics");
    expect(panels[0]?.slug).toBe("analytics-dash");
  });

  it("initPlugins runs beforeSchemaLoad hooks", async () => {
    const pm = createManager();
    const hook = vi.fn();
    pm.register({ hooks: { beforeSchemaLoad: hook }, name: "Test", slug: "test" });
    await pm.initPlugins();
    expect(hook).toHaveBeenCalled();
  });

  it("runs beforeRequest hooks via runRequestHook", async () => {
    const pm = createManager();
    const beforeRequest = vi.fn();
    pm.register({
      hooks: { beforeRequest },
      name: "Test",
      slug: "test",
    });
    const req = { url: "/api/posts" };
    await pm.runRequestHook("beforeRequest", req);
    expect(beforeRequest).toHaveBeenCalledWith(mockContext, req);
  });

  it("runs afterRequest hooks via runRequestHook", async () => {
    const pm = createManager();
    const afterRequest = vi.fn();
    pm.register({
      hooks: { afterRequest },
      name: "Test",
      slug: "test",
    });
    const res = { status: 200 };
    await pm.runRequestHook("afterRequest", res);
    expect(afterRequest).toHaveBeenCalledWith(mockContext, res);
  });

  it("runs beforeRouteRegister hooks via runRouteHook", async () => {
    const pm = createManager();
    const beforeRouteRegister = vi.fn();
    pm.register({
      hooks: { beforeRouteRegister },
      name: "Test",
      slug: "test",
    });
    await pm.runRouteHook("beforeRouteRegister");
    expect(beforeRouteRegister).toHaveBeenCalledWith(mockContext);
  });

  it("runs afterRouteRegister hooks via runRouteHook", async () => {
    const pm = createManager();
    const afterRouteRegister = vi.fn();
    pm.register({
      hooks: { afterRouteRegister },
      name: "Test",
      slug: "test",
    });
    await pm.runRouteHook("afterRouteRegister");
    expect(afterRouteRegister).toHaveBeenCalledWith(mockContext);
  });

  it("skips request hooks for disabled plugins", async () => {
    const pm = createManager();
    const hook = vi.fn();
    pm.register({ hooks: { beforeRequest: hook }, name: "Test", slug: "test" });
    pm.disable("test");
    await pm.runRequestHook("beforeRequest", {});
    expect(hook).not.toHaveBeenCalled();
  });

  it("skips route hooks for disabled plugins", async () => {
    const pm = createManager();
    const hook = vi.fn();
    pm.register({ hooks: { beforeRouteRegister: hook }, name: "Test", slug: "test" });
    pm.disable("test");
    await pm.runRouteHook("beforeRouteRegister");
    expect(hook).not.toHaveBeenCalled();
  });

  it("catches and logs errors from beforeSchemaLoad hooks", async () => {
    const pm = createManager();
    const error = new Error("hook failed");
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    pm.register({
      hooks: { beforeSchemaLoad: vi.fn().mockRejectedValue(error) },
      name: "Bad Plugin",
      slug: "bad-plugin",
    });
    await pm.runHook("beforeSchemaLoad");
    expect(consoleSpy).toHaveBeenCalledWith(
      "Plugin hook error [bad-plugin][beforeSchemaLoad]:",
      error,
    );
    consoleSpy.mockRestore();
  });

  it("catches and logs errors from request hooks", async () => {
    const pm = createManager();
    const error = new Error("request hook failed");
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    pm.register({
      hooks: { beforeRequest: vi.fn().mockRejectedValue(error) },
      name: "Bad Plugin",
      slug: "bad-plugin",
    });
    await pm.runRequestHook("beforeRequest", {});
    expect(consoleSpy).toHaveBeenCalledWith(
      "Plugin hook error [bad-plugin][beforeRequest]:",
      error,
    );
    consoleSpy.mockRestore();
  });

  it("catches and logs errors from route hooks", async () => {
    const pm = createManager();
    const error = new Error("route hook failed");
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    pm.register({
      hooks: { beforeRouteRegister: vi.fn().mockRejectedValue(error) },
      name: "Bad Plugin",
      slug: "bad-plugin",
    });
    await pm.runRouteHook("beforeRouteRegister");
    expect(consoleSpy).toHaveBeenCalledWith(
      "Plugin hook error [bad-plugin][beforeRouteRegister]:",
      error,
    );
    consoleSpy.mockRestore();
  });

  it("executes shutdown callback to remove plugin registration", async () => {
    const pm = createManager();
    pm.register({ name: "Temp", slug: "temp" });
    expect(pm.get("temp")).toBeDefined();
    const allCalls = mockLifecycle.onShutdown.mock.calls;
    const shutdownFn = allCalls[allCalls.length - 1]?.[0];
    expect(shutdownFn).toBeTypeOf("function");
    await shutdownFn();
    expect(pm.get("temp")).toBeUndefined();
  });

  it("getCustomFields returns empty when no plugins have fields", () => {
    const pm = createManager();
    pm.register({ name: "No Fields", slug: "nofields" });
    const fields = pm.getCustomFields();
    expect(fields).toEqual({});
  });

  it("getAdminPanels returns empty when no plugins have panels", () => {
    const pm = createManager();
    pm.register({ name: "No Panels", slug: "nopanels" });
    const panels = pm.getAdminPanels();
    expect(panels).toEqual([]);
  });

  it("register passes config to registration", () => {
    const pm = createManager();
    pm.register({ name: "Cfg", slug: "cfg" }, { apiKey: "123" });
    expect(pm.get("cfg")?.config).toEqual({ apiKey: "123" });
  });

  it("register without config leaves config undefined", () => {
    const pm = createManager();
    pm.register({ name: "No Cfg", slug: "nocfg" });
    expect(pm.get("nocfg")?.config).toBeUndefined();
  });

  it("enable on nonexistent slug is a no-op", () => {
    const pm = createManager();
    pm.enable("nonexistent");
  });

  it("disable on nonexistent slug is a no-op", () => {
    const pm = createManager();
    pm.disable("nonexistent");
  });

  it("get returns undefined for nonexistent slug", () => {
    const pm = createManager();
    expect(pm.get("nonexistent")).toBeUndefined();
  });

  it("getAll returns empty array when no plugins registered", () => {
    const pm = createManager();
    expect(pm.getAll()).toEqual([]);
  });

  it("getEnabled returns empty array when no plugins registered", () => {
    const pm = createManager();
    expect(pm.getEnabled()).toEqual([]);
  });

  it("runHook does nothing when no plugins have the hook", async () => {
    const pm = createManager();
    pm.register({ name: "No Hook", slug: "nohook" });
    await pm.runHook("beforeSchemaLoad");
  });

  it("runRequestHook does nothing when no plugins have the hook", async () => {
    const pm = createManager();
    pm.register({ name: "No Hook", slug: "nohook" });
    await pm.runRequestHook("beforeRequest", {});
  });

  it("runRouteHook does nothing when no plugins have the hook", async () => {
    const pm = createManager();
    pm.register({ name: "No Hook", slug: "nohook" });
    await pm.runRouteHook("beforeRouteRegister");
  });

  it("getCustomFields accumulates fields from multiple collection keys", () => {
    const pm = createManager();
    pm.register({
      fields: {
        pages: [{ name: "f2", type: "text" }],
        posts: [{ name: "f1", type: "text" }],
      },
      name: "P1",
      slug: "p1",
    });
    const fields = pm.getCustomFields();
    expect(fields.posts).toHaveLength(1);
    expect(fields.pages).toHaveLength(1);
  });
});
