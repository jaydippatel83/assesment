import { loginSchema, registerSchema } from '@app/core';
import bcrypt from 'bcrypt';
import { Router, type CookieOptions, type Response } from 'express';
import { audit, type AppContext } from '../context.js';
import { AppError } from '../lib/errors.js';
import { parseBody } from '../middleware/errorHandler.js';
import { toMaskedProfile } from './me.js';
import { REFRESH_TTL_SECONDS } from '../services/tokens.js';

const BCRYPT_COST = 12;
const REFRESH_COOKIE = 'bi_refresh';

const DUMMY_HASH = bcrypt.hashSync('timing-equaliser', BCRYPT_COST);

export function authRoutes(ctx: AppContext) {
  const router = Router();
  const { prisma, cipher, lookupHash, tokens } = ctx;

  const cookieOptions: CookieOptions = {
    httpOnly: true,
    secure: ctx.config.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/api/auth',
  };

  function issueSession(res: Response, user: { id: string; role: 'CUSTOMER' | 'ADMIN'; tokenVersion: number }) {
    res.cookie(REFRESH_COOKIE, tokens.signRefresh({ sub: user.id, tv: user.tokenVersion }), {
      ...cookieOptions,
      maxAge: REFRESH_TTL_SECONDS * 1000,
    });
    return tokens.signAccess({ sub: user.id, role: user.role });
  }

  router.post('/register', async (req, res) => {
    const input = parseBody(registerSchema, req.body);
    const emailHash = lookupHash(input.email);

    if (await prisma.user.findUnique({ where: { emailHash }, select: { id: true } })) {
      throw new AppError(409, 'EMAIL_TAKEN', 'An account with this email already exists');
    }

    const user = await prisma.user.create({
      data: {
        emailHash,
        emailEnc: cipher.encrypt(input.email, 'user.email'),
        passwordHash: await bcrypt.hash(input.password, BCRYPT_COST),
        nameEnc: cipher.encrypt(input.fullName, 'user.name'),
        dobEnc: cipher.encrypt(input.dob, 'user.dob'),
        mobileEnc: cipher.encrypt(input.mobile, 'user.mobile'),
        nameInitial: input.fullName.charAt(0).toUpperCase(),
        mobileLast4: input.mobile.slice(-4),
      },
    });
    await audit(ctx, { action: 'REGISTER', userId: user.id, ip: req.ip });

    const accessToken = issueSession(res, user);
    res.status(201).json({ accessToken, user: toMaskedProfile(ctx, user) });
  });

  router.post('/login', async (req, res) => {
    const input = parseBody(loginSchema, req.body);
    const user = await prisma.user.findUnique({ where: { emailHash: lookupHash(input.email) } });
    const ok = await bcrypt.compare(input.password, user?.passwordHash ?? DUMMY_HASH);

    if (!user || !ok) {
      await audit(ctx, { action: 'LOGIN_FAILED', userId: user?.id, ip: req.ip });
      throw new AppError(401, 'INVALID_CREDENTIALS', 'Email or password is incorrect');
    }
    await audit(ctx, { action: 'LOGIN', userId: user.id, ip: req.ip });

    const accessToken = issueSession(res, user);
    res.json({ accessToken, user: toMaskedProfile(ctx, user) });
  });

  router.post('/refresh', async (req, res) => {
    const token = req.cookies?.[REFRESH_COOKIE];
    if (typeof token !== 'string') throw AppError.unauthorized('No session');
    const claims = tokens.verifyRefresh(token);
    const user = await prisma.user.findUnique({ where: { id: claims.sub } });
    if (!user || user.tokenVersion !== claims.tv) {
      res.clearCookie(REFRESH_COOKIE, cookieOptions);
      throw AppError.unauthorized('Session expired, please sign in again');
    }
    const accessToken = issueSession(res, user);
    res.json({ accessToken, user: toMaskedProfile(ctx, user) });
  });

  router.post('/logout', async (req, res) => {
    const token = req.cookies?.[REFRESH_COOKIE];
    if (typeof token === 'string') {
      try {
        const claims = tokens.verifyRefresh(token);
        await prisma.user.update({ where: { id: claims.sub }, data: { tokenVersion: { increment: 1 } } });
        await audit(ctx, { action: 'LOGOUT', userId: claims.sub, ip: req.ip });
      } catch {
      }
    }
    res.clearCookie(REFRESH_COOKIE, cookieOptions);
    res.status(204).end();
  });

  return router;
}
