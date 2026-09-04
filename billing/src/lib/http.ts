// SlyxUp Billing — HTTP error type shared across routes

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export function badRequest(msg = 'Bad request'): ApiError {
  return new ApiError(400, msg);
}
export function unauthorized(msg = 'Unauthorized'): ApiError {
  return new ApiError(401, msg);
}
export function forbidden(msg = 'Forbidden'): ApiError {
  return new ApiError(403, msg);
}
export function notFound(msg = 'Not found'): ApiError {
  return new ApiError(404, msg);
}
export function conflict(msg = 'Conflict'): ApiError {
  return new ApiError(409, msg);
}
export function notConfigured(msg = 'Billing not configured'): ApiError {
  return new ApiError(501, msg);
}
