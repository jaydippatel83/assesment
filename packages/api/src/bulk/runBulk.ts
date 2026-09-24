import { createReadStream, createWriteStream } from 'node:fs';
import os from 'node:os';
import { once } from 'node:events';
import readline from 'node:readline';
import { parseArgs } from 'node:util';
import { Worker } from 'node:worker_threads';
import { todayIn } from '../lib/dates.js';
import { INPUT_COLUMNS, OUTPUT_COLUMNS, type ChunkRequest, type ChunkResult } from './protocol.js';

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    workers: { type: 'string', default: String(Math.max(os.availableParallelism() - 1, 1)) },
    chunk: { type: 'string', default: '5000' },
    'as-of': { type: 'string' },
  },
});

const [inputPath, outputPath] = positionals;
if (!inputPath || !outputPath) {
  console.error('Usage: runBulk <input.csv> <output.csv> [--workers N] [--chunk N] [--as-of YYYY-MM-DD]');
  process.exit(1);
}

const workerCount = Number(values.workers);
const chunkSize = Number(values.chunk);
const asOf = values['as-of'] ?? todayIn('Asia/Kolkata');

async function main() {
  const started = performance.now();
  const output = createWriteStream(outputPath!);
  output.write(OUTPUT_COLUMNS.join(',') + '\n');

  const totals = { rows: 0, ok: 0, invalid: 0, errored: 0, chunks: 0 };
  const idle: Worker[] = [];
  let waitingForWorker: (() => void) | undefined;
  let inFlight = 0;
  let allDone: (() => void) | undefined;

  const workers = Array.from({ length: workerCount }, () => {
    const worker = new Worker(new URL('./worker.ts', import.meta.url), {
      resourceLimits: { maxOldGenerationSizeMb: 128 },
    });
    worker.on('message', async (result: ChunkResult) => {
      totals.ok += result.ok;
      totals.invalid += result.invalid;
      totals.errored += result.errored;
      totals.chunks++;
      if (!output.write(result.output)) await once(output, 'drain');
      inFlight--;
      idle.push(worker);
      waitingForWorker?.();
      if (inFlight === 0) allDone?.();
    });
    worker.on('error', (err) => {
      console.error('worker crashed:', err);
      process.exit(1);
    });
    idle.push(worker);
    return worker;
  });

  async function dispatch(lines: string[], chunkId: number) {
    while (idle.length === 0) {
      await new Promise<void>((resolve) => (waitingForWorker = resolve));
    }
    inFlight++;
    const request: ChunkRequest = { chunkId, asOf, lines };
    idle.pop()!.postMessage(request);
  }

  const lines = readline.createInterface({ input: createReadStream(inputPath!), crlfDelay: Infinity });
  let header = true;
  let batch: string[] = [];
  let chunkId = 0;

  for await (const line of lines) {
    if (header) {
      header = false;
      if (line.trim() !== INPUT_COLUMNS.join(',')) {
        throw new Error(`Unexpected header. Expected: ${INPUT_COLUMNS.join(',')}`);
      }
      continue;
    }
    if (!line.trim()) continue;
    batch.push(line);
    totals.rows++;
    if (batch.length >= chunkSize) {
      await dispatch(batch, chunkId++);
      batch = [];
    }
  }
  if (batch.length) await dispatch(batch, chunkId++);
  if (inFlight > 0) await new Promise<void>((resolve) => (allDone = resolve));

  output.end();
  await once(output, 'finish');
  await Promise.all(workers.map((w) => w.terminate()));

  const seconds = (performance.now() - started) / 1000;
  const memMb = Math.round(process.memoryUsage().rss / 1024 / 1024);
  console.log(
    `${totals.rows.toLocaleString('en-IN')} rows in ${seconds.toFixed(1)}s ` +
      `(${Math.round(totals.rows / seconds).toLocaleString('en-IN')} rows/s) ` +
      `with ${workerCount} workers, ${totals.chunks} chunks of ${chunkSize}. ` +
      `OK ${totals.ok}, invalid ${totals.invalid}, errors ${totals.errored}. ` +
      `RSS at end ~${memMb} MB. As-of ${asOf}.`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
