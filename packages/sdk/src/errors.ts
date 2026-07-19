export interface ErrorDetail {
  path: (string | number)[];
  message: string;
}

export class ApiError extends Error {
  status: number;
  details: ErrorDetail[] | undefined;
  code: string | undefined;

  constructor(status: number, message: string, details?: ErrorDetail[], code?: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.details = details;
    this.code = code;
  }
}
