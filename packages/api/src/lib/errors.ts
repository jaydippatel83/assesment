import type { ValidationIssue } from '@app/core';

export class AppError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details?: { field: string; message: string; code?: string }[],
  ) {
    super(message);
    this.name = 'AppError';
  }

  static validation(details: { field: string; message: string; code?: string }[]) {
    return new AppError(400, 'VALIDATION_FAILED', 'One or more inputs are invalid', details);
  }

  static fromIssues(issues: ValidationIssue[]) {
    return AppError.validation(issues.map(({ field, message, code }) => ({ field, message, code })));
  }

  static unauthorized(message = 'Authentication required') {
    return new AppError(401, 'UNAUTHORIZED', message);
  }

  static notFound(what: string) {
    return new AppError(404, 'NOT_FOUND', `${what} not found`);
  }
}
