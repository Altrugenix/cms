import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("node:fs", () => ({
  existsSync: vi.fn(),
}));

vi.mock("@fastify/static", () => ({
  default: vi.fn(),
}));

function mockFastify() {
  return {
    register: vi.fn().mockResolvedValue(undefined),
    log: { warn: vi.fn(), info: vi.fn() },
    setNotFoundHandler: vi.fn(),
  };
}

describe("registerAdminStatic", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("skips registration when adminDir is null and warns", async () => {
    const { existsSync } = await import("node:fs");
    vi.mocked(existsSync).mockReturnValue(false);

    const { registerAdminStatic } = await import("../src/server/plugins/static.js");
    const fastify = mockFastify();
    await registerAdminStatic(fastify, {});

    expect(fastify.log.warn).toHaveBeenCalledWith(
      expect.stringContaining("Admin panel build not found"),
    );
    expect(fastify.register).not.toHaveBeenCalled();
  });

  it("registers static serving when adminDir is valid", async () => {
    const { existsSync } = await import("node:fs");
    vi.mocked(existsSync).mockReturnValue(true);

    const { registerAdminStatic } = await import("../src/server/plugins/static.js");
    const fastify = mockFastify();

    await registerAdminStatic(fastify, { adminDir: "/tmp/admin" });

    expect(fastify.log.info).toHaveBeenCalledWith(
      expect.stringContaining("Serving admin panel from /tmp/admin"),
    );
    expect(fastify.register).toHaveBeenCalled();
    expect(fastify.setNotFoundHandler).toHaveBeenCalled();
  });

  it("finds admin dir via env CMS_ADMIN_DIR", async () => {
    vi.stubEnv("CMS_ADMIN_DIR", "/env/admin");
    const { existsSync } = await import("node:fs");
    vi.mocked(existsSync).mockImplementation((path: string) => path === "/env/admin");

    const { registerAdminStatic } = await import("../src/server/plugins/static.js");
    const fastify = mockFastify();

    await registerAdminStatic(fastify, {});

    expect(fastify.log.info).toHaveBeenCalledWith(expect.stringContaining("/env/admin"));
  });
});
