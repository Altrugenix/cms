import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("../src/commands/dev.js", () => ({
  dev: vi.fn().mockResolvedValue(undefined),
  printDevHelp: vi.fn(),
}));

vi.mock("../src/commands/start.js", () => ({
  printStartHelp: vi.fn(),
  start: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../src/commands/build.js", () => ({
  build: vi.fn().mockResolvedValue(undefined),
  printBuildHelp: vi.fn(),
}));

vi.mock("../src/commands/migrate.js", () => ({
  migrate: vi.fn().mockResolvedValue(undefined),
  printMigrateHelp: vi.fn(),
}));

vi.mock("../src/commands/generate.js", () => ({
  generate: vi.fn().mockResolvedValue(undefined),
  printGenerateHelp: vi.fn(),
}));

vi.mock("../src/commands/typegen.js", () => ({
  printTypegenHelp: vi.fn(),
  typegen: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../src/commands/lint.js", () => ({
  lint: vi.fn().mockResolvedValue(undefined),
  printLintHelp: vi.fn(),
}));

vi.mock("../src/commands/doctor.js", () => ({
  doctor: vi.fn().mockResolvedValue(undefined),
  printDoctorHelp: vi.fn(),
}));

vi.mock("../src/commands/collection.js", () => ({
  collectionCreate: vi.fn().mockResolvedValue(undefined),
  printCollectionCreateHelp: vi.fn(),
}));

vi.mock("../src/commands/plugin.js", () => ({
  pluginCreate: vi.fn().mockResolvedValue(undefined),
  printPluginCreateHelp: vi.fn(),
}));

function withLogCapture(fn: (lines: string[]) => Promise<void>): () => Promise<void> {
  return async () => {
    const lines: string[] = [];
    const spy = vi.spyOn(console, "log").mockImplementation((...args: unknown[]) => {
      lines.push(args.join(" "));
    });
    try {
      await fn(lines);
    } finally {
      spy.mockRestore();
    }
  };
}

