import { vi } from "vitest";

const mockCompare = vi.fn(async (pw: string, _hash: string) => {
  if (pw.startsWith("wrong")) return false;
  return true;
});

vi.mock("bcryptjs", () => ({
  default: {
    hash: vi.fn(async () => "$2b$12$testhashedpasswordvalue1234567890abcdef"),
    compare: mockCompare,
  },
  hash: vi.fn(async () => "$2b$12$testhashedpasswordvalue1234567890abcdef"),
  compare: mockCompare,
}));
