import { InvalidIllustrationError, RateNotFoundError } from '@app/core';
import type { ErrorRequestHandler, RequestHandler } from 'express';
import { ZodError, type ZodType } from 'zod';
import type { AppContext } from '../context.js';
import { AppError } from '../lib/errors.js';

export function zodToAppError(error: ZodError) {
  return AppError.validation(
    error.issues.map((i) => ({
      field: i.path.join('.') || '_root',
      message: i.message,
      code: (i as { params?: { rule?: string } }).params?.rule ?? i.code,
    })),
  );
}

export function parseBody<T extends ZodType>(schema: T, body: unknown) {
  const result = schema.safeParse(body);
  if (!result.success) throw zodToAppError(result.error);
  return result.data as T['_output'];
}

export const notFound: RequestHandler = (_req, _res, next) => next(AppError.notFound('Route'));

export function errorHandler(ctx: AppContext): ErrorRequestHandler {
  return (err, req, res, _next) => {
    let appError: AppError;
    if (err instanceof AppError) appError = err;
    else if (err instanceof ZodError) appError = zodToAppError(err);
    else if (err instanceof RateNotFoundError) {
      appError = new AppError(422, 'RATE_NOT_FOUND', 'No rate is available for these inputs');
    } else if (err instanceof InvalidIllustrationError) {
      appError = new AppError(422, 'INVALID_ILLUSTRATION', err.message);
    } else if (err?.type === 'entity.parse.failed') {
      appError = new AppError(400, 'MALFORMED_JSON', 'Request body is not valid JSON');
    } else if (err?.type === 'entity.too.large') {
      appError = new AppError(413, 'PAYLOAD_TOO_LARGE', 'Request body is too large');
    } else {
      ctx.logger.error({ err, reqId: req.id }, 'unhandled error');
      appError = new AppError(500, 'INTERNAL_ERROR', 'Something went wrong');
    }

    res.status(appError.status).json({
      error: {
        code: appError.code,
        message: appError.message,
        ...(appError.details ? { details: appError.details } : {}),
      },
    });
  };
}