describe("index / CLI entrypoint", () => {
  const originalArgv = process.argv;
  const originalExit = process.exit;

  beforeEach(() => {
    process.exit = vi.fn() as unknown as typeof process.exit;
    vi.resetModules();
  });

  afterEach(() => {
    process.argv = originalArgv;
    process.exit = originalExit;
  });

  describe("printMainHelp", () => {
    it(
      "prints usage and exits 0 when no args",
      withLogCapture(async (lines) => {
        process.argv = ["node", "cms"];
        const { main } = await import("../src/index.js");
        main();
        expect(process.exit).toHaveBeenCalledWith(0);
        expect(lines.some((l) => l.includes("Usage: cms <command>"))).toBe(true);
        expect(lines.some((l) => l.includes("dev"))).toBe(true);
        expect(lines.some((l) => l.includes("build"))).toBe(true);
        expect(lines.some((l) => l.includes("start"))).toBe(true);
      }),
    );

    it(
      "prints help on --help flag",
      withLogCapture(async (lines) => {
        process.argv = ["node", "cms", "--help"];
        const { main } = await import("../src/index.js");
        main();
        expect(process.exit).toHaveBeenCalledWith(0);
        expect(lines.some((l) => l.includes("Commands:"))).toBe(true);
      }),
    );
  });

  describe("--version flag", () => {
    it("is treated as unknown command and exits 1", async () => {
      process.argv = ["node", "cms", "--version"];
      const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
      const { main } = await import("../src/index.js");
      main();
      expect(errorSpy).toHaveBeenCalledWith("Unknown command: --version ");
      expect(process.exit).toHaveBeenCalledWith(1);
      errorSpy.mockRestore();
      logSpy.mockRestore();
    });
  });

  describe("parseArgs — command dispatch", () => {
    it("calls dev() for dev command", async () => {
      process.argv = ["node", "cms", "dev"];
      const { main } = await import("../src/index.js");
      const { dev } = await import("../src/commands/dev.js");
      main();
      expect(dev).toHaveBeenCalled();
    });

    it("calls start() for start command", async () => {
      process.argv = ["node", "cms", "start"];
      const { main } = await import("../src/index.js");
      const { start } = await import("../src/commands/start.js");
      main();
      expect(start).toHaveBeenCalled();
    });

    it("calls build() for build command", async () => {
      process.argv = ["node", "cms", "build"];
      const { main } = await import("../src/index.js");
      const { build } = await import("../src/commands/build.js");
      main();
      expect(build).toHaveBeenCalled();
    });

    it("calls migrate() for migrate command", async () => {
      process.argv = ["node", "cms", "migrate"];
      const { main } = await import("../src/index.js");
      const { migrate } = await import("../src/commands/migrate.js");
      main();
      expect(migrate).toHaveBeenCalled();
    });

    it("calls generate() for generate command", async () => {
      process.argv = ["node", "cms", "generate"];
      const { main } = await import("../src/index.js");
      const { generate } = await import("../src/commands/generate.js");
      main();
      expect(generate).toHaveBeenCalled();
    });

    it("calls typegen() for typegen command", async () => {
      process.argv = ["node", "cms", "typegen"];
      const { main } = await import("../src/index.js");
      const { typegen } = await import("../src/commands/typegen.js");
      main();
      expect(typegen).toHaveBeenCalled();
    });

    it("calls lint() for lint command", async () => {
      process.argv = ["node", "cms", "lint"];
      const { main } = await import("../src/index.js");
      const { lint } = await import("../src/commands/lint.js");
      main();
      expect(lint).toHaveBeenCalled();
    });

    it("calls doctor() for doctor command", async () => {
      process.argv = ["node", "cms", "doctor"];
      const { main } = await import("../src/index.js");
      const { doctor } = await import("../src/commands/doctor.js");
      main();
      expect(doctor).toHaveBeenCalled();
    });

    it("calls collectionCreate() for collection create", async () => {
      process.argv = ["node", "cms", "collection", "create", "posts"];
      const { main } = await import("../src/index.js");
      const { collectionCreate } = await import("../src/commands/collection.js");
      main();
      expect(collectionCreate).toHaveBeenCalledWith({ dir: undefined, slug: "posts" });
    });

    it("calls pluginCreate() for plugin create", async () => {
      process.argv = ["node", "cms", "plugin", "create", "seo"];
      const { main } = await import("../src/index.js");
      const { pluginCreate } = await import("../src/commands/plugin.js");
      main();
      expect(pluginCreate).toHaveBeenCalledWith({ dir: undefined, slug: "seo" });
    });
  });

  describe("parseArgs — --help per command", () => {
    it("prints dev help with dev --help", async () => {
      process.argv = ["node", "cms", "dev", "--help"];
      const { main } = await import("../src/index.js");
      const { printDevHelp } = await import("../src/commands/dev.js");
      main();
      expect(printDevHelp).toHaveBeenCalled();
    });

    it("prints start help with start --help", async () => {
      process.argv = ["node", "cms", "start", "--help"];
      const { main } = await import("../src/index.js");
      const { printStartHelp } = await import("../src/commands/start.js");
      main();
      expect(printStartHelp).toHaveBeenCalled();
    });

    it("prints build help with build --help", async () => {
      process.argv = ["node", "cms", "build", "--help"];
      const { main } = await import("../src/index.js");
      const { printBuildHelp } = await import("../src/commands/build.js");
      main();
      expect(printBuildHelp).toHaveBeenCalled();
    });

    it("prints migrate help with migrate --help", async () => {
      process.argv = ["node", "cms", "migrate", "--help"];
      const { main } = await import("../src/index.js");
      const { printMigrateHelp } = await import("../src/commands/migrate.js");
      main();
      expect(printMigrateHelp).toHaveBeenCalled();
    });

    it("prints generate help with generate --help", async () => {
      process.argv = ["node", "cms", "generate", "--help"];
      const { main } = await import("../src/index.js");
      const { printGenerateHelp } = await import("../src/commands/generate.js");
      main();
      expect(printGenerateHelp).toHaveBeenCalled();
    });

    it("prints typegen help with typegen --help", async () => {
      process.argv = ["node", "cms", "typegen", "--help"];
      const { main } = await import("../src/index.js");
      const { printTypegenHelp } = await import("../src/commands/typegen.js");
      main();
      expect(printTypegenHelp).toHaveBeenCalled();
    });

    it("prints lint help with lint --help", async () => {
      process.argv = ["node", "cms", "lint", "--help"];
      const { main } = await import("../src/index.js");
      const { printLintHelp } = await import("../src/commands/lint.js");
      main();
      expect(printLintHelp).toHaveBeenCalled();
    });

    it("prints doctor help with doctor --help", async () => {
      process.argv = ["node", "cms", "doctor", "--help"];
      const { main } = await import("../src/index.js");
      const { printDoctorHelp } = await import("../src/commands/doctor.js");
      main();
      expect(printDoctorHelp).toHaveBeenCalled();
    });

    it("prints collection create help with --help", async () => {
      process.argv = ["node", "cms", "collection", "create", "--help"];
      const { main } = await import("../src/index.js");
      const { printCollectionCreateHelp } = await import("../src/commands/collection.js");
      main();
      expect(printCollectionCreateHelp).toHaveBeenCalled();
    });

    it("prints plugin create help with --help", async () => {
      process.argv = ["node", "cms", "plugin", "create", "--help"];
      const { main } = await import("../src/index.js");
      const { printPluginCreateHelp } = await import("../src/commands/plugin.js");
      main();
      expect(printPluginCreateHelp).toHaveBeenCalled();
    });
  });

  describe("parseArgs — flag forwarding", () => {
    it("forwards --port and --host to dev", async () => {
      process.argv = ["node", "cms", "dev", "--port", "4000", "--host", "127.0.0.1"];
      const { main } = await import("../src/index.js");
      const { dev } = await import("../src/commands/dev.js");
      main();
      expect(dev).toHaveBeenCalledWith({
        dbAdapter: undefined,
        dbUrl: undefined,
        dir: undefined,
        host: "127.0.0.1",
        port: 4000,
        vite: false,
      });
    });

    it("forwards --dir, --db-url, --db-adapter to dev", async () => {
      process.argv = [
        "node",
        "cms",
        "dev",
        "--dir",
        "./schemas",
        "--db-url",
        "file:./test.db",
        "--db-adapter",
        "sqlite",
      ];
      const { main } = await import("../src/index.js");
      const { dev } = await import("../src/commands/dev.js");
      main();
      expect(dev).toHaveBeenCalledWith({
        dbAdapter: "sqlite",
        dbUrl: "file:./test.db",
        dir: "./schemas",
        host: undefined,
        port: undefined,
        vite: false,
      });
    });

    it("forwards --port and --host to start", async () => {
      process.argv = ["node", "cms", "start", "--port", "8080"];
      const { main } = await import("../src/index.js");
      const { start } = await import("../src/commands/start.js");
      main();
      expect(start).toHaveBeenCalledWith({
        dbAdapter: undefined,
        dbUrl: undefined,
        dir: undefined,
        host: undefined,
        port: 8080,
        vite: false,
      });
    });

    it("forwards --clean and --out-dir to build", async () => {
      process.argv = ["node", "cms", "build", "--clean", "--out-dir", "./dist"];
      const { main } = await import("../src/index.js");
      const { build } = await import("../src/commands/build.js");
      main();
      expect(build).toHaveBeenCalledWith({ clean: true, outDir: "./dist" });
    });

    it("build without --clean sets clean to false", async () => {
      process.argv = ["node", "cms", "build"];
      const { main } = await import("../src/index.js");
      const { build } = await import("../src/commands/build.js");
      main();
      expect(build).toHaveBeenCalledWith({ clean: false, outDir: undefined });
    });

    it("forwards --dir and --db to migrate", async () => {
      process.argv = ["node", "cms", "migrate", "--dir", "./schemas", "--db", "file:./app.db"];
      const { main } = await import("../src/index.js");
      const { migrate } = await import("../src/commands/migrate.js");
      main();
      expect(migrate).toHaveBeenCalledWith({ db: "file:./app.db", dir: "./schemas" });
    });

    it("forwards --dir and --out to generate", async () => {
      process.argv = ["node", "cms", "generate", "--dir", "./schemas", "--out", "./gen"];
      const { main } = await import("../src/index.js");
      const { generate } = await import("../src/commands/generate.js");
      main();
      expect(generate).toHaveBeenCalledWith({
        dir: "./schemas",
        generators: undefined,
        hooks: false,
        out: "./gen",
        sdk: false,
      });
    });

    it("forwards --dir and --out to typegen", async () => {
      process.argv = ["node", "cms", "typegen", "--dir", "./schemas", "--out", "./types"];
      const { main } = await import("../src/index.js");
      const { typegen } = await import("../src/commands/typegen.js");
      main();
      expect(typegen).toHaveBeenCalledWith({ dir: "./schemas", out: "./types" });
    });

    it("forwards --dir and --fix to lint", async () => {
      process.argv = ["node", "cms", "lint", "--dir", "./schemas", "--fix"];
      const { main } = await import("../src/index.js");
      const { lint } = await import("../src/commands/lint.js");
      main();
      expect(lint).toHaveBeenCalledWith({ dir: "./schemas", fix: true });
    });

    it("lint without --fix sets fix to false", async () => {
      process.argv = ["node", "cms", "lint"];
      const { main } = await import("../src/index.js");
      const { lint } = await import("../src/commands/lint.js");
      main();
      expect(lint).toHaveBeenCalledWith({ dir: undefined, fix: false });
    });

    it("forwards --dir to doctor", async () => {
      process.argv = ["node", "cms", "doctor", "--dir", "./myproject"];
      const { main } = await import("../src/index.js");
      const { doctor } = await import("../src/commands/doctor.js");
      main();
      expect(doctor).toHaveBeenCalledWith({ dir: "./myproject" });
    });

    it("forwards --dir to collection create", async () => {
      process.argv = ["node", "cms", "collection", "create", "posts", "--dir", "./schemas"];
      const { main } = await import("../src/index.js");
      const { collectionCreate } = await import("../src/commands/collection.js");
      main();
      expect(collectionCreate).toHaveBeenCalledWith({ dir: "./schemas", slug: "posts" });
    });

    it("collection create without --dir passes undefined", async () => {
      process.argv = ["node", "cms", "collection", "create", "posts"];
      const { main } = await import("../src/index.js");
      const { collectionCreate } = await import("../src/commands/collection.js");
      main();
      expect(collectionCreate).toHaveBeenCalledWith({ dir: undefined, slug: "posts" });
    });

    it("forwards --dir to plugin create", async () => {
      process.argv = ["node", "cms", "plugin", "create", "seo", "--dir", "./plugins"];
      const { main } = await import("../src/index.js");
      const { pluginCreate } = await import("../src/commands/plugin.js");
      main();
      expect(pluginCreate).toHaveBeenCalledWith({ dir: "./plugins", slug: "seo" });
    });
  });

  describe("unknown command", () => {
    it("prints error and help for unknown command", async () => {
      process.argv = ["node", "cms", "frobnicate"];
      const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
      const { main } = await import("../src/index.js");
      main();
      expect(errorSpy).toHaveBeenCalledWith("Unknown command: frobnicate ");
      expect(process.exit).toHaveBeenCalledWith(1);
      errorSpy.mockRestore();
      logSpy.mockRestore();
    });
  });

  describe("defineConfig", () => {
    it("returns the config object unchanged", async () => {
      const { defineConfig } = await import("../src/index.js");
      const config = {
        database: { adapter: "sqlite" as const, url: "file:./cms.db" },
      };
      expect(defineConfig(config)).toBe(config);
    });
  });
});
