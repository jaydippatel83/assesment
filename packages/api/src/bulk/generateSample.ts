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
    const age = invalid ? between(15, 22) : between(23, 56);
    const year = 2026 - age - 1;
    const dob = `${year}-${String(between(1, 12)).padStart(2, '0')}-${String(between(1, 28)).padStart(2, '0')}`;
    const premiumTerm = between(5, 10);
    const policyTerm = between(Math.max(premiumTerm + 1, 10), 20);
    const [frequency, perYear] = pick([['ANNUAL', 1], ['SEMI_ANNUAL', 2], ['MONTHLY', 12]] as const);
    const modalPremium = between(10, 50) * 1_000;
    const minSumAssured = Math.min(modalPremium * perYear * 10, 5_000_000);
    const sumAssured = Math.ceil(minSumAssured / 50_000) * 50_000 + between(0, 20) * 50_000;
    const line = [i, 'ENDOWMENT', dob, pick(['MALE', 'FEMALE']), sumAssured, modalPremium, policyTerm, premiumTerm, frequency].join(',');
    if (!out.write(line + '\n')) await once(out, 'drain');
  }
  out.end();
  await once(out, 'finish');
  console.log(`Wrote ${rows.toLocaleString('en-IN')} rows to ${path}`);
}

void main();
