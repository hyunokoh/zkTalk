import { describe, it, expect } from 'vitest';
import { AppError } from '../lib/errors.js';

describe('AppError', () => {
  it('creates a bad request error', () => {
    const error = AppError.badRequest('Invalid input');
    expect(error.statusCode).toBe(400);
    expect(error.code).toBe('BAD_REQUEST');
    expect(error.message).toBe('Invalid input');
  });

  it('creates an unauthorized error', () => {
    const error = AppError.unauthorized();
    expect(error.statusCode).toBe(401);
    expect(error.code).toBe('UNAUTHORIZED');
  });

  it('creates a not found error', () => {
    const error = AppError.notFound('User not found');
    expect(error.statusCode).toBe(404);
    expect(error.message).toBe('User not found');
  });
});
