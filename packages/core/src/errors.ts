// SlyxUp Core SDK — typed errors

export class SlyxupError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(message: string, status: number, code: string) {
    super(message);
    this.name = 'SlyxupError';
    this.status = status;
    this.code = code;
  }
}

export class UnauthorizedError extends SlyxupError {
  constructor(message = 'Unauthorized') {
    super(message, 401, 'unauthorized');
    this.name = 'UnauthorizedError';
  }
}

export class ValidationError extends SlyxupError {
  constructor(message = 'Validation failed') {
    super(message, 400, 'validation_error');
    this.name = 'ValidationError';
  }
}

export class NetworkError extends SlyxupError {
  constructor(message = 'Network request failed') {
    super(message, 0, 'network_error');
    this.name = 'NetworkError';
  }
}

export class RateLimitError extends SlyxupError {
  constructor(message = 'Too many requests') {
    super(message, 429, 'rate_limited');
    this.name = 'RateLimitError';
  }
}
