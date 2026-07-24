/** A detail object within an API error response, describing a specific validation failure. */
export interface ErrorDetail {
  /** Path to the field that caused the error (e.g. `["title"]` or `["author", "name"]`). */
  path: (string | number)[];
  /** Human-readable error message. */
  message: string;
}

/**
 * Error thrown when the Arche API returns a non-2xx response.
 *
 * @example
 * ```ts
 * try {
 *   await client.collection("posts").get("invalid-id");
 * } catch (err) {
 *   if (err instanceof ApiError) {
 *     console.error(err.status, err.message, err.details);
 *   }
 * }
 * ```
 */
export class ApiError extends Error {
  /** HTTP status code (e.g. 400, 401, 404, 500). */
  status: number;
  /** Validation error details, if the response included them. */
  details: ErrorDetail[] | undefined;
  /** Machine-readable error code (e.g. `"VALIDATION_ERROR"`). */
  code: string | undefined;

  constructor(status: number, message: string, details?: ErrorDetail[], code?: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.details = details;
    this.code = code;
  }
}
