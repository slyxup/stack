import { describe, it, expect } from 'vitest';
import {
  SlyxupError,
  UnauthorizedError,
  ValidationError,
  NetworkError,
  RateLimitError,
} from '../src/errors.js';

describe('SlyxupError', () => {
  it('should set message, status, code, and name', () => {
    const err = new SlyxupError('test', 500, 'test_error');
    expect(err.message).toBe('test');
    expect(err.status).toBe(500);
    expect(err.code).toBe('test_error');
    expect(err.name).toBe('SlyxupError');
  });

  it('should be instanceof Error', () => {
    const err = new SlyxupError('test', 400, 'err');
    expect(err).toBeInstanceOf(Error);
  });

  it('should be instanceof SlyxupError', () => {
    const err = new SlyxupError('test', 400, 'err');
    expect(err).toBeInstanceOf(SlyxupError);
  });
});

describe('UnauthorizedError', () => {
  it('should have default values', () => {
    const err = new UnauthorizedError();
    expect(err.message).toBe('Unauthorized');
    expect(err.status).toBe(401);
    expect(err.code).toBe('unauthorized');
    expect(err.name).toBe('UnauthorizedError');
  });

  it('should accept custom message', () => {
    const err = new UnauthorizedError('Custom');
    expect(err.message).toBe('Custom');
    expect(err.status).toBe(401);
  });

  it('should be instanceof SlyxupError', () => {
    expect(new UnauthorizedError()).toBeInstanceOf(SlyxupError);
    expect(new UnauthorizedError()).toBeInstanceOf(Error);
  });
});

describe('ValidationError', () => {
  it('should have default values', () => {
    const err = new ValidationError();
    expect(err.message).toBe('Validation failed');
    expect(err.status).toBe(400);
    expect(err.code).toBe('validation_error');
    expect(err.name).toBe('ValidationError');
  });

  it('should accept custom message', () => {
    const err = new ValidationError('Bad input');
    expect(err.message).toBe('Bad input');
    expect(err.status).toBe(400);
  });

  it('should be instanceof SlyxupError', () => {
    expect(new ValidationError()).toBeInstanceOf(SlyxupError);
  });
});

describe('NetworkError', () => {
  it('should have default values', () => {
    const err = new NetworkError();
    expect(err.message).toBe('Network request failed');
    expect(err.status).toBe(0);
    expect(err.code).toBe('network_error');
    expect(err.name).toBe('NetworkError');
  });

  it('should accept custom message', () => {
    const err = new NetworkError('Timeout');
    expect(err.message).toBe('Timeout');
    expect(err.status).toBe(0);
  });

  it('should be instanceof SlyxupError', () => {
    expect(new NetworkError()).toBeInstanceOf(SlyxupError);
  });
});

describe('RateLimitError', () => {
  it('should have default values', () => {
    const err = new RateLimitError();
    expect(err.message).toBe('Too many requests');
    expect(err.status).toBe(429);
    expect(err.code).toBe('rate_limited');
    expect(err.name).toBe('RateLimitError');
  });

  it('should accept custom message', () => {
    const err = new RateLimitError('Slow down');
    expect(err.message).toBe('Slow down');
    expect(err.status).toBe(429);
  });

  it('should be instanceof SlyxupError', () => {
    expect(new RateLimitError()).toBeInstanceOf(SlyxupError);
  });
});
