import Decimal from 'decimal.js';

export const D = Decimal.clone({ precision: 30, rounding: Decimal.ROUND_HALF_UP });
export type Money = InstanceType<typeof D>;

export const ZERO = new D(0);

export function roundMoney(value: Money): Money {
  return value.toDecimalPlaces(2, D.ROUND_HALF_UP);
}

export function toMoneyString(value: Money): string {
  return roundMoney(value).toFixed(2);
}

export function maxOf(...values: Money[]): Money {
  return values.reduce((best, v) => (v.greaterThan(best) ? v : best));
}
