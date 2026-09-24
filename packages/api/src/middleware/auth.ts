import type { RequestHandler } from 'express';
import type { AppContext } from '../context.js';
import { AppError } from '../lib/errors.js';

declare global {
  namespace Express {
    interface Request {
      auth?: { userId: string; role: 'CUSTOMER' | 'ADMIN' };
    }
  }
}

export function requireAuth(ctx: AppContext): RequestHandler {
  return (req, _res, next) => {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) throw AppError.unauthorized();
    const claims = ctx.tokens.verifyAccess(header.slice('Bearer '.length));
    req.auth = { userId: claims.sub, role: claims.role };
    next();
  };
}

export function authOf(req: Express.Request) {
  if (!req.auth) throw AppError.unauthorized();
  return req.auth;
}
