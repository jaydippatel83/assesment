import { D, ZERO, type Money } from './money.js';

const TOLERANCE = new D('1e-12');
const LOWEST = new D('-0.99');
const HIGHEST = new D(10);

/** Net present value at `rate` and its derivative with respect to the rate. */
function npvWithSlope(rate: Money, cashflows: Money[]): { npv: Money; slope: Money } {
  const discount = new D(1).div(rate.plus(1));
  let factor = new D(1);
  let npv = ZERO;
  let slope = ZERO;
  cashflows.forEach((cf, t) => {
    if (!cf.isZero()) {
      npv = npv.plus(cf.times(factor));
      slope = slope.minus(cf.times(t).times(factor).times(discount));
    }
    factor = factor.times(discount);
  });
  return { npv, slope };
}

/** A float estimate to start from, so the exact decimal iterations only have to polish it. */
function floatEstimate(cashflows: Money[]): number {
  const flows = cashflows.map((cf) => cf.toNumber());
  let rate = 0.1;
  for (let i = 0; i < 30; i++) {
    let npv = 0;
    let slope = 0;
    flows.forEach((cf, t) => {
      npv += cf / (1 + rate) ** t;
      slope -= (t * cf) / (1 + rate) ** (t + 1);
    });
    const next = rate - npv / slope;
    if (!Number.isFinite(next) || next <= -0.99 || next >= 10) return 0.1;
    if (Math.abs(next - rate) < 1e-14) return next;
    rate = next;
  }
  return rate;
}

function newton(cashflows: Money[]): Money | null {
  let rate = new D(floatEstimate(cashflows));
  for (let i = 0; i < 50; i++) {
    const { npv, slope } = npvWithSlope(rate, cashflows);
    if (slope.isZero()) return null;
    const next = rate.minus(npv.div(slope));
    if (next.lt(LOWEST) || next.gt(HIGHEST)) return null;
    if (next.minus(rate).abs().lt(TOLERANCE)) return next;
    rate = next;
  }
  return null;
}

function bisect(cashflows: Money[]): Money | null {
  let low = LOWEST;
  let high = HIGHEST;
  const lowSign = npvWithSlope(low, cashflows).npv.isPositive();
  if (npvWithSlope(high, cashflows).npv.isPositive() === lowSign) return null;
  while (high.minus(low).gte(TOLERANCE)) {
    const mid = low.plus(high).div(2);
    if (npvWithSlope(mid, cashflows).npv.isPositive() === lowSign) low = mid;
    else high = mid;
  }
  return low.plus(high).div(2);
}

/**
 * Internal rate of return of yearly cash flows, the first one at time 0, as a fraction.
 * Matches the spreadsheet IRR() function. Newton's method, started from a float estimate,
 * converges in two or three exact steps; bisection is the fallback if it does not.
 * Returns null when the flows never change sign, because no rate can then bring their net
 * present value to zero.
 */
export function irr(cashflows: Money[]): Money | null {
  const hasOutflow = cashflows.some((cf) => cf.isNegative() && !cf.isZero());
  const hasInflow = cashflows.some((cf) => cf.isPositive() && !cf.isZero());
  if (!hasOutflow || !hasInflow) return null;
  return newton(cashflows) ?? bisect(cashflows);
}
