import { ILLUSTRATION_COLUMNS } from '@app/core';
import { Router } from 'express';
import type { AppContext } from '../context.js';
import { AppError } from '../lib/errors.js';
import { requireAuth } from '../middleware/auth.js';

export function policyRoutes(ctx: AppContext) {
  const router = Router();
  router.use(requireAuth(ctx));

  router.get('/', async (_req, res) => {
    const products = await ctx.catalog.list();
    res.json({
      policyTypes: products.map((p) => ({ ...p.policyType, rateVersion: p.rates.version })),
      columns: ILLUSTRATION_COLUMNS,
    });
  });

  router.get('/:code', async (req, res) => {
    const product = await ctx.catalog.get(req.params.code);
    if (!product) throw AppError.notFound('Policy type');
    res.json({ policyType: { ...product.policyType, rateVersion: product.rates.version } });
  });

  return router;
}
