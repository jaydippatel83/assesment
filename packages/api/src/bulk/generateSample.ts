import { createWriteStream } from 'node:fs';
import { once } from 'node:events';
import { INPUT_COLUMNS } from './protocol.js';

const rows = Number(process.argv[2] ?? 100_000);
const path = process.argv[3] ?? 'bulk-input.csv';

let seed = 42;
const rand = () => ((seed = (seed * 1_103_515_245 + 12_345) % 2 ** 31) / 2 ** 31);
const pick = <T>(xs: readonly T[]) => xs[Math.floor(rand() * xs.length)]!;
const between = (lo: number, hi: number) => lo + Math.floor(rand() * (hi - lo + 1));

async function main() {
  const out = createWriteStream(path);
  out.write(INPUT_COLUMNS.join(',') + '\n');

  for (let i = 1; i <= rows; i++) {
    const invalid = rand() < 0.05;
    const code = pick(['ENDOWMENT', 'MONEYBACK'] as const);
    const age = invalid ? between(10, 17) : between(18, 45);
    const year = 2026 - age - 1;
    const dob = `${year}-${String(between(1, 12)).padStart(2, '0')}-${String(between(1, 28)).padStart(2, '0')}`;
    const policyTerm = code === 'ENDOWMENT' ? between(10, 25) : between(12, 20);
    const premiumTerm = between(code === 'ENDOWMENT' ? 5 : 7, policyTerm);
    const sumAssured = between(4, 40) * 50_000;
    const frequency = pick(code === 'ENDOWMENT' ? ['ANNUAL', 'SEMI_ANNUAL', 'QUARTERLY', 'MONTHLY'] : ['ANNUAL', 'SEMI_ANNUAL', 'MONTHLY']);
    const riders = pick(['', 'ADB', 'ADB|WOP']);
    const line = [i, code, dob, pick(['MALE', 'FEMALE']), sumAssured, policyTerm, premiumTerm, frequency, riders].join(',');
    if (!out.write(line + '\n')) await once(out, 'drain');
  }
  out.end();
  await once(out, 'finish');
  console.log(`Wrote ${rows.toLocaleString('en-IN')} rows to ${path}`);
}

void main();
