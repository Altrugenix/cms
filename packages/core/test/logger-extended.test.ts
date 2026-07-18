import { describe, it, expect, beforeEach, vi } from "vitest";

import { createLogger } from "../src/logger.js";

describe("createLogger extended", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("level filtering", () => {
    it("suppresses debug when level is info", () => {
      const spy = vi.spyOn(console, "debug").mockImplementation(() => {});
      const logger = createLogger({ level: "info" });
      logger.debug("should not appear");
      expect(spy).not.toHaveBeenCalled();
    });

    it("suppresses info when level is warn", () => {
      const spy = vi.spyOn(console, "info").mockImplementation(() => {});
      const logger = createLogger({ level: "warn" });
      logger.info("should not appear");
      expect(spy).not.toHaveBeenCalled();
    });

    it("allows warn when level is warn", () => {
      const spy = vi.spyOn(console, "warn").mockImplementation(() => {});
      const logger = createLogger({ level: "warn" });
      logger.warn("should appear");
      expect(spy).toHaveBeenCalledOnce();
    });

    it("allows all levels when level is debug", () => {
      const debugSpy = vi.spyOn(console, "debug").mockImplementation(() => {});
      const infoSpy = vi.spyOn(console, "info").mockImplementation(() => {});
      const logger = createLogger({ level: "debug" });
      logger.debug("debug");
      logger.info("info");
      expect(debugSpy).toHaveBeenCalledOnce();
      expect(infoSpy).toHaveBeenCalledOnce();
    });
  });

  describe("prefix", () => {
    it("uses custom prefix", () => {
      const spy = vi.spyOn(console, "info").mockImplementation(() => {});
      const logger = createLogger({ level: "info", prefix: "myapp" });
      logger.info("test");
      expect(spy).toHaveBeenCalledWith(expect.stringContaining("[myapp]"));
    });

    it("defaults to cms prefix", () => {
      const spy = vi.spyOn(console, "info").mockImplementation(() => {});
      const logger = createLogger({ level: "info" });
      logger.info("test");
      expect(spy).toHaveBeenCalledWith(expect.stringContaining("[cms]"));
    });
  });

  describe("message formatting", () => {
    it("formats timestamp", () => {
      const spy = vi.spyOn(console, "info").mockImplementation(() => {});
      const logger = createLogger({ level: "info" });
      logger.info("hello");
      const msg = spy.mock.calls[0][0] as string;
      expect(msg).toMatch(/^\[\d{4}-\d{2}-\d{2}T/);
    });

    it("serializes objects", () => {
      const spy = vi.spyOn(console, "info").mockImplementation(() => {});
      const logger = createLogger({ level: "info" });
      logger.info({ key: "value" });
      const msg = spy.mock.calls[0][0] as string;
      expect(msg).toContain('{"key":"value"}');
    });

    it("joins multiple arguments", () => {
      const spy = vi.spyOn(console, "info").mockImplementation(() => {});
      const logger = createLogger({ level: "info" });
      logger.info("a", "b", "c");
      const msg = spy.mock.calls[0][0] as string;
      expect(msg).toContain("a b c");
    });

    it("fatal level uses console.error", () => {
      const spy = vi.spyOn(console, "error").mockImplementation(() => {});
      const logger = createLogger({ level: "debug" });
      logger.fatal("crash");
      expect(spy).toHaveBeenCalledOnce();
    });
  });
});
