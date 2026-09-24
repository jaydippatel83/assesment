import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import { pinoHttp } from 'pino-http';
import type { AppContext } from './context.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';
import { authRoutes } from './routes/auth.js';
import { illustrationRoutes } from './routes/illustrations.js';
import { meRoutes } from './routes/me.js';
import { policyRoutes } from './routes/policies.js';

const LOG_REDACT = [
  'req.headers.authorization',
  'req.headers.cookie',
  'res.headers["set-cookie"]',
  'req.body.password',
  'req.body.email',
  'req.body.fullName',
  'req.body.dob',
  'req.body.mobile',
];

export function createApp(ctx: AppContext) {
  const app = express();
  const isTest = ctx.config.NODE_ENV === 'test';

  app.disable('x-powered-by');
  app.set('trust proxy', 1);
  app.use(helmet());
  app.use(cors({ origin: ctx.config.WEB_ORIGIN, credentials: true }));
  app.use(express.json({ limit: '100kb' }));
  app.use(cookieParser());
  app.use(pinoHttp({ logger: ctx.logger, redact: { paths: LOG_REDACT, censor: '[REDACTED]' } }));

  const authLimiter = rateLimit({
    windowMs: 15 * 60_000,
    limit: 10,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    skip: () => isTest,
    message: { error: { code: 'RATE_LIMITED', message: 'Too many attempts, try again later' } },
  });
  app.use(['/api/auth/login', '/api/auth/register', '/api/me/reveal'], authLimiter);

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok' });
  });
  app.use('/api/auth', authRoutes(ctx));
  app.use('/api/me', meRoutes(ctx));
  app.use('/api/policy-types', policyRoutes(ctx));
  app.use('/api/illustrations', illustrationRoutes(ctx));

  app.use(notFound);
  app.use(errorHandler(ctx));
  return app;
}
