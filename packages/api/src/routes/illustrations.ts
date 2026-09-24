import {
  createIllustrationSchema,
  generateIllustration,
  ILLUSTRATION_COLUMNS,
  illustrationInputShape,
  toIllustrationDTO,
  type IllustrationInput,
  type Product,
} from '@app/core';
import { Router } from 'express';
import { audit, type AppContext } from '../context.js';
import { dateColumn, isoDateOf, todayIn } from '../lib/dates.js';
import { AppError } from '../lib/errors.js';
import { authOf, requireAuth } from '../middleware/auth.js';
import { parseBody } from '../middleware/errorHandler.js';
import { maskDob } from '../services/mask.js';

export function illustrationRoutes(ctx: AppContext) {
  const router = Router();
  router.use(requireAuth(ctx));

  async function calculate(body: unknown) {
    const asOf = todayIn(ctx.config.BUSINESS_TIMEZONE);
    const shaped = parseBody(illustrationInputShape, body);
    const product = await ctx.catalog.get(shaped.policyTypeCode);
    const input = parseBody(createIllustrationSchema(product?.policyType, asOf), body);
    const result = generateIllustration(input, product!.policyType, product!.rates, asOf);
    return { input, product: product!, asOf, result };
  }

  const view = (product: Product, input: IllustrationInput, asOf: string, result: ReturnType<typeof generateIllustration>) => ({
    policyType: { code: product.policyType.code, name: product.policyType.name },
    input: { ...input, dob: maskDob(input.dob) },
    asOf,
    columns: ILLUSTRATION_COLUMNS,
    ...toIllustrationDTO(result),
  });

  router.post('/preview', async (req, res) => {
    const { input, product, asOf, result } = await calculate(req.body);
    res.json(view(product, input, asOf, result));
  });

  router.post('/', async (req, res) => {
    const { userId } = authOf(req);
    const { input, product, asOf, result } = await calculate(req.body);
    const policyType = await ctx.prisma.policyType.findUniqueOrThrow({
      where: { code: product.policyType.code },
      select: { id: true },
    });

    const saved = await ctx.prisma.illustration.create({
      data: {
        userId,
        policyTypeId: policyType.id,
        dobEnc: ctx.cipher.encrypt(input.dob, 'illustration.dob'),
        gender: input.gender,
        sumAssured: input.sumAssured.toString(),
        policyTerm: input.policyTerm,
        premiumTerm: input.premiumTerm,
        frequency: input.frequency,
        riderCodes: input.riderCodes,
        asOfDate: dateColumn(asOf),
        rateVersion: result.rateVersion,
        entryAge: result.premium.entryAge,
        modalPremium: result.premium.modalPremium.toFixed(2),
        totalPremium: result.summary.totalPremiumPaid.toFixed(2),
        maturityBenefit: result.summary.maturityBenefit.toFixed(2),
      },
    });
    await audit(ctx, { action: 'ILLUSTRATION_CREATE', userId, ip: req.ip, metadata: { illustrationId: saved.id } });

    res.status(201).json({ id: saved.id, createdAt: saved.createdAt, ...view(product, input, asOf, result) });
  });

  router.get('/', async (req, res) => {
    const rows = await ctx.prisma.illustration.findMany({
      where: { userId: authOf(req).userId },
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: { policyType: { select: { code: true, name: true } } },
    });
    res.json({
      illustrations: rows.map((r) => ({
        id: r.id,
        policyType: r.policyType,
        sumAssured: r.sumAssured.toFixed(2),
        policyTerm: r.policyTerm,
        premiumTerm: r.premiumTerm,
        frequency: r.frequency,
        riderCodes: r.riderCodes,
        asOf: isoDateOf(r.asOfDate),
        entryAge: r.entryAge,
        modalPremium: r.modalPremium.toFixed(2),
        totalPremium: r.totalPremium.toFixed(2),
        maturityBenefit: r.maturityBenefit.toFixed(2),
        createdAt: r.createdAt,
      })),
    });
  });

  router.get('/:id', async (req, res) => {
    const row = await ctx.prisma.illustration.findUnique({
      where: { id: req.params.id },
      include: { policyType: { select: { code: true } } },
    });
    if (!row || row.userId !== authOf(req).userId) throw AppError.notFound('Illustration');

    const product = await ctx.catalog.getVersion(row.policyType.code, row.rateVersion);
    if (!product) throw new AppError(409, 'RATES_UNAVAILABLE', `Rate version ${row.rateVersion} is no longer available`);

    const asOf = isoDateOf(row.asOfDate);
    const input: IllustrationInput = {
      policyTypeCode: row.policyType.code,
      dob: ctx.cipher.decrypt(row.dobEnc, 'illustration.dob'),
      gender: row.gender,
      sumAssured: Number(row.sumAssured),
      policyTerm: row.policyTerm,
      premiumTerm: row.premiumTerm,
      frequency: row.frequency,
      riderCodes: row.riderCodes,
    };
    const result = generateIllustration(input, product.policyType, product.rates, asOf);
    res.json({ id: row.id, createdAt: row.createdAt, ...view(product, input, asOf, result) });
  });

  return router;
}
