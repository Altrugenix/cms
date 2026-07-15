import { describe, it, expect } from "vitest";
import {
  AppError,
  NotFoundError,
  ValidationError,
  ConflictError,
  AuthError,
  ForbiddenError,
} from "../src/server/lib/errors.js";

describe("AppError", () => {
  it("creates an error with message and statusCode", () => {
    const err = new AppError("Something went wrong", 400, "BAD_REQUEST", { field: "name" });
    expect(err.message).toBe("Something went wrong");
    expect(err.statusCode).toBe(400);
    expect(err.code).toBe("BAD_REQUEST");
    expect(err.details).toEqual({ field: "name" });
    expect(err.name).toBe("AppError");
  });

  it("defaults to status 500", () => {
    const err = new AppError("fail");
    expect(err.statusCode).toBe(500);
  });
});

describe("NotFoundError", () => {
  it("creates error with resource name", () => {
    const err = new NotFoundError("Post");
    expect(err.message).toBe("Post not found");
    expect(err.statusCode).toBe(404);
    expect(err.code).toBe("NOT_FOUND");
  });

  it("creates error with resource name and id", () => {
    const err = new NotFoundError("Post", "123");
    expect(err.message).toBe("Post not found: 123");
  });
});

describe("ValidationError", () => {
  it("creates error with message and details", () => {
    const err = new ValidationError("Invalid input", { name: "required" });
    expect(err.message).toBe("Invalid input");
    expect(err.statusCode).toBe(400);
    expect(err.code).toBe("VALIDATION_ERROR");
    expect(err.details).toEqual({ name: "required" });
  });
});

describe("ConflictError", () => {
  it("creates conflict error", () => {
    const err = new ConflictError("Email already exists");
    expect(err.message).toBe("Email already exists");
    expect(err.statusCode).toBe(409);
    expect(err.code).toBe("CONFLICT");
  });
});

describe("AuthError", () => {
  it("creates auth error with default message", () => {
    const err = new AuthError();
    expect(err.message).toBe("Not authenticated");
    expect(err.statusCode).toBe(401);
    expect(err.code).toBe("AUTH_ERROR");
  });

  it("creates auth error with custom message", () => {
    const err = new AuthError("Token expired");
    expect(err.message).toBe("Token expired");
  });
});

describe("ForbiddenError", () => {
  it("creates forbidden error with default message", () => {
    const err = new ForbiddenError();
    expect(err.message).toBe("Forbidden");
    expect(err.statusCode).toBe(403);
    expect(err.code).toBe("FORBIDDEN");
  });

  it("creates forbidden error with custom message", () => {
    const err = new ForbiddenError("Admins only");
    expect(err.message).toBe("Admins only");
  });
});
