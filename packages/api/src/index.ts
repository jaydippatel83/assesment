import 'dotenv/config';
import { pino } from 'pino';
import { createApp } from './app.js';
import { loadConfig } from './config/env.js';
import { createContext } from './context.js';
import { createPrisma } from './db.js';
import { prismaCatalog } from './services/catalog.js';

const config = loadConfig();
const logger = pino({ level: config.LOG_LEVEL });
const prisma = createPrisma(config.DATABASE_URL);
const ctx = createContext({ config, prisma, logger, catalog: prismaCatalog(prisma) });

const server = createApp(ctx).listen(config.PORT, () => {
  logger.info(`API listening on http://localhost:${config.PORT}`);
});

async function shutdown(signal: string) {
  logger.info({ signal }, 'shutting down');
  server.close();
  await prisma.$disconnect();
  process.exit(0);
}
process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));
