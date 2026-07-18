import { describe, it, expect } from "vitest";

import { datetime } from "../src/fields.js";

describe("datetime field helper", () => {
  it("creates a datetime field", () => {
    const f = datetime("publishedAt");
    expect(f.name).toBe("publishedAt");
    expect(f.type).toBe("datetime");
  });

  it("creates a datetime field with options", () => {
    const f = datetime("createdAt", { label: "Created At", validation: { required: true } });
    expect(f.type).toBe("datetime");
    expect(f.label).toBe("Created At");
    expect(f.validation?.required).toBe(true);
  });
});
