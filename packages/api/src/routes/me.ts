import bcrypt from 'bcrypt';
import { Router } from 'express';
import { z } from 'zod';
import { audit, type AppContext } from '../context.js';
import type { User } from '../generated/prisma/client.ts';
import { AppError } from '../lib/errors.js';
import { authOf, requireAuth } from '../middleware/auth.js';
import { parseBody } from '../middleware/errorHandler.js';
import { maskDob, maskEmail, maskMobile, maskName } from '../services/mask.js';

export function toMaskedProfile(ctx: AppContext, user: User) {
  const { cipher } = ctx;
  return {
    id: user.id,
    role: user.role,
    fullName: maskName(cipher.decrypt(user.nameEnc, 'user.name')),
    email: maskEmail(cipher.decrypt(user.emailEnc, 'user.email')),
    dob: maskDob(cipher.decrypt(user.dobEnc, 'user.dob')),
    mobile: maskMobile(cipher.decrypt(user.mobileEnc, 'user.mobile')),
    createdAt: user.createdAt,
  };
}

const revealSchema = z.object({ password: z.string().min(1, 'Enter your password') });

export function meRoutes(ctx: AppContext) {
  const router = Router();
  router.use(requireAuth(ctx));

  router.get('/', async (req, res) => {
    const user = await ctx.prisma.user.findUnique({ where: { id: authOf(req).userId } });
    if (!user) throw AppError.unauthorized();
    res.json({ user: toMaskedProfile(ctx, user) });
  });

  router.post('/reveal', async (req, res) => {
    const { password } = parseBody(revealSchema, req.body);
    const user = await ctx.prisma.user.findUnique({ where: { id: authOf(req).userId } });
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      await audit(ctx, { action: 'PII_REVEAL_DENIED', userId: authOf(req).userId, ip: req.ip });
      throw new AppError(401, 'INVALID_CREDENTIALS', 'Password is incorrect');
    }
    await audit(ctx, { action: 'PII_REVEAL', userId: user.id, ip: req.ip, metadata: { fields: ['name', 'email', 'dob', 'mobile'] } });

    res.set('Cache-Control', 'no-store');
    res.json({
      user: {
        fullName: ctx.cipher.decrypt(user.nameEnc, 'user.name'),
        email: ctx.cipher.decrypt(user.emailEnc, 'user.email'),
        dob: ctx.cipher.decrypt(user.dobEnc, 'user.dob'),
        mobile: ctx.cipher.decrypt(user.mobileEnc, 'user.mobile'),
      },
    });
  });

  return router;
}
