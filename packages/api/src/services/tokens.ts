import jwt from 'jsonwebtoken';
import type { Config } from '../config/env.js';
import { AppError } from '../lib/errors.js';

const ISSUER = 'benefit-illustration-api';
const ACCESS_TTL = '15m';
export const REFRESH_TTL_SECONDS = 7 * 24 * 60 * 60;

export interface AccessClaims {
  sub: string;
  role: 'CUSTOMER' | 'ADMIN';
}

export interface RefreshClaims {
  sub: string;
  tv: number;
}

export function createTokenService(config: Pick<Config, 'JWT_ACCESS_SECRET' | 'JWT_REFRESH_SECRET'>) {
  const verifyOpts = { algorithms: ['HS256' as const], issuer: ISSUER };

  return {
    signAccess(claims: AccessClaims) {
      return jwt.sign({ role: claims.role }, config.JWT_ACCESS_SECRET, {
        algorithm: 'HS256',
        subject: claims.sub,
        issuer: ISSUER,
        audience: 'access',
        expiresIn: ACCESS_TTL,
      });
    },

    verifyAccess(token: string): AccessClaims {
      try {
        const payload = jwt.verify(token, config.JWT_ACCESS_SECRET, { ...verifyOpts, audience: 'access' });
        if (typeof payload === 'string' || !payload.sub) throw new Error('bad payload');
        return { sub: payload.sub, role: payload['role'] === 'ADMIN' ? 'ADMIN' : 'CUSTOMER' };
      } catch {
        throw AppError.unauthorized('Session expired or invalid');
      }
    },

    signRefresh(claims: RefreshClaims) {
      return jwt.sign({ tv: claims.tv }, config.JWT_REFRESH_SECRET, {
        algorithm: 'HS256',
        subject: claims.sub,
        issuer: ISSUER,
        audience: 'refresh',
        expiresIn: REFRESH_TTL_SECONDS,
      });
    },

    verifyRefresh(token: string): RefreshClaims {
      try {
        const payload = jwt.verify(token, config.JWT_REFRESH_SECRET, { ...verifyOpts, audience: 'refresh' });
        if (typeof payload === 'string' || !payload.sub || typeof payload['tv'] !== 'number') {
          throw new Error('bad payload');
        }
        return { sub: payload.sub, tv: payload['tv'] };
      } catch {
        throw AppError.unauthorized('Session expired, please sign in again');
      }
    },
  };
}

export type TokenService = ReturnType<typeof createTokenService>;
